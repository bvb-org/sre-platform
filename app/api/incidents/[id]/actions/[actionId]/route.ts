import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; actionId: string } }
) {
  try {
    const body = await request.json();
    const { completed, description, assignedToId } = body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (completed !== undefined) {
      updates.push(`completed = $${paramCount++}`);
      values.push(completed);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (assignedToId !== undefined) {
      updates.push(`assigned_to_id = $${paramCount++}`);
      values.push(assignedToId);
    }

    values.push(params.actionId);

    const result = await pool.query(
      `UPDATE action_items SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
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

    return NextResponse.json(actionItem);
  } catch (error) {
    console.error('Error updating action item:', error);
    return NextResponse.json(
      { error: 'Failed to update action item' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; actionId: string } }
) {
  try {
    await pool.query('DELETE FROM action_items WHERE id = $1', [params.actionId]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting action item:', error);
    return NextResponse.json(
      { error: 'Failed to delete action item' },
      { status: 500 }
    );
  }
}
