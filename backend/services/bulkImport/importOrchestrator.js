const path = require('path');
const crypto = require('crypto');
const pool = require('../../db');
const { extractText } = require('./documentParser');
const { extractMetadata } = require('./metadataExtractor');
const { lookupServiceNow, createIncident } = require('./incidentCreator');
const { generatePostmortem } = require('./postmortemGenerator');
const serviceNowService = require('../serviceNowService');
const { createLogger } = require('../../utils/logger');

const logger = createLogger('BulkImport:Orchestrator');

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// ─── helpers ────────────────────────────────────────────────────────────────

async function updateItemStatus(itemId, status, message, currentStep) {
  const fields = ['status = $1', 'status_message = $2', 'updated_at = CURRENT_TIMESTAMP'];
  const values = [status, message];
  let idx = 3;

  if (currentStep !== undefined) {
    fields.push(`current_step = $${idx++}`);
    values.push(currentStep);
  }

  values.push(itemId);
  await pool.query(
    `UPDATE bulk_import_items SET ${fields.join(', ')} WHERE id = $${idx}`,
    values
  );
}

async function updateSessionStatus(sessionId) {
  const items = await pool.query(
    'SELECT status FROM bulk_import_items WHERE session_id = $1',
    [sessionId]
  );

  const statuses = items.rows.map(r => r.status);
  let sessionStatus;

  if (statuses.every(s => s === 'completed')) {
    sessionStatus = 'completed';
  } else if (statuses.some(s => s === 'failed') && statuses.every(s => ['completed', 'failed'].includes(s))) {
    sessionStatus = 'completed'; // partial success
  } else if (statuses.some(s => s === 'awaiting_input')) {
    sessionStatus = 'awaiting_input';
  } else if (statuses.some(s => !['completed', 'failed', 'uploading'].includes(s))) {
    sessionStatus = 'processing';
  } else {
    sessionStatus = 'pending';
  }

  await pool.query(
    'UPDATE bulk_import_sessions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [sessionStatus, sessionId]
  );
}

function filePath(item) {
  // Matches the naming convention used in the upload route
  return path.join(UPLOAD_DIR, `${item.id}_${item.file_name.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
}

// ─── main pipeline ──────────────────────────────────────────────────────────

/**
 * Process a single import item through the full pipeline.
 * This runs asynchronously on the server – the user can leave the page.
 */
async function processItem(itemId) {
  logger.info(`▶ Processing import item ${itemId}`);

  try {
    const { rows } = await pool.query(
      'SELECT bi.*, bs.auto_publish FROM bulk_import_items bi JOIN bulk_import_sessions bs ON bi.session_id = bs.id WHERE bi.id = $1',
      [itemId]
    );
    if (rows.length === 0) throw new Error(`Item ${itemId} not found`);

    const item = rows[0];
    const autoPublish = item.auto_publish;
    const fp = filePath(item);

    // ── Step 1: extract text ────────────────────────────────────────────
    await updateItemStatus(itemId, 'extracting_text', 'Extracting text from document…', 'extracting_text');
    const text = await extractText(fp, item.file_type);

    await pool.query(
      'UPDATE bulk_import_items SET extracted_text = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [text.substring(0, 100000), itemId]
    );

    // ── Step 2: AI metadata extraction ──────────────────────────────────
    await updateItemStatus(itemId, 'extracting_metadata', 'Analyzing document with AI…', 'extracting_metadata');
    const metadata = await extractMetadata(text, itemId);

    // ── Step 3: validate incident number ────────────────────────────────
    if (!metadata.incidentNumber) {
      const q = [{
        id: crypto.randomUUID(),
        question: 'Could not find an incident number in the document. Please provide the incident number (e.g., INC-12345) or type "generate" to auto-generate one.',
        field: 'incidentNumber',
        answered: false,
        answer: null,
      }];
      await pool.query(
        `UPDATE bulk_import_items
         SET ai_questions = $1, status = 'awaiting_input',
             status_message = 'Missing incident number – please provide it',
             current_step = 'looking_up_servicenow',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [JSON.stringify(q), itemId]
      );
      await updateSessionStatus(item.session_id);
      return;
    }

    // ── Step 4: ServiceNow lookup ───────────────────────────────────────
    await updateItemStatus(itemId, 'looking_up_servicenow', `Searching ServiceNow for ${metadata.incidentNumber}…`, 'looking_up_servicenow');
    const snowData = await lookupServiceNow(metadata.incidentNumber);

    if (!snowData && serviceNowService.isEnabled()) {
      const existing = item.ai_questions || [];
      existing.push({
        id: crypto.randomUUID(),
        question: `Incident ${metadata.incidentNumber} was not found in ServiceNow. Proceed with document data only? (yes / no)`,
        field: 'proceedWithoutSnow',
        answered: false,
        answer: null,
      });
      await pool.query(
        `UPDATE bulk_import_items
         SET ai_questions = $1, status = 'awaiting_input',
             status_message = 'Incident not found in ServiceNow – awaiting your decision',
             current_step = 'looking_up_servicenow',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [JSON.stringify(existing), itemId]
      );
      await updateSessionStatus(item.session_id);
      return;
    }

    // ── Step 5: create incident ─────────────────────────────────────────
    await updateItemStatus(itemId, 'generating_incident', 'Creating incident record…', 'generating_incident');
    const incidentId = await createIncident(metadata, snowData, itemId);

    // ── Step 6: generate postmortem ─────────────────────────────────────
    await updateItemStatus(itemId, 'generating_postmortem', 'Generating postmortem with AI…', 'generating_postmortem');
    const pmResult = await generatePostmortem(incidentId, text, metadata, itemId, autoPublish);

    if (pmResult.needsInput) {
      await updateItemStatus(itemId, 'awaiting_input', 'AI needs your input on some fields', 'generating_postmortem');
      await updateSessionStatus(item.session_id);
      return;
    }

    // ── Done ────────────────────────────────────────────────────────────
    await updateItemStatus(itemId, 'completed', 'Import completed successfully', 'completed');
    await pool.query(
      'UPDATE bulk_import_sessions SET completed_files = completed_files + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [item.session_id]
    );
    await updateSessionStatus(item.session_id);
    logger.info(`✔ Item ${itemId} completed`);

  } catch (error) {
    logger.error(`✘ Item ${itemId} failed:`, error);

    await pool.query(
      `UPDATE bulk_import_items
       SET status = 'failed', error_message = $1, status_message = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [error.message, `Failed: ${error.message}`, itemId]
    );

    const row = await pool.query('SELECT session_id FROM bulk_import_items WHERE id = $1', [itemId]);
    if (row.rows.length > 0) {
      await pool.query(
        'UPDATE bulk_import_sessions SET failed_files = failed_files + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [row.rows[0].session_id]
      );
      await updateSessionStatus(row.rows[0].session_id);
    }
  }
}

// ─── resume after user answers ──────────────────────────────────────────────

/**
 * Resume processing after the user has answered AI questions.
 */
async function resumeItem(itemId) {
  logger.info(`▶ Resuming item ${itemId}`);

  const { rows } = await pool.query(
    'SELECT bi.*, bs.auto_publish FROM bulk_import_items bi JOIN bulk_import_sessions bs ON bi.session_id = bs.id WHERE bi.id = $1',
    [itemId]
  );
  if (rows.length === 0) throw new Error(`Item ${itemId} not found`);

  const item = rows[0];
  const questions = item.ai_questions || [];
  const metadata = item.extracted_metadata || {};

  // Apply user answers to metadata
  for (const q of questions) {
    if (!q.answered || !q.answer) continue;
    if (q.field === 'incidentNumber') {
      metadata.incidentNumber = q.answer.toLowerCase() === 'generate' ? `IMP-${Date.now()}` : q.answer;
    } else if (q.field !== 'proceedWithoutSnow') {
      metadata[q.field] = q.answer;
    }
  }

  await pool.query(
    'UPDATE bulk_import_items SET extracted_metadata = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [JSON.stringify(metadata), itemId]
  );

  try {
    const step = item.current_step;

    if (step === 'looking_up_servicenow' || !item.incident_id) {
      let snowData = null;
      if (metadata.incidentNumber && serviceNowService.isEnabled()) {
        await updateItemStatus(itemId, 'looking_up_servicenow', `Searching ServiceNow for ${metadata.incidentNumber}…`, 'looking_up_servicenow');
        snowData = await lookupServiceNow(metadata.incidentNumber);
      }

      await updateItemStatus(itemId, 'generating_incident', 'Creating incident record…', 'generating_incident');
      const incidentId = await createIncident(metadata, snowData, itemId);

      await updateItemStatus(itemId, 'generating_postmortem', 'Generating postmortem with AI…', 'generating_postmortem');
      const pmResult = await generatePostmortem(incidentId, item.extracted_text || '', metadata, itemId, item.auto_publish);

      if (!pmResult.needsInput) {
        await updateItemStatus(itemId, 'completed', 'Import completed successfully', 'completed');
        await pool.query(
          'UPDATE bulk_import_sessions SET completed_files = completed_files + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
          [item.session_id]
        );
      }
    } else if (step === 'generating_postmortem' && item.incident_id) {
      await updateItemStatus(itemId, 'generating_postmortem', 'Generating postmortem with AI…', 'generating_postmortem');
      const pmResult = await generatePostmortem(item.incident_id, item.extracted_text || '', metadata, itemId, item.auto_publish);

      if (!pmResult.needsInput) {
        await updateItemStatus(itemId, 'completed', 'Import completed successfully', 'completed');
        await pool.query(
          'UPDATE bulk_import_sessions SET completed_files = completed_files + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
          [item.session_id]
        );
      }
    }

    await updateSessionStatus(item.session_id);
  } catch (error) {
    logger.error(`✘ Resume failed for item ${itemId}:`, error);
    await pool.query(
      `UPDATE bulk_import_items
       SET status = 'failed', error_message = $1, status_message = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [error.message, `Failed: ${error.message}`, itemId]
    );
    await pool.query(
      'UPDATE bulk_import_sessions SET failed_files = failed_files + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [item.session_id]
    );
    await updateSessionStatus(item.session_id);
  }
}

module.exports = { processItem, resumeItem, updateItemStatus, updateSessionStatus, UPLOAD_DIR };
