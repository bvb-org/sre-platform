const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/runbooks - List all runbooks
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;

    let query = 'SELECT * FROM runbooks';
    const params = [];

    if (search) {
      query += ` WHERE 
        service_name ILIKE $1 OR 
        team_name ILIKE $1 OR 
        description ILIKE $1`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY service_name ASC';

    const result = await pool.query(query, params);

    // Transform snake_case to camelCase
    const runbooks = result.rows.map(row => ({
      id: row.id,
      serviceName: row.service_name,
      teamName: row.team_name,
      teamEmail: row.team_email,
      description: row.description,
      monitoringLinks: row.monitoring_links,
      upstreamServices: row.upstream_services,
      downstreamServices: row.downstream_services,
      runbookProcedures: row.runbook_procedures,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json(runbooks);
  } catch (error) {
    console.error('Error fetching runbooks:', error);
    res.status(500).json({ error: 'Failed to fetch runbooks' });
  }
});

// POST /api/runbooks - Create new runbook
router.post('/', async (req, res) => {
  try {
    const {
      serviceName,
      teamName,
      teamEmail,
      description,
      monitoringLinks,
      upstreamServices,
      downstreamServices,
      runbookProcedures,
    } = req.body;

    if (!serviceName || !teamName || !teamEmail || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await pool.query(
      `INSERT INTO runbooks (
        service_name, team_name, team_email, description,
        monitoring_links, upstream_services, downstream_services, runbook_procedures
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        serviceName,
        teamName,
        teamEmail,
        description,
        monitoringLinks ? JSON.stringify(monitoringLinks) : null,
        upstreamServices ? JSON.stringify(upstreamServices) : null,
        downstreamServices ? JSON.stringify(downstreamServices) : null,
        runbookProcedures || null,
      ]
    );

    const runbook = result.rows[0];

    res.status(201).json({
      id: runbook.id,
      serviceName: runbook.service_name,
      teamName: runbook.team_name,
      teamEmail: runbook.team_email,
      description: runbook.description,
      monitoringLinks: runbook.monitoring_links,
      upstreamServices: runbook.upstream_services,
      downstreamServices: runbook.downstream_services,
      runbookProcedures: runbook.runbook_procedures,
      createdAt: runbook.created_at,
      updatedAt: runbook.updated_at,
    });
  } catch (error) {
    console.error('Error creating runbook:', error);
    
    if (error.message && error.message.includes('duplicate key')) {
      return res.status(409).json({ error: 'A runbook with this service name already exists' });
    }

    res.status(500).json({ error: 'Failed to create runbook' });
  }
});

module.exports = router;
