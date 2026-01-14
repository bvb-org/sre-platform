import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { description, eventType = 'update', metadata = {} } = body;

    if (!description) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    // Get or create default user
    let userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      ['manager@example.com']
    );

    let user;
    if (userResult.rows.length === 0) {
      const insertUser = await pool.query(
        'INSERT INTO users (email, name) VALUES ($1, $2) RETURNING *',
        ['manager@example.com', 'Manager on Duty']
      );
      user = insertUser.rows[0];
    } else {
      user = userResult.rows[0];
    }

    // Create timeline event
    const result = await pool.query(
      `INSERT INTO timeline_events (incident_id, event_type, description, user_id, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [params.id, eventType, description, user.id, JSON.stringify(metadata)]
    );

    const timelineEvent = {
      ...result.rows[0],
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };

    return NextResponse.json(timelineEvent, { status: 201 });
  } catch (error) {
    console.error('Error creating timeline event:', error);
    return NextResponse.json(
      { error: 'Failed to create timeline event' },
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
      `SELECT te.*,
        json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'avatar_url', u.avatar_url) as user
       FROM timeline_events te
       LEFT JOIN users u ON te.user_id = u.id
       WHERE te.incident_id = $1
       ORDER BY te.created_at DESC`,
      [params.id]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching timeline events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timeline events' },
      { status: 500 }
    );
  }
}
