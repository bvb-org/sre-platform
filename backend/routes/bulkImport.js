const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../db');
const { processItem, resumeItem, UPLOAD_DIR } = require('../services/bulkImport');
const { createLogger } = require('../utils/logger');

const logger = createLogger('BulkImport:Route');

// ─── multer config ──────────────────────────────────────────────────────────

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  // We store with a temp name first; rename after DB row is created
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    // Temporary name – will be renamed to <itemId>_<sanitised>
    const sanitised = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `tmp_${Date.now()}_${sanitised}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB per file
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
    ];
    // Also accept by extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(file.mimetype) || ['.pdf', '.docx', '.doc', '.txt'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype} (${ext})`));
    }
  },
});

// ─── POST /api/bulk-import/upload ───────────────────────────────────────────
// Create a session, accept files, kick off async processing.

router.post('/upload', upload.array('files', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const autoPublish = req.body.autoPublish === 'true';

    // Create session
    const sessionResult = await pool.query(
      `INSERT INTO bulk_import_sessions (status, auto_publish, total_files)
       VALUES ('processing', $1, $2)
       RETURNING *`,
      [autoPublish, req.files.length]
    );
    const session = sessionResult.rows[0];

    // Create an import item per file
    const items = [];
    for (const file of req.files) {
      const itemResult = await pool.query(
        `INSERT INTO bulk_import_items (session_id, file_name, file_size, file_type, status, status_message, current_step)
         VALUES ($1, $2, $3, $4, 'uploading', 'File uploaded – queued for processing', 'uploading')
         RETURNING *`,
        [session.id, file.originalname, file.size, file.mimetype]
      );
      const item = itemResult.rows[0];

      // Rename the temp file to <itemId>_<sanitised>
      const sanitised = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const finalPath = path.join(UPLOAD_DIR, `${item.id}_${sanitised}`);
      fs.renameSync(file.path, finalPath);

      items.push(item);
    }

    // Kick off processing for each item (fire-and-forget – server-side)
    for (const item of items) {
      processItem(item.id).catch(err =>
        logger.error(`Background processing failed for item ${item.id}:`, err)
      );
    }

    res.status(201).json({
      sessionId: session.id,
      totalFiles: req.files.length,
      autoPublish,
      items: items.map(i => ({
        id: i.id,
        fileName: i.file_name,
        fileSize: i.file_size,
        fileType: i.file_type,
        status: i.status,
      })),
    });
  } catch (error) {
    logger.error('Upload failed:', error);
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
});

// ─── GET /api/bulk-import/sessions ──────────────────────────────────────────
// List all import sessions (most recent first).

router.get('/sessions', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM bulk_import_sessions ORDER BY created_at DESC LIMIT 50`
    );
    res.json(result.rows.map(mapSession));
  } catch (error) {
    logger.error('Failed to list sessions:', error);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

// ─── GET /api/bulk-import/sessions/:id ──────────────────────────────────────
// Get a single session with all its items.

router.get('/sessions/:id', async (req, res) => {
  try {
    const sessionResult = await pool.query(
      'SELECT * FROM bulk_import_sessions WHERE id = $1',
      [req.params.id]
    );
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const itemsResult = await pool.query(
      `SELECT * FROM bulk_import_items WHERE session_id = $1 ORDER BY created_at ASC`,
      [req.params.id]
    );

    res.json({
      ...mapSession(sessionResult.rows[0]),
      items: itemsResult.rows.map(mapItem),
    });
  } catch (error) {
    logger.error('Failed to get session:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

// ─── GET /api/bulk-import/items/:id ─────────────────────────────────────────
// Get a single import item (for polling status).

router.get('/items/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM bulk_import_items WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(mapItem(result.rows[0]));
  } catch (error) {
    logger.error('Failed to get item:', error);
    res.status(500).json({ error: 'Failed to get item' });
  }
});

// ─── POST /api/bulk-import/items/:id/answer ─────────────────────────────────
// Submit answers to AI questions, then resume processing.

router.post('/items/:id/answer', async (req, res) => {
  try {
    const { answers } = req.body; // [{ questionId, answer }]

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'answers array is required' });
    }

    // Fetch current questions
    const itemResult = await pool.query(
      'SELECT * FROM bulk_import_items WHERE id = $1',
      [req.params.id]
    );
    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = itemResult.rows[0];
    const questions = item.ai_questions || [];

    // Apply answers
    for (const { questionId, answer } of answers) {
      const q = questions.find(q => q.id === questionId);
      if (q) {
        q.answered = true;
        q.answer = answer;
      }
    }

    // Persist updated questions
    await pool.query(
      'UPDATE bulk_import_items SET ai_questions = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [JSON.stringify(questions), req.params.id]
    );

    // Check if all questions are answered
    const allAnswered = questions.every(q => q.answered);
    if (!allAnswered) {
      return res.json({ status: 'partial', remaining: questions.filter(q => !q.answered).length });
    }

    // Resume processing (fire-and-forget)
    resumeItem(req.params.id).catch(err =>
      logger.error(`Resume failed for item ${req.params.id}:`, err)
    );

    res.json({ status: 'resuming' });
  } catch (error) {
    logger.error('Failed to submit answers:', error);
    res.status(500).json({ error: 'Failed to submit answers' });
  }
});

// ─── POST /api/bulk-import/items/:id/retry ──────────────────────────────────
// Retry a single failed import item from the beginning.

router.post('/items/:id/retry', async (req, res) => {
  try {
    const itemResult = await pool.query(
      'SELECT * FROM bulk_import_items WHERE id = $1',
      [req.params.id]
    );
    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = itemResult.rows[0];
    if (item.status !== 'failed') {
      return res.status(400).json({ error: 'Only failed items can be retried' });
    }

    // Check that the uploaded file still exists
    const sanitised = item.file_name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fp = path.join(UPLOAD_DIR, `${item.id}_${sanitised}`);
    if (!fs.existsSync(fp)) {
      return res.status(410).json({ error: 'Uploaded file no longer exists on the server' });
    }

    // Reset item state for reprocessing
    await pool.query(
      `UPDATE bulk_import_items
       SET status = 'uploading',
           status_message = 'Retrying – queued for processing',
           current_step = 'uploading',
           error_message = NULL,
           extracted_metadata = NULL,
           extracted_text = NULL,
           ai_questions = NULL,
           incident_id = NULL,
           postmortem_id = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [req.params.id]
    );

    // Decrement the session's failed count
    await pool.query(
      `UPDATE bulk_import_sessions
       SET failed_files = GREATEST(failed_files - 1, 0),
           status = 'processing',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [item.session_id]
    );

    // Fire-and-forget reprocessing
    processItem(req.params.id).catch(err =>
      logger.error(`Retry processing failed for item ${req.params.id}:`, err)
    );

    res.json({ status: 'retrying', itemId: req.params.id });
  } catch (error) {
    logger.error('Retry failed:', error);
    res.status(500).json({ error: 'Retry failed', details: error.message });
  }
});

// ─── POST /api/bulk-import/sessions/:id/retry-failed ────────────────────────
// Retry all failed items in a session.

router.post('/sessions/:id/retry-failed', async (req, res) => {
  try {
    const sessionResult = await pool.query(
      'SELECT * FROM bulk_import_sessions WHERE id = $1',
      [req.params.id]
    );
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const failedItems = await pool.query(
      "SELECT * FROM bulk_import_items WHERE session_id = $1 AND status = 'failed'",
      [req.params.id]
    );

    if (failedItems.rows.length === 0) {
      return res.status(400).json({ error: 'No failed items to retry' });
    }

    const retried = [];
    const skipped = [];

    for (const item of failedItems.rows) {
      const sanitised = item.file_name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fp = path.join(UPLOAD_DIR, `${item.id}_${sanitised}`);

      if (!fs.existsSync(fp)) {
        skipped.push({ id: item.id, fileName: item.file_name, reason: 'File no longer exists' });
        continue;
      }

      // Reset item state
      await pool.query(
        `UPDATE bulk_import_items
         SET status = 'uploading',
             status_message = 'Retrying – queued for processing',
             current_step = 'uploading',
             error_message = NULL,
             extracted_metadata = NULL,
             extracted_text = NULL,
             ai_questions = NULL,
             incident_id = NULL,
             postmortem_id = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [item.id]
      );

      retried.push(item.id);
    }

    // Update session counters
    if (retried.length > 0) {
      await pool.query(
        `UPDATE bulk_import_sessions
         SET failed_files = GREATEST(failed_files - $1, 0),
             status = 'processing',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [retried.length, req.params.id]
      );

      // Fire-and-forget reprocessing for each item
      for (const itemId of retried) {
        processItem(itemId).catch(err =>
          logger.error(`Retry processing failed for item ${itemId}:`, err)
        );
      }
    }

    res.json({
      status: 'retrying',
      retriedCount: retried.length,
      skippedCount: skipped.length,
      skipped,
    });
  } catch (error) {
    logger.error('Retry all failed:', error);
    res.status(500).json({ error: 'Retry failed', details: error.message });
  }
});

// ─── mappers ────────────────────────────────────────────────────────────────

function mapSession(row) {
  return {
    id: row.id,
    status: row.status,
    autoPublish: row.auto_publish,
    totalFiles: row.total_files,
    completedFiles: row.completed_files,
    failedFiles: row.failed_files,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapItem(row) {
  return {
    id: row.id,
    sessionId: row.session_id,
    fileName: row.file_name,
    fileSize: row.file_size,
    fileType: row.file_type,
    status: row.status,
    statusMessage: row.status_message,
    currentStep: row.current_step,
    extractedMetadata: row.extracted_metadata,
    aiQuestions: row.ai_questions || [],
    incidentId: row.incident_id,
    postmortemId: row.postmortem_id,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = router;
