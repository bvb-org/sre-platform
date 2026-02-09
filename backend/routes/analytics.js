const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/analytics/incidents - Get incident analytics for the past 7 days
router.get('/incidents', async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get incidents opened in the past 7 days
    const openedResult = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'resolved' OR status = 'closed') as resolved
       FROM incidents
       WHERE created_at >= $1`,
      [sevenDaysAgo]
    );

    // Get all active incidents (regardless of when they were created)
    const activeResult = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical,
        COUNT(*) FILTER (WHERE severity = 'high') as high,
        COUNT(*) FILTER (WHERE severity = 'medium') as medium,
        COUNT(*) FILTER (WHERE severity = 'low') as low
       FROM incidents
       WHERE status = 'active' OR status = 'mitigated'`
    );

    // Get incidents resolved in the past 7 days
    const resolvedResult = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical,
        COUNT(*) FILTER (WHERE severity = 'high') as high,
        COUNT(*) FILTER (WHERE severity = 'medium') as medium,
        COUNT(*) FILTER (WHERE severity = 'low') as low
       FROM incidents
       WHERE (resolved_at >= $1 OR closed_at >= $1)
       AND (status = 'resolved' OR status = 'closed')`,
      [sevenDaysAgo]
    );

    // Get daily trend data for the past 7 days
    const trendResult = await pool.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as opened,
        COUNT(*) FILTER (WHERE status = 'resolved' OR status = 'closed') as resolved
       FROM incidents
       WHERE created_at >= $1
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [sevenDaysAgo]
    );

    // Get recent active incidents (top 5)
    const recentActiveResult = await pool.query(
      `SELECT 
        i.id,
        i.incident_number,
        i.title,
        i.severity,
        i.status,
        i.created_at,
        json_build_object('id', u.id, 'name', u.name, 'email', u.email) as incident_lead
       FROM incidents i
       LEFT JOIN users u ON i.incident_lead_id = u.id
       WHERE i.status IN ('active', 'mitigated')
       ORDER BY i.created_at DESC
       LIMIT 5`
    );

    // Get recent resolved incidents (top 5 from past 7 days)
    const recentResolvedResult = await pool.query(
      `SELECT 
        i.id,
        i.incident_number,
        i.title,
        i.severity,
        i.status,
        i.created_at,
        i.resolved_at,
        i.closed_at,
        json_build_object('id', u.id, 'name', u.name, 'email', u.email) as incident_lead
       FROM incidents i
       LEFT JOIN users u ON i.incident_lead_id = u.id
       WHERE (i.resolved_at >= $1 OR i.closed_at >= $1)
       AND i.status IN ('resolved', 'closed')
       ORDER BY COALESCE(i.resolved_at, i.closed_at) DESC
       LIMIT 5`,
      [sevenDaysAgo]
    );

    res.json({
      past7Days: {
        opened: parseInt(openedResult.rows[0].total),
        active: parseInt(openedResult.rows[0].active),
        resolved: parseInt(openedResult.rows[0].resolved),
      },
      currentlyActive: {
        total: parseInt(activeResult.rows[0].total),
        bySeverity: {
          critical: parseInt(activeResult.rows[0].critical),
          high: parseInt(activeResult.rows[0].high),
          medium: parseInt(activeResult.rows[0].medium),
          low: parseInt(activeResult.rows[0].low),
        },
      },
      resolvedPast7Days: {
        total: parseInt(resolvedResult.rows[0].total),
        bySeverity: {
          critical: parseInt(resolvedResult.rows[0].critical),
          high: parseInt(resolvedResult.rows[0].high),
          medium: parseInt(resolvedResult.rows[0].medium),
          low: parseInt(resolvedResult.rows[0].low),
        },
      },
      trend: trendResult.rows.map(row => ({
        date: row.date,
        opened: parseInt(row.opened),
        resolved: parseInt(row.resolved),
      })),
      recentActive: recentActiveResult.rows.map(row => ({
        id: row.id,
        incidentNumber: row.incident_number,
        title: row.title,
        severity: row.severity,
        status: row.status,
        createdAt: row.created_at,
        incidentLead: row.incident_lead,
      })),
      recentResolved: recentResolvedResult.rows.map(row => ({
        id: row.id,
        incidentNumber: row.incident_number,
        title: row.title,
        severity: row.severity,
        status: row.status,
        createdAt: row.created_at,
        resolvedAt: row.resolved_at || row.closed_at,
        incidentLead: row.incident_lead,
      })),
    });
  } catch (error) {
    console.error('Error fetching incident analytics:', error);
    res.status(500).json({ error: 'Failed to fetch incident analytics' });
  }
});

// GET /api/analytics/postmortems - Get postmortem analytics for the past 7 days
router.get('/postmortems', async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get postmortems created in the past 7 days
    const createdResult = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'draft') as draft,
        COUNT(*) FILTER (WHERE status = 'published') as published
       FROM postmortems
       WHERE created_at >= $1`,
      [sevenDaysAgo]
    );

    // Get all active (draft) postmortems
    const activeResult = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE i.severity = 'critical') as critical,
        COUNT(*) FILTER (WHERE i.severity = 'high') as high,
        COUNT(*) FILTER (WHERE i.severity = 'medium') as medium,
        COUNT(*) FILTER (WHERE i.severity = 'low') as low
       FROM postmortems p
       INNER JOIN incidents i ON p.incident_id = i.id
       WHERE p.status = 'draft'`
    );

    // Get postmortems published in the past 7 days
    const publishedResult = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE i.severity = 'critical') as critical,
        COUNT(*) FILTER (WHERE i.severity = 'high') as high,
        COUNT(*) FILTER (WHERE i.severity = 'medium') as medium,
        COUNT(*) FILTER (WHERE i.severity = 'low') as low
       FROM postmortems p
       INNER JOIN incidents i ON p.incident_id = i.id
       WHERE p.published_at >= $1
       AND p.status = 'published'`,
      [sevenDaysAgo]
    );

    // Get daily trend data for the past 7 days
    const trendResult = await pool.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as created,
        COUNT(*) FILTER (WHERE status = 'published') as published
       FROM postmortems
       WHERE created_at >= $1
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [sevenDaysAgo]
    );

    // Get recent active (draft) postmortems (top 5)
    const recentActiveResult = await pool.query(
      `SELECT 
        p.id,
        p.incident_id,
        p.status,
        p.created_at,
        i.incident_number,
        i.title as incident_title,
        i.severity as incident_severity,
        json_build_object('name', u.name, 'email', u.email) as created_by
       FROM postmortems p
       INNER JOIN incidents i ON p.incident_id = i.id
       LEFT JOIN users u ON p.created_by_id = u.id
       WHERE p.status = 'draft'
       ORDER BY p.created_at DESC
       LIMIT 5`
    );

    // Get recent published postmortems (top 5 from past 7 days)
    const recentPublishedResult = await pool.query(
      `SELECT 
        p.id,
        p.incident_id,
        p.status,
        p.created_at,
        p.published_at,
        i.incident_number,
        i.title as incident_title,
        i.severity as incident_severity,
        json_build_object('name', u.name, 'email', u.email) as created_by
       FROM postmortems p
       INNER JOIN incidents i ON p.incident_id = i.id
       LEFT JOIN users u ON p.created_by_id = u.id
       WHERE p.published_at >= $1
       AND p.status = 'published'
       ORDER BY p.published_at DESC
       LIMIT 5`,
      [sevenDaysAgo]
    );

    res.json({
      past7Days: {
        created: parseInt(createdResult.rows[0].total),
        draft: parseInt(createdResult.rows[0].draft),
        published: parseInt(createdResult.rows[0].published),
      },
      currentlyActive: {
        total: parseInt(activeResult.rows[0].total),
        bySeverity: {
          critical: parseInt(activeResult.rows[0].critical),
          high: parseInt(activeResult.rows[0].high),
          medium: parseInt(activeResult.rows[0].medium),
          low: parseInt(activeResult.rows[0].low),
        },
      },
      publishedPast7Days: {
        total: parseInt(publishedResult.rows[0].total),
        bySeverity: {
          critical: parseInt(publishedResult.rows[0].critical),
          high: parseInt(publishedResult.rows[0].high),
          medium: parseInt(publishedResult.rows[0].medium),
          low: parseInt(publishedResult.rows[0].low),
        },
      },
      trend: trendResult.rows.map(row => ({
        date: row.date,
        created: parseInt(row.created),
        published: parseInt(row.published),
      })),
      recentActive: recentActiveResult.rows.map(row => ({
        id: row.id,
        incidentId: row.incident_id,
        incidentNumber: row.incident_number,
        incidentTitle: row.incident_title,
        incidentSeverity: row.incident_severity,
        status: row.status,
        createdAt: row.created_at,
        createdBy: row.created_by,
      })),
      recentPublished: recentPublishedResult.rows.map(row => ({
        id: row.id,
        incidentId: row.incident_id,
        incidentNumber: row.incident_number,
        incidentTitle: row.incident_title,
        incidentSeverity: row.incident_severity,
        status: row.status,
        createdAt: row.created_at,
        publishedAt: row.published_at,
        createdBy: row.created_by,
      })),
    });
  } catch (error) {
    console.error('Error fetching postmortem analytics:', error);
    res.status(500).json({ error: 'Failed to fetch postmortem analytics' });
  }
});

module.exports = router;
