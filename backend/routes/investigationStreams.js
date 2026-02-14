const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/incidents/:incidentId/streams - Get all streams for an incident
router.get('/:incidentId/streams', async (req, res) => {
  try {
    const { incidentId } = req.params;

    const result = await pool.query(
      `SELECT 
        s.*,
        json_build_object(
          'id', u.id,
          'name', u.name,
          'email', u.email,
          'avatarUrl', u.avatar_url
        ) as assigned_to,
        json_build_object(
          'id', creator.id,
          'name', creator.name,
          'email', creator.email
        ) as created_by,
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'id', st.id,
              'description', st.description,
              'completed', st.completed,
              'orderIndex', st.order_index,
              'createdAt', st.created_at,
              'completedAt', st.completed_at,
              'assignedTo', CASE WHEN st.assigned_to_id IS NOT NULL
                THEN json_build_object('id', task_user.id, 'name', task_user.name, 'email', task_user.email)
                ELSE NULL END,
              'completedBy', CASE WHEN st.completed_by_id IS NOT NULL
                THEN json_build_object('id', completed_user.id, 'name', completed_user.name, 'email', completed_user.email)
                ELSE NULL END
            ) ORDER BY st.order_index ASC, st.created_at ASC
          )
          FROM stream_tasks st
          LEFT JOIN users task_user ON st.assigned_to_id = task_user.id
          LEFT JOIN users completed_user ON st.completed_by_id = completed_user.id
          WHERE st.stream_id = s.id),
          '[]'
        ) as tasks,
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'id', sf.id,
              'findingType', sf.finding_type,
              'content', sf.content,
              'createdAt', sf.created_at,
              'metadata', sf.metadata,
              'createdBy', json_build_object('id', finding_user.id, 'name', finding_user.name, 'email', finding_user.email)
            ) ORDER BY sf.created_at DESC
          )
          FROM stream_findings sf
          LEFT JOIN users finding_user ON sf.created_by_id = finding_user.id
          WHERE sf.stream_id = s.id),
          '[]'
        ) as findings
      FROM investigation_streams s
      LEFT JOIN users u ON s.assigned_to_id = u.id
      LEFT JOIN users creator ON s.created_by_id = creator.id
      WHERE s.incident_id = $1
      ORDER BY s.priority DESC, s.created_at ASC`,
      [incidentId]
    );

    // Transform to camelCase
    const streams = result.rows.map(row => ({
      id: row.id,
      incidentId: row.incident_id,
      name: row.name,
      streamType: row.stream_type,
      hypothesis: row.hypothesis,
      status: row.status,
      priority: row.priority,
      assignedTo: row.assigned_to?.id ? row.assigned_to : null,
      createdAt: row.created_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      createdBy: row.created_by,
      metadata: row.metadata,
      tasks: row.tasks,
      findings: row.findings,
    }));

    res.json(streams);
  } catch (error) {
    console.error('Error fetching investigation streams:', error);
    res.status(500).json({ error: 'Failed to fetch investigation streams' });
  }
});

// POST /api/incidents/:incidentId/streams - Create a new stream
router.post('/:incidentId/streams', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { incidentId } = req.params;
    const { name, streamType = 'technical', hypothesis, assignedToId, priority = 0 } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Stream name is required' });
    }

    await client.query('BEGIN');

    // Get or create default user for created_by
    let userResult = await client.query(
      'SELECT * FROM users WHERE email = $1',
      ['manager@example.com']
    );

    let user;
    if (userResult.rows.length === 0) {
      const insertUser = await client.query(
        'INSERT INTO users (email, name) VALUES ($1, $2) RETURNING *',
        ['manager@example.com', 'Manager on Duty']
      );
      user = insertUser.rows[0];
    } else {
      user = userResult.rows[0];
    }

    // Create the stream
    const streamResult = await client.query(
      `INSERT INTO investigation_streams (
        incident_id, name, stream_type, hypothesis, status, priority,
        assigned_to_id, created_by_id, started_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *`,
      [incidentId, name, streamType, hypothesis, 'active', priority, assignedToId || null, user.id]
    );

    const stream = streamResult.rows[0];

    // Create a timeline event
    await client.query(
      `INSERT INTO timeline_events (incident_id, event_type, description, user_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        incidentId,
        'update',
        `Investigation stream created: ${name}`,
        user.id,
        JSON.stringify({ streamId: stream.id, streamType })
      ]
    );

    await client.query('COMMIT');

    // Fetch complete stream with relations
    const completeStream = await pool.query(
      `SELECT 
        s.*,
        json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'avatarUrl', u.avatar_url) as assigned_to,
        json_build_object('id', creator.id, 'name', creator.name, 'email', creator.email) as created_by
      FROM investigation_streams s
      LEFT JOIN users u ON s.assigned_to_id = u.id
      LEFT JOIN users creator ON s.created_by_id = creator.id
      WHERE s.id = $1`,
      [stream.id]
    );

    const result = completeStream.rows[0];
    
    res.status(201).json({
      id: result.id,
      incidentId: result.incident_id,
      name: result.name,
      streamType: result.stream_type,
      hypothesis: result.hypothesis,
      status: result.status,
      priority: result.priority,
      assignedTo: result.assigned_to?.id ? result.assigned_to : null,
      createdAt: result.created_at,
      startedAt: result.started_at,
      completedAt: result.completed_at,
      createdBy: result.created_by,
      metadata: result.metadata,
      tasks: [],
      findings: [],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating investigation stream:', error);
    res.status(500).json({ error: 'Failed to create investigation stream' });
  } finally {
    client.release();
  }
});

// PATCH /api/incidents/:incidentId/streams/:streamId - Update a stream
router.patch('/:incidentId/streams/:streamId', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { streamId } = req.params;
    const { name, hypothesis, status, assignedToId, priority } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (hypothesis !== undefined) {
      updates.push(`hypothesis = $${paramCount++}`);
      values.push(hypothesis);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
      
      // Update completed_at if status is completed
      if (status === 'completed' || status === 'ruled_out') {
        updates.push(`completed_at = NOW()`);
      }
    }
    if (assignedToId !== undefined) {
      updates.push(`assigned_to_id = $${paramCount++}`);
      values.push(assignedToId);
    }
    if (priority !== undefined) {
      updates.push(`priority = $${paramCount++}`);
      values.push(priority);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(streamId);

    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE investigation_streams 
       SET ${updates.join(', ')} 
       WHERE id = $${paramCount} 
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Stream not found' });
    }

    const stream = result.rows[0];

    // Create timeline event for status changes
    if (status !== undefined) {
      const userResult = await client.query(
        'SELECT * FROM users WHERE email = $1',
        ['manager@example.com']
      );

      if (userResult.rows.length > 0) {
        const statusLabels = {
          active: 'Active',
          blocked: 'Blocked',
          ruled_out: 'Ruled Out',
          proposed_root_cause: 'Proposed Root Cause',
          root_cause_found: 'Root Cause Confirmed',
          completed: 'Completed',
        };

        await client.query(
          `INSERT INTO timeline_events (incident_id, event_type, description, user_id, metadata)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            stream.incident_id,
            'update',
            `Stream "${stream.name}" marked as ${statusLabels[status] || status}`,
            userResult.rows[0].id,
            JSON.stringify({ streamId: stream.id, newStatus: status })
          ]
        );
      }
    }

    await client.query('COMMIT');

    // Fetch complete stream
    const completeStream = await pool.query(
      `SELECT 
        s.*,
        json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'avatarUrl', u.avatar_url) as assigned_to,
        json_build_object('id', creator.id, 'name', creator.name, 'email', creator.email) as created_by
      FROM investigation_streams s
      LEFT JOIN users u ON s.assigned_to_id = u.id
      LEFT JOIN users creator ON s.created_by_id = creator.id
      WHERE s.id = $1`,
      [streamId]
    );

    const updatedStream = completeStream.rows[0];

    res.json({
      id: updatedStream.id,
      incidentId: updatedStream.incident_id,
      name: updatedStream.name,
      streamType: updatedStream.stream_type,
      hypothesis: updatedStream.hypothesis,
      status: updatedStream.status,
      priority: updatedStream.priority,
      assignedTo: updatedStream.assigned_to?.id ? updatedStream.assigned_to : null,
      createdAt: updatedStream.created_at,
      startedAt: updatedStream.started_at,
      completedAt: updatedStream.completed_at,
      createdBy: updatedStream.created_by,
      metadata: updatedStream.metadata,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating investigation stream:', error);
    res.status(500).json({ error: 'Failed to update investigation stream' });
  } finally {
    client.release();
  }
});

// DELETE /api/incidents/:incidentId/streams/:streamId - Delete a stream
router.delete('/:incidentId/streams/:streamId', async (req, res) => {
  try {
    const { streamId } = req.params;
    
    await pool.query('DELETE FROM investigation_streams WHERE id = $1', [streamId]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting investigation stream:', error);
    res.status(500).json({ error: 'Failed to delete investigation stream' });
  }
});

// POST /api/incidents/:incidentId/streams/:streamId/tasks - Add a task to a stream
router.post('/:incidentId/streams/:streamId/tasks', async (req, res) => {
  try {
    const { streamId } = req.params;
    const { description, assignedToId, orderIndex = 0 } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'Task description is required' });
    }

    const result = await pool.query(
      `INSERT INTO stream_tasks (stream_id, description, assigned_to_id, order_index)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [streamId, description, assignedToId || null, orderIndex]
    );

    const task = result.rows[0];

    // Fetch assigned user if exists
    let assignedTo = null;
    if (task.assigned_to_id) {
      const userResult = await pool.query(
        'SELECT id, name, email FROM users WHERE id = $1',
        [task.assigned_to_id]
      );
      assignedTo = userResult.rows[0] || null;
    }

    res.status(201).json({
      id: task.id,
      streamId: task.stream_id,
      description: task.description,
      completed: task.completed,
      orderIndex: task.order_index,
      createdAt: task.created_at,
      completedAt: task.completed_at,
      assignedTo,
      completedBy: null,
    });
  } catch (error) {
    console.error('Error creating stream task:', error);
    res.status(500).json({ error: 'Failed to create stream task' });
  }
});

// PATCH /api/incidents/:incidentId/streams/:streamId/tasks/:taskId - Update a task
router.patch('/:incidentId/streams/:streamId/tasks/:taskId', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { taskId } = req.params;
    const { description, completed, assignedToId, orderIndex } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (completed !== undefined) {
      updates.push(`completed = $${paramCount++}`);
      values.push(completed);
      
      if (completed) {
        updates.push(`completed_at = NOW()`);
        
        // Get default user for completed_by
        const userResult = await client.query(
          'SELECT id FROM users WHERE email = $1',
          ['manager@example.com']
        );
        if (userResult.rows.length > 0) {
          updates.push(`completed_by_id = $${paramCount++}`);
          values.push(userResult.rows[0].id);
        }
      } else {
        updates.push(`completed_at = NULL`);
        updates.push(`completed_by_id = NULL`);
      }
    }
    if (assignedToId !== undefined) {
      updates.push(`assigned_to_id = $${paramCount++}`);
      values.push(assignedToId);
    }
    if (orderIndex !== undefined) {
      updates.push(`order_index = $${paramCount++}`);
      values.push(orderIndex);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(taskId);

    const result = await client.query(
      `UPDATE stream_tasks 
       SET ${updates.join(', ')} 
       WHERE id = $${paramCount} 
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = result.rows[0];

    // Fetch related users
    let assignedTo = null;
    let completedBy = null;

    if (task.assigned_to_id) {
      const userResult = await pool.query(
        'SELECT id, name, email FROM users WHERE id = $1',
        [task.assigned_to_id]
      );
      assignedTo = userResult.rows[0] || null;
    }

    if (task.completed_by_id) {
      const userResult = await pool.query(
        'SELECT id, name, email FROM users WHERE id = $1',
        [task.completed_by_id]
      );
      completedBy = userResult.rows[0] || null;
    }

    res.json({
      id: task.id,
      streamId: task.stream_id,
      description: task.description,
      completed: task.completed,
      orderIndex: task.order_index,
      createdAt: task.created_at,
      completedAt: task.completed_at,
      assignedTo,
      completedBy,
    });
  } catch (error) {
    console.error('Error updating stream task:', error);
    res.status(500).json({ error: 'Failed to update stream task' });
  } finally {
    client.release();
  }
});

// DELETE /api/incidents/:incidentId/streams/:streamId/tasks/:taskId - Delete a task
router.delete('/:incidentId/streams/:streamId/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    
    await pool.query('DELETE FROM stream_tasks WHERE id = $1', [taskId]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting stream task:', error);
    res.status(500).json({ error: 'Failed to delete stream task' });
  }
});

// POST /api/incidents/:incidentId/streams/:streamId/findings - Add a finding to a stream
router.post('/:incidentId/streams/:streamId/findings', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { incidentId, streamId } = req.params;
    const { findingType = 'observation', content, metadata = {} } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Finding content is required' });
    }

    await client.query('BEGIN');

    // Get default user
    let userResult = await client.query(
      'SELECT * FROM users WHERE email = $1',
      ['manager@example.com']
    );

    let user;
    if (userResult.rows.length === 0) {
      const insertUser = await client.query(
        'INSERT INTO users (email, name) VALUES ($1, $2) RETURNING *',
        ['manager@example.com', 'Manager on Duty']
      );
      user = insertUser.rows[0];
    } else {
      user = userResult.rows[0];
    }

    // Create the finding
    const result = await client.query(
      `INSERT INTO stream_findings (stream_id, finding_type, content, created_by_id, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [streamId, findingType, content, user.id, JSON.stringify(metadata)]
    );

    const finding = result.rows[0];

    // If this is a root cause finding, update stream status
    if (findingType === 'proposed_root_cause' || findingType === 'root_cause') {
      const newStatus = findingType === 'root_cause' ? 'root_cause_found' : 'proposed_root_cause';
      
      await client.query(
        `UPDATE investigation_streams SET status = $1 WHERE id = $2`,
        [newStatus, streamId]
      );

      // Get stream name for timeline
      const streamResult = await client.query(
        'SELECT name FROM investigation_streams WHERE id = $1',
        [streamId]
      );

      if (streamResult.rows.length > 0) {
        const statusLabel = findingType === 'root_cause' ? 'Root Cause Confirmed' : 'Proposed Root Cause';
        await client.query(
          `INSERT INTO timeline_events (incident_id, event_type, description, user_id, metadata)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            incidentId,
            'update',
            `${statusLabel} in stream "${streamResult.rows[0].name}": ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`,
            user.id,
            JSON.stringify({ streamId, findingId: finding.id, findingType })
          ]
        );
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      id: finding.id,
      streamId: finding.stream_id,
      findingType: finding.finding_type,
      content: finding.content,
      createdAt: finding.created_at,
      metadata: finding.metadata,
      createdBy: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating stream finding:', error);
    res.status(500).json({ error: 'Failed to create stream finding' });
  } finally {
    client.release();
  }
});

// PATCH /api/incidents/:incidentId/streams/:streamId/findings/:findingId - Update a finding
router.patch('/:incidentId/streams/:streamId/findings/:findingId', async (req, res) => {
  try {
    const { findingId } = req.params;
    const { findingType, content, metadata } = req.body;
    
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (findingType !== undefined) {
      updates.push(`finding_type = $${paramCount}`);
      values.push(findingType);
      paramCount++;
    }
    
    if (content !== undefined) {
      updates.push(`content = $${paramCount}`);
      values.push(content);
      paramCount++;
    }
    
    if (metadata !== undefined) {
      updates.push(`metadata = $${paramCount}`);
      values.push(JSON.stringify(metadata));
      paramCount++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    values.push(findingId);
    
    await pool.query(
      `UPDATE stream_findings
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}`,
      values
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating stream finding:', error);
    res.status(500).json({ error: 'Failed to update stream finding' });
  }
});

// DELETE /api/incidents/:incidentId/streams/:streamId/findings/:findingId - Delete a finding
router.delete('/:incidentId/streams/:streamId/findings/:findingId', async (req, res) => {
  try {
    const { findingId } = req.params;
    
    await pool.query('DELETE FROM stream_findings WHERE id = $1', [findingId]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting stream finding:', error);
    res.status(500).json({ error: 'Failed to delete stream finding' });
  }
});

module.exports = router;
