import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    let query = 'SELECT * FROM runbooks';
    const params: any[] = [];

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

    return NextResponse.json(runbooks);
  } catch (error) {
    console.error('Error fetching runbooks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch runbooks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      serviceName,
      teamName,
      teamEmail,
      description,
      monitoringLinks,
      upstreamServices,
      downstreamServices,
      runbookProcedures,
    } = body;

    if (!serviceName || !teamName || !teamEmail || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
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

    return NextResponse.json({
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
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating runbook:', error);
    
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json(
        { error: 'A runbook with this service name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create runbook' },
      { status: 500 }
    );
  }
}
