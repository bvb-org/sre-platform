const express = require('express');
const router = express.Router();
const pool = require('../db');
const { createLogger } = require('../utils/logger');

const logger = createLogger('Calendar');

// Valid event types
const VALID_EVENT_TYPES = ['change_freeze', 'planned_maintenance', 'incident_window', 'informational'];

// Middleware: require API key for write operations and freeze-check
function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const configuredKey = process.env.CALENDAR_API_KEY;

  if (!configuredKey) {
    logger.warn('CALENDAR_API_KEY is not configured — rejecting request');
    return res.status(503).json({ error: 'Calendar API key not configured on server' });
  }

  if (!apiKey || apiKey !== configuredKey) {
    return res.status(401).json({ error: 'Unauthorized: invalid or missing X-API-Key header' });
  }

  next();
}

// ─── GET /api/calendar/freeze-check ──────────────────────────────────────────
// Called by Azure DevOps pipeline to determine if a change freeze is active.
// Requires X-API-Key header.
// Returns: { frozen: false } or { frozen: true, event: { ... } }
router.get('/freeze-check', requireApiKey, async (req, res) => {
  try {
    const now = new Date().toISOString();

    const result = await pool.query(
      `SELECT id, title, description, event_type, start_time, end_time
       FROM calendar_events
       WHERE event_type = 'change_freeze'
         AND start_time <= $1
         AND end_time >= $1
       ORDER BY start_time ASC
       LIMIT 1`,
      [now]
    );

    if (result.rows.length === 0) {
      return res.json({ frozen: false });
    }

    const event = result.rows[0];
    return res.json({
      frozen: true,
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        eventType: event.event_type,
        startTime: event.start_time,
        endTime: event.end_time,
      },
    });
  } catch (error) {
    logger.error('Error checking freeze status:', error);
    res.status(500).json({ error: 'Failed to check freeze status' });
  }
});

// ─── GET /api/calendar/events ─────────────────────────────────────────────────
// List events. Optional query params: from (ISO date), to (ISO date)
router.get('/events', async (req, res) => {
  try {
    const { from, to } = req.query;

    let query = `
      SELECT
        ce.id,
        ce.title,
        ce.description,
        ce.event_type,
        ce.start_time,
        ce.end_time,
        ce.created_at,
        ce.updated_at,
        ce.metadata,
        u.id   AS created_by_id,
        u.name AS created_by_name,
        u.email AS created_by_email
      FROM calendar_events ce
      LEFT JOIN users u ON ce.created_by_id = u.id
    `;

    const params = [];
    const conditions = [];

    if (from) {
      params.push(from);
      conditions.push(`ce.end_time >= $${params.length}`);
    }
    if (to) {
      params.push(to);
      conditions.push(`ce.start_time <= $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY ce.start_time ASC';

    const result = await pool.query(query, params);

    const events = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      eventType: row.event_type,
      startTime: row.start_time,
      endTime: row.end_time,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      metadata: row.metadata,
      createdBy: row.created_by_id
        ? { id: row.created_by_id, name: row.created_by_name, email: row.created_by_email }
        : null,
    }));

    res.json(events);
  } catch (error) {
    logger.error('Error fetching calendar events:', error);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

// ─── POST /api/calendar/events ────────────────────────────────────────────────
// Create a new calendar event. Requires X-API-Key header.
router.post('/events', requireApiKey, async (req, res) => {
  try {
    const { title, description, eventType, startTime, endTime, createdById, metadata } = req.body;

    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }
    if (!eventType || !VALID_EVENT_TYPES.includes(eventType)) {
      return res.status(400).json({
        error: `eventType must be one of: ${VALID_EVENT_TYPES.join(', ')}`,
      });
    }
    if (!startTime) {
      return res.status(400).json({ error: 'startTime is required' });
    }
    if (!endTime) {
      return res.status(400).json({ error: 'endTime is required' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime())) {
      return res.status(400).json({ error: 'startTime is not a valid date' });
    }
    if (isNaN(end.getTime())) {
      return res.status(400).json({ error: 'endTime is not a valid date' });
    }
    if (end <= start) {
      return res.status(400).json({ error: 'endTime must be after startTime' });
    }

    const result = await pool.query(
      `INSERT INTO calendar_events (title, description, event_type, start_time, end_time, created_by_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        title.trim(),
        description || null,
        eventType,
        start.toISOString(),
        end.toISOString(),
        createdById || null,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );

    const row = result.rows[0];
    logger.info(`Calendar event created: ${row.id} (${row.event_type}) "${row.title}"`);

    res.status(201).json({
      id: row.id,
      title: row.title,
      description: row.description,
      eventType: row.event_type,
      startTime: row.start_time,
      endTime: row.end_time,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      metadata: row.metadata,
    });
  } catch (error) {
    logger.error('Error creating calendar event:', error);
    res.status(500).json({ error: 'Failed to create calendar event' });
  }
});

// ─── PUT /api/calendar/events/:id ─────────────────────────────────────────────
// Update an existing calendar event. Requires X-API-Key header.
router.put('/events/:id', requireApiKey, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, eventType, startTime, endTime, metadata } = req.body;

    // Check event exists
    const existing = await pool.query('SELECT * FROM calendar_events WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Calendar event not found' });
    }

    // Validation
    if (eventType && !VALID_EVENT_TYPES.includes(eventType)) {
      return res.status(400).json({
        error: `eventType must be one of: ${VALID_EVENT_TYPES.join(', ')}`,
      });
    }

    const current = existing.rows[0];
    const newTitle = title !== undefined ? title.trim() : current.title;
    const newDescription = description !== undefined ? description : current.description;
    const newEventType = eventType || current.event_type;
    const newStart = startTime ? new Date(startTime) : new Date(current.start_time);
    const newEnd = endTime ? new Date(endTime) : new Date(current.end_time);
    const newMetadata = metadata !== undefined ? metadata : current.metadata;

    if (!newTitle) {
      return res.status(400).json({ error: 'title cannot be empty' });
    }
    if (newEnd <= newStart) {
      return res.status(400).json({ error: 'endTime must be after startTime' });
    }

    const result = await pool.query(
      `UPDATE calendar_events
       SET title = $1,
           description = $2,
           event_type = $3,
           start_time = $4,
           end_time = $5,
           metadata = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [
        newTitle,
        newDescription,
        newEventType,
        newStart.toISOString(),
        newEnd.toISOString(),
        newMetadata ? JSON.stringify(newMetadata) : null,
        id,
      ]
    );

    const row = result.rows[0];
    logger.info(`Calendar event updated: ${row.id} (${row.event_type}) "${row.title}"`);

    res.json({
      id: row.id,
      title: row.title,
      description: row.description,
      eventType: row.event_type,
      startTime: row.start_time,
      endTime: row.end_time,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      metadata: row.metadata,
    });
  } catch (error) {
    logger.error('Error updating calendar event:', error);
    res.status(500).json({ error: 'Failed to update calendar event' });
  }
});

// ─── DELETE /api/calendar/events/:id ──────────────────────────────────────────
// Delete a calendar event. Requires X-API-Key header.
router.delete('/events/:id', requireApiKey, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM calendar_events WHERE id = $1 RETURNING id, title',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Calendar event not found' });
    }

    logger.info(`Calendar event deleted: ${result.rows[0].id} "${result.rows[0].title}"`);
    res.json({ message: 'Calendar event deleted successfully' });
  } catch (error) {
    logger.error('Error deleting calendar event:', error);
    res.status(500).json({ error: 'Failed to delete calendar event' });
  }
});

module.exports = router;
