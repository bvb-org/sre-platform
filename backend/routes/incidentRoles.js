const express = require('express');
const router = express.Router({ mergeParams: true });
const pool = require('../db');

// Role type constants
const ROLE_TYPES = {
  INCIDENT_LEAD: 'incident_lead',
  CALLER: 'caller',
  DMIM: 'dmim',
  COMMUNICATIONS_LEAD: 'communications_lead',
};

// Role display order
const ROLE_ORDER = [
  ROLE_TYPES.INCIDENT_LEAD,
  ROLE_TYPES.DMIM,
  ROLE_TYPES.CALLER,
  ROLE_TYPES.COMMUNICATIONS_LEAD,
];

/**
 * GET /api/incidents/:id/roles
 * Get all active roles for an incident
 */
router.get('/', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        ir.id,
        ir.role_type,
        ir.assigned_at,
        json_build_object(
          'id', u.id,
          'name', u.name,
          'email', u.email,
          'avatarUrl', u.avatar_url
        ) as user,
        json_build_object(
          'id', ab.id,
          'name', ab.name
        ) as assigned_by
      FROM incident_roles ir
      JOIN users u ON ir.user_id = u.id
      LEFT JOIN users ab ON ir.assigned_by_id = ab.id
      WHERE ir.incident_id = $1 AND ir.removed_at IS NULL
      ORDER BY
        CASE ir.role_type
          WHEN 'incident_lead' THEN 1
          WHEN 'dmim' THEN 2
          WHEN 'caller' THEN 3
          WHEN 'communications_lead' THEN 4
          ELSE 5
        END`,
      [id]
    );

    const roles = result.rows.map(row => ({
      id: row.id,
      roleType: row.role_type,
      user: row.user,
      assignedAt: row.assigned_at,
      assignedBy: row.assigned_by,
    }));

    res.json(roles);
  } catch (error) {
    console.error('Error fetching incident roles:', error);
    res.status(500).json({ error: 'Failed to fetch incident roles' });
  }
});

/**
 * POST /api/incidents/:id/roles
 * Assign a role to a user
 */
router.post('/', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id: incidentId } = req.params;
    const { roleType, userId } = req.body;

    // Validate role type
    if (!Object.values(ROLE_TYPES).includes(roleType)) {
      return res.status(400).json({ 
        error: `Invalid role type. Must be one of: ${Object.values(ROLE_TYPES).join(', ')}` 
      });
    }

    // Validate required fields
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    await client.query('BEGIN');

    // Check if incident exists
    const incidentCheck = await client.query(
      'SELECT id FROM incidents WHERE id = $1',
      [incidentId]
    );

    if (incidentCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Incident not found' });
    }

    // Check if user exists
    const userCheck = await client.query(
      'SELECT id, name, email, avatar_url FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userCheck.rows[0];

    // Check if role is already assigned to someone (enforce one person per role)
    const existingRole = await client.query(
      `SELECT ir.id, u.name as user_name
       FROM incident_roles ir
       JOIN users u ON ir.user_id = u.id
       WHERE ir.incident_id = $1 
         AND ir.role_type = $2 
         AND ir.removed_at IS NULL`,
      [incidentId, roleType]
    );

    if (existingRole.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: `Role ${roleType} is already assigned to ${existingRole.rows[0].user_name}. Remove the existing assignment first.` 
      });
    }

    // Get current user for assigned_by (in real app, this would come from auth)
    // For now, use the first admin user
    const assignedByResult = await client.query(
      'SELECT id FROM users ORDER BY created_at LIMIT 1'
    );
    const assignedById = assignedByResult.rows[0]?.id;

    // Insert new role assignment
    const insertResult = await client.query(
      `INSERT INTO incident_roles (incident_id, role_type, user_id, assigned_by_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, assigned_at`,
      [incidentId, roleType, userId, assignedById]
    );

    const newRole = insertResult.rows[0];

    // Create timeline event
    const roleDisplayName = roleType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    await client.query(
      `INSERT INTO timeline_events (incident_id, event_type, description, user_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        incidentId,
        'role_assigned',
        `${user.name} assigned as ${roleDisplayName}`,
        assignedById,
        JSON.stringify({ roleType, userId, userName: user.name })
      ]
    );

    await client.query('COMMIT');

    res.status(201).json({
      id: newRole.id,
      roleType,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatar_url,
      },
      assignedAt: newRole.assigned_at,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error assigning incident role:', error);
    res.status(500).json({ error: 'Failed to assign incident role' });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/incidents/:id/roles/:roleId
 * Update a role assignment (change the assigned user)
 */
router.put('/:roleId', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id: incidentId, roleId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    await client.query('BEGIN');

    // Get existing role
    const existingRole = await client.query(
      `SELECT ir.*, u.name as old_user_name
       FROM incident_roles ir
       JOIN users u ON ir.user_id = u.id
       WHERE ir.id = $1 AND ir.incident_id = $2 AND ir.removed_at IS NULL`,
      [roleId, incidentId]
    );

    if (existingRole.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Role assignment not found' });
    }

    const oldRole = existingRole.rows[0];

    // Get new user
    const userCheck = await client.query(
      'SELECT id, name, email, avatar_url FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    const newUser = userCheck.rows[0];

    // Get current user for removed_by/assigned_by
    const assignedByResult = await client.query(
      'SELECT id FROM users ORDER BY created_at LIMIT 1'
    );
    const currentUserId = assignedByResult.rows[0]?.id;

    // Soft delete old assignment
    await client.query(
      `UPDATE incident_roles 
       SET removed_at = CURRENT_TIMESTAMP, removed_by_id = $1
       WHERE id = $2`,
      [currentUserId, roleId]
    );

    // Create new assignment
    const insertResult = await client.query(
      `INSERT INTO incident_roles (incident_id, role_type, user_id, assigned_by_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, assigned_at`,
      [incidentId, oldRole.role_type, userId, currentUserId]
    );

    const newRole = insertResult.rows[0];

    // Create timeline event
    const roleDisplayName = oldRole.role_type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    await client.query(
      `INSERT INTO timeline_events (incident_id, event_type, description, user_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        incidentId,
        'role_changed',
        `${roleDisplayName} changed from ${oldRole.old_user_name} to ${newUser.name}`,
        currentUserId,
        JSON.stringify({ 
          roleType: oldRole.role_type, 
          oldUserId: oldRole.user_id,
          oldUserName: oldRole.old_user_name,
          newUserId: userId,
          newUserName: newUser.name
        })
      ]
    );

    await client.query('COMMIT');

    res.json({
      id: newRole.id,
      roleType: oldRole.role_type,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        avatarUrl: newUser.avatar_url,
      },
      assignedAt: newRole.assigned_at,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating incident role:', error);
    res.status(500).json({ error: 'Failed to update incident role' });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/incidents/:id/roles/:roleId
 * Remove a role assignment
 */
router.delete('/:roleId', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id: incidentId, roleId } = req.params;

    await client.query('BEGIN');

    // Get existing role
    const existingRole = await client.query(
      `SELECT ir.*, u.name as user_name
       FROM incident_roles ir
       JOIN users u ON ir.user_id = u.id
       WHERE ir.id = $1 AND ir.incident_id = $2 AND ir.removed_at IS NULL`,
      [roleId, incidentId]
    );

    if (existingRole.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Role assignment not found' });
    }

    const role = existingRole.rows[0];

    // Get current user for removed_by
    const removedByResult = await client.query(
      'SELECT id FROM users ORDER BY created_at LIMIT 1'
    );
    const removedById = removedByResult.rows[0]?.id;

    // Soft delete the role
    await client.query(
      `UPDATE incident_roles 
       SET removed_at = CURRENT_TIMESTAMP, removed_by_id = $1
       WHERE id = $2`,
      [removedById, roleId]
    );

    // Create timeline event
    const roleDisplayName = role.role_type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    await client.query(
      `INSERT INTO timeline_events (incident_id, event_type, description, user_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        incidentId,
        'role_removed',
        `${role.user_name} removed from ${roleDisplayName} role`,
        removedById,
        JSON.stringify({ roleType: role.role_type, userId: role.user_id, userName: role.user_name })
      ]
    );

    await client.query('COMMIT');

    res.json({ message: 'Role assignment removed successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error removing incident role:', error);
    res.status(500).json({ error: 'Failed to remove incident role' });
  } finally {
    client.release();
  }
});

module.exports = router;
