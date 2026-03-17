const pool = require('../../db');
const serviceNowService = require('../serviceNowService');
const { createLogger } = require('../../utils/logger');

const logger = createLogger('BulkImport:IncidentCreator');

/**
 * Look up an incident in ServiceNow by number.
 * Returns mapped incident data or null if not found / SNOW disabled.
 */
async function lookupServiceNow(incidentNumber) {
  if (!serviceNowService.isEnabled()) {
    logger.warn('ServiceNow integration disabled – skipping lookup');
    return null;
  }

  try {
    const snowIncident = await serviceNowService.findByNumber(incidentNumber);
    if (snowIncident) {
      logger.info(`Found ServiceNow incident: ${snowIncident.number}`);
      return serviceNowService.mapFromServiceNowIncident(snowIncident);
    }

    // Fallback: try correlation_id
    const byCorrelation = await serviceNowService.findByCorrelationId(incidentNumber);
    if (byCorrelation) {
      logger.info(`Found ServiceNow incident by correlation: ${byCorrelation.number}`);
      return serviceNowService.mapFromServiceNowIncident(byCorrelation);
    }

    logger.warn(`Incident ${incidentNumber} not found in ServiceNow`);
    return null;
  } catch (error) {
    logger.error(`ServiceNow lookup failed for ${incidentNumber}:`, error);
    return null;
  }
}

/**
 * Create (or reuse) an incident record in the local database.
 * Merges document metadata with optional ServiceNow data.
 * Returns the incident UUID.
 */
async function createIncident(metadata, snowData, itemId) {
  logger.info(`Creating incident for import item ${itemId}`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Ensure a default user exists
    let userResult = await client.query(
      'SELECT * FROM users WHERE email = $1',
      ['manager@example.com']
    );
    let user;
    if (userResult.rows.length === 0) {
      const ins = await client.query(
        'INSERT INTO users (email, name) VALUES ($1, $2) RETURNING *',
        ['manager@example.com', 'Manager on Duty']
      );
      user = ins.rows[0];
    } else {
      user = userResult.rows[0];
    }

    // Merge – ServiceNow wins for identity fields, document wins for content
    const incidentNumber = snowData?.incidentNumber || metadata.incidentNumber || `IMP-${Date.now()}`;
    const title          = snowData?.title          || metadata.title          || 'Imported Incident';
    const description    = snowData?.description    || metadata.description    || 'Imported from postmortem document';
    const severity       = metadata.severity        || snowData?.severity      || 'medium';
    const detectedAt     = metadata.detectedAt      || snowData?.detectedAt    || new Date().toISOString();
    const resolvedAt     = metadata.resolvedAt      || snowData?.resolvedAt    || null;
    const snowSysId      = snowData?.snowSysId      || null;
    const snowNumber     = snowData?.snowNumber      || null;

    // Check for existing incident with same number
    const existing = await client.query(
      'SELECT id FROM incidents WHERE incident_number = $1',
      [incidentNumber]
    );

    let incidentId;

    if (existing.rows.length > 0) {
      incidentId = existing.rows[0].id;
      logger.info(`Incident ${incidentNumber} already exists (${incidentId})`);
    } else {
      const ins = await client.query(
        `INSERT INTO incidents (
          incident_number, title, description, severity, status,
          incident_lead_id, reporter_id, detected_at, resolved_at,
          impact, problem_statement, snow_sys_id, snow_number
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        RETURNING id`,
        [
          incidentNumber, title, description, severity,
          resolvedAt ? 'resolved' : 'active',
          user.id, user.id,
          detectedAt, resolvedAt,
          metadata.summary || 'Imported from postmortem',
          description,
          snowSysId, snowNumber,
        ]
      );
      incidentId = ins.rows[0].id;

      // Assign incident-lead role
      await client.query(
        `INSERT INTO incident_roles (incident_id, role_type, user_id, assigned_by_id)
         VALUES ($1, $2, $3, $4)`,
        [incidentId, 'incident_lead', user.id, user.id]
      );

      // Timeline: reported
      await client.query(
        `INSERT INTO timeline_events (incident_id, event_type, description, user_id, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          incidentId, 'reported',
          `Incident imported from postmortem document: ${title}`,
          user.id,
          JSON.stringify({ severity, source: 'bulk_import' }),
        ]
      );

      // Timeline: resolved (if applicable)
      if (resolvedAt) {
        await client.query(
          `INSERT INTO timeline_events (incident_id, event_type, description, user_id, created_at, metadata)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            incidentId, 'resolved', 'Incident resolved',
            user.id, resolvedAt,
            JSON.stringify({ source: 'bulk_import' }),
          ]
        );
      }
    }

    // Link import item → incident
    await client.query(
      `UPDATE bulk_import_items SET incident_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [incidentId, itemId]
    );

    await client.query('COMMIT');

    // Async: sync ServiceNow activities (non-blocking)
    if (snowSysId && serviceNowService.isEnabled()) {
      syncSnowActivities(incidentId, snowSysId).catch(err =>
        logger.error('Error syncing ServiceNow activities:', err)
      );
    }

    return incidentId;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Pull ServiceNow journal entries into timeline_events (fire-and-forget).
 */
async function syncSnowActivities(incidentId, snowSysId) {
  const activities = await serviceNowService.getIncidentActivity(snowSysId);
  for (const activity of activities) {
    const label = activity.activityType === 'work_notes' ? 'Work Note' : 'Comment';
    await pool.query(
      `INSERT INTO timeline_events (incident_id, event_type, description, created_at, metadata)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [
        incidentId, 'snow_activity', activity.value, activity.createdAt,
        JSON.stringify({
          snowSysId: activity.snowSysId,
          activityType: activity.activityType,
          createdBy: activity.createdBy,
          source: 'servicenow',
          label,
        }),
      ]
    );
  }
  logger.info(`Synced ${activities.length} SNOW activities for incident ${incidentId}`);
}

module.exports = { lookupServiceNow, createIncident };
