import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { description, assignedToId } = body;

    if (!description) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO action_items (incident_id, description, assigned_to_id, completed)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [params.id, description, assignedToId || null, false]
    );

    const actionItem = result.rows[0];

    // Fetch assigned user if exists
    if (actionItem.assigned_to_id) {
      const userResult = await pool.query(
        'SELECT id, name, email FROM users WHERE id = $1',
        [actionItem.assigned_to_id]
      );
      actionItem.assignedTo = userResult.rows[0] || null;
    } else {
      actionItem.assignedTo = null;
    }

    return NextResponse.json(actionItem, { status: 201 });
  } catch (error) {
    console.error('Error creating action item:', error);
    return NextResponse.json(
      { error: 'Failed to create action item' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await pool.query(
      `SELECT ai.*,
        CASE WHEN ai.assigned_to_id IS NOT NULL 
          THEN json_build_object('id', u.id, 'name', u.name, 'email', u.email)
          ELSE NULL 
        END as assigned_to
       FROM action_items ai
       LEFT JOIN users u ON ai.assigned_to_id = u.id
       WHERE ai.incident_id = $1
       ORDER BY ai.created_at ASC`,
      [params.id]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching action items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch action items' },
      { status: 500 }
    );
  }
}
