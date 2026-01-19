import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// GET /api/incidents/[id]/postmortem - Get postmortem for an incident
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await pool.query(
      `SELECT 
        p.*,
        u.name as creator_name,
        u.email as creator_email
      FROM postmortems p
      LEFT JOIN users u ON p.created_by_id = u.id
      WHERE p.incident_id = $1`,
      [params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ postmortem: null }, { status: 200 });
    }

    const row = result.rows[0];
    const postmortem = {
      id: row.id,
      incidentId: row.incident_id,
      status: row.status,
      
      // Business Impact
      businessImpactApplication: row.business_impact_application,
      businessImpactStart: row.business_impact_start,
      businessImpactEnd: row.business_impact_end,
      businessImpactDuration: row.business_impact_duration,
      businessImpactDescription: row.business_impact_description,
      businessImpactAffectedCountries: row.business_impact_affected_countries || [],
      businessImpactRegulatoryReporting: row.business_impact_regulatory_reporting,
      businessImpactRegulatoryEntity: row.business_impact_regulatory_entity,
      
      // Mitigation
      mitigationDescription: row.mitigation_description,
      
      // Causal Analysis
      causalAnalysis: row.causal_analysis || [],
      
      // Action Items
      actionItems: row.action_items || [],
      
      createdBy: {
        name: row.creator_name,
        email: row.creator_email,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      publishedAt: row.published_at,
    };

    return NextResponse.json(postmortem);
  } catch (error) {
    console.error('Error fetching postmortem:', error);
    return NextResponse.json(
      { error: 'Failed to fetch postmortem' },
      { status: 500 }
    );
  }
}

// POST /api/incidents/[id]/postmortem - Generate or update postmortem
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { action, userId } = body;

    if (action === 'generate') {
      // Fetch incident data with all related information
      const incidentResult = await pool.query(
        `SELECT
          i.*,
          il.name as lead_name,
          r.name as reporter_name,
          COALESCE(
            (SELECT json_agg(timeline_data ORDER BY timeline_data->>'createdAt')
             FROM (
               SELECT DISTINCT ON (te.id) jsonb_build_object(
                 'type', te.event_type,
                 'description', te.description,
                 'createdAt', te.created_at,
                 'userName', u.name
               ) as timeline_data
               FROM timeline_events te
               LEFT JOIN users u ON te.user_id = u.id
               WHERE te.incident_id = i.id
             ) timeline_subquery
            ), '[]'::json
          ) as timeline_events,
          COALESCE(
            (SELECT json_agg(DISTINCT jsonb_build_object(
              'serviceName', rb.service_name,
              'teamName', rb.team_name
            ))
             FROM incident_services isr
             LEFT JOIN runbooks rb ON isr.runbook_id = rb.id
             WHERE isr.incident_id = i.id AND rb.id IS NOT NULL
            ), '[]'::json
          ) as services
        FROM incidents i
        LEFT JOIN users il ON i.incident_lead_id = il.id
        LEFT JOIN users r ON i.reporter_id = r.id
        WHERE i.id = $1`,
        [params.id]
      );

      if (incidentResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Incident not found' },
          { status: 404 }
        );
      }

      const incident = incidentResult.rows[0];

      // Check if incident is resolved or closed
      if (incident.status !== 'resolved' && incident.status !== 'closed') {
        return NextResponse.json(
          { error: 'Postmortem can only be generated for resolved or closed incidents' },
          { status: 400 }
        );
      }

      // Generate postmortem using Anthropic Claude
      console.log('[DEBUG] Building prompt for AI generation');
      const prompt = buildPostmortemPrompt(incident);
      
      console.log('[DEBUG] Calling Anthropic API...');
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 8192,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const generatedContent = message.content[0].type === 'text'
        ? message.content[0].text
        : '';

      console.log('[DEBUG] AI response received, length:', generatedContent.length);
      console.log('[DEBUG] AI response content:', generatedContent);

      // Parse the AI response into structured sections
      console.log('[DEBUG] Parsing AI response into sections...');
      const sections = parsePostmortemSections(generatedContent, incident);
      console.log('[DEBUG] Parsed sections:', JSON.stringify(sections, null, 2));

      // Check if postmortem already exists
      const existingResult = await pool.query(
        'SELECT id FROM postmortems WHERE incident_id = $1',
        [params.id]
      );

      let postmortemId;

      if (existingResult.rows.length > 0) {
        // Update existing postmortem
        postmortemId = existingResult.rows[0].id;
        await pool.query(
          `UPDATE postmortems 
          SET business_impact_application = $1,
              business_impact_start = $2,
              business_impact_end = $3,
              business_impact_duration = $4,
              business_impact_description = $5,
              business_impact_affected_countries = $6,
              business_impact_regulatory_reporting = $7,
              business_impact_regulatory_entity = $8,
              mitigation_description = $9,
              causal_analysis = $10,
              action_items = $11,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $12`,
          [
            sections.businessImpactApplication,
            sections.businessImpactStart,
            sections.businessImpactEnd,
            sections.businessImpactDuration,
            sections.businessImpactDescription,
            JSON.stringify(sections.businessImpactAffectedCountries),
            sections.businessImpactRegulatoryReporting,
            sections.businessImpactRegulatoryEntity,
            sections.mitigationDescription,
            JSON.stringify(sections.causalAnalysis),
            JSON.stringify(sections.actionItems),
            postmortemId,
          ]
        );
      } else {
        // Create new postmortem
        const insertResult = await pool.query(
          `INSERT INTO postmortems (
            id, incident_id, status,
            business_impact_application,
            business_impact_start,
            business_impact_end,
            business_impact_duration,
            business_impact_description,
            business_impact_affected_countries,
            business_impact_regulatory_reporting,
            business_impact_regulatory_entity,
            mitigation_description,
            causal_analysis,
            action_items,
            created_by_id
          ) VALUES (
            gen_random_uuid(), $1, 'draft', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
          ) RETURNING id`,
          [
            params.id,
            sections.businessImpactApplication,
            sections.businessImpactStart,
            sections.businessImpactEnd,
            sections.businessImpactDuration,
            sections.businessImpactDescription,
            JSON.stringify(sections.businessImpactAffectedCountries),
            sections.businessImpactRegulatoryReporting,
            sections.businessImpactRegulatoryEntity,
            sections.mitigationDescription,
            JSON.stringify(sections.causalAnalysis),
            JSON.stringify(sections.actionItems),
            userId,
          ]
        );
        postmortemId = insertResult.rows[0].id;
      }

      // Fetch and return the created/updated postmortem
      const postmortemResult = await pool.query(
        'SELECT * FROM postmortems WHERE id = $1',
        [postmortemId]
      );

      const row = postmortemResult.rows[0];
      const postmortem = {
        id: row.id,
        incidentId: row.incident_id,
        status: row.status,
        businessImpactApplication: row.business_impact_application,
        businessImpactStart: row.business_impact_start,
        businessImpactEnd: row.business_impact_end,
        businessImpactDuration: row.business_impact_duration,
        businessImpactDescription: row.business_impact_description,
        businessImpactAffectedCountries: row.business_impact_affected_countries || [],
        businessImpactRegulatoryReporting: row.business_impact_regulatory_reporting,
        businessImpactRegulatoryEntity: row.business_impact_regulatory_entity,
        mitigationDescription: row.mitigation_description,
        causalAnalysis: row.causal_analysis || [],
        actionItems: row.action_items || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      return NextResponse.json(postmortem);
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error generating postmortem:', error);
    return NextResponse.json(
      { error: 'Failed to generate postmortem' },
      { status: 500 }
    );
  }
}

// PATCH /api/incidents/[id]/postmortem - Update postmortem sections
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      businessImpactApplication,
      businessImpactStart,
      businessImpactEnd,
      businessImpactDuration,
      businessImpactDescription,
      businessImpactAffectedCountries,
      businessImpactRegulatoryReporting,
      businessImpactRegulatoryEntity,
      mitigationDescription,
      causalAnalysis,
      actionItems,
      status,
    } = body;

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (businessImpactApplication !== undefined) {
      updates.push(`business_impact_application = $${paramCount++}`);
      values.push(businessImpactApplication);
    }
    if (businessImpactStart !== undefined) {
      updates.push(`business_impact_start = $${paramCount++}`);
      values.push(businessImpactStart);
    }
    if (businessImpactEnd !== undefined) {
      updates.push(`business_impact_end = $${paramCount++}`);
      values.push(businessImpactEnd);
    }
    if (businessImpactDuration !== undefined) {
      updates.push(`business_impact_duration = $${paramCount++}`);
      values.push(businessImpactDuration);
    }
    if (businessImpactDescription !== undefined) {
      updates.push(`business_impact_description = $${paramCount++}`);
      values.push(businessImpactDescription);
    }
    if (businessImpactAffectedCountries !== undefined) {
      updates.push(`business_impact_affected_countries = $${paramCount++}`);
      values.push(JSON.stringify(businessImpactAffectedCountries));
    }
    if (businessImpactRegulatoryReporting !== undefined) {
      updates.push(`business_impact_regulatory_reporting = $${paramCount++}`);
      values.push(businessImpactRegulatoryReporting);
    }
    if (businessImpactRegulatoryEntity !== undefined) {
      updates.push(`business_impact_regulatory_entity = $${paramCount++}`);
      values.push(businessImpactRegulatoryEntity);
    }
    if (mitigationDescription !== undefined) {
      updates.push(`mitigation_description = $${paramCount++}`);
      values.push(mitigationDescription);
    }
    if (causalAnalysis !== undefined) {
      updates.push(`causal_analysis = $${paramCount++}`);
      values.push(JSON.stringify(causalAnalysis));
    }
    if (actionItems !== undefined) {
      updates.push(`action_items = $${paramCount++}`);
      values.push(JSON.stringify(actionItems));
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
      if (status === 'published') {
        updates.push(`published_at = CURRENT_TIMESTAMP`);
      }
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(params.id);

    const updateQuery = `
      UPDATE postmortems 
      SET ${updates.join(', ')}
      WHERE incident_id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Postmortem not found' },
        { status: 404 }
      );
    }

    const row = result.rows[0];
    const postmortem = {
      id: row.id,
      incidentId: row.incident_id,
      status: row.status,
      businessImpactApplication: row.business_impact_application,
      businessImpactStart: row.business_impact_start,
      businessImpactEnd: row.business_impact_end,
      businessImpactDuration: row.business_impact_duration,
      businessImpactDescription: row.business_impact_description,
      businessImpactAffectedCountries: row.business_impact_affected_countries || [],
      businessImpactRegulatoryReporting: row.business_impact_regulatory_reporting,
      businessImpactRegulatoryEntity: row.business_impact_regulatory_entity,
      mitigationDescription: row.mitigation_description,
      causalAnalysis: row.causal_analysis || [],
      actionItems: row.action_items || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      publishedAt: row.published_at,
    };

    return NextResponse.json(postmortem);
  } catch (error) {
    console.error('Error updating postmortem:', error);
    return NextResponse.json(
      { error: 'Failed to update postmortem' },
      { status: 500 }
    );
  }
}

function buildPostmortemPrompt(incident: any): string {
  const timelineEvents = incident.timeline_events || [];
  const services = incident.services || [];

  return `You are an expert Site Reliability Engineer writing a comprehensive postmortem for a production incident using the Swiss cheese model methodology. Generate a detailed, professional postmortem based on the following incident data:

**Incident Details:**
- Incident Number: ${incident.incident_number}
- Title: ${incident.title}
- Description: ${incident.description}
- Severity: ${incident.severity}
- Status: ${incident.status}
- Incident Lead: ${incident.lead_name || 'Unknown'}
- Reporter: ${incident.reporter_name || 'Unknown'}
- Started: ${incident.detected_at}
- Resolved: ${incident.resolved_at || 'Not yet resolved'}
- Duration: ${calculateDuration(incident.detected_at, incident.resolved_at)}

**Affected Services:**
${services.map((s: any) => `- ${s.serviceName} (Team: ${s.teamName})`).join('\n') || 'None specified'}

**Timeline of Events:**
${timelineEvents.map((e: any) => `- ${e.createdAt}: [${e.type}] ${e.description} (by ${e.userName})`).join('\n') || 'No timeline events recorded'}

**Additional Context:**
- Problem Statement: ${incident.problem_statement || 'Not documented'}
- Impact: ${incident.impact || 'Unknown'}
- Causes: ${incident.causes || 'Under investigation'}
- Steps to Resolve: ${incident.steps_to_resolve || 'Not documented'}

Please generate a comprehensive postmortem with the following sections. Use clear section markers:

[BUSINESS_IMPACT]
Provide structured business impact information:
- Application: Name of the affected application
- Start Time: When the impact started (ISO format)
- End Time: When the impact ended (ISO format)
- Description: Detailed description of which specific functionalities were not available for end customers/consumers
- Affected Countries: JSON array of country codes (e.g., ["US", "UK", "DE"])
- Regulatory Reporting: true/false if regulatory reporting is needed
- Regulatory Entity: If reporting needed, specify entity (e.g., "DORA", "ECB")

[MITIGATION]
Describe all actions, resilience patterns, or decisions that were taken to mitigate the incident. Be specific about what was done and why.

[CAUSAL_ANALYSIS]
Provide a systemic causal analysis using the Swiss cheese model. For each identified failure, specify:
- Interception Layer: One of [define, design, build, test, release, deploy, operate, response]
- Cause: The primary cause category (e.g., "Alerting gaps", "Architectural weakness", "Change management failure")
- Sub-cause: The specific sub-cause (e.g., "Missing alerts for key metrics", "Lack of modularity", "Lack of coordination")
- Description: Brief explanation
- Action Items: Array of action items specific to this cause, each with "description" and "priority" (high/medium/low)

Format as JSON array: [{"interceptionLayer": "...", "cause": "...", "subCause": "...", "description": "...", "actionItems": [{"description": "...", "priority": "..."}]}]

Note: Action items should be directly related to addressing the specific cause they are nested under.

Be professional, factual, and constructive. Focus on learning and improvement rather than blame.`;
}

function calculateDuration(start: string, end?: string): string {
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMins / 60);
  const minutes = diffMins % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function parsePostmortemSections(content: string, incident: any): any {
  const sections: any = {
    businessImpactApplication: null,
    businessImpactStart: null,
    businessImpactEnd: null,
    businessImpactDuration: null,
    businessImpactDescription: null,
    businessImpactAffectedCountries: [],
    businessImpactRegulatoryReporting: false,
    businessImpactRegulatoryEntity: null,
    mitigationDescription: null,
    causalAnalysis: [],
    actionItems: [], // Keep for backward compatibility, but will be empty
  };

  console.log('[DEBUG] Parsing business impact section...');
  // Extract Business Impact
  const businessImpactMatch = content.match(/\[BUSINESS_IMPACT\]([\s\S]*?)(?=\[|$)/);
  if (businessImpactMatch) {
    const impactText = businessImpactMatch[1].trim();
    console.log('[DEBUG] Business impact text found:', impactText.substring(0, 200));
    
    // Try to extract structured data
    const appMatch = impactText.match(/Application:\s*(.+)/i);
    if (appMatch) {
      sections.businessImpactApplication = appMatch[1].trim();
      console.log('[DEBUG] Extracted application:', sections.businessImpactApplication);
    }
    
    const startMatch = impactText.match(/Start Time:\s*(.+)/i);
    if (startMatch) {
      try {
        sections.businessImpactStart = new Date(startMatch[1].trim()).toISOString();
      } catch (e) {
        sections.businessImpactStart = incident.detected_at;
      }
    } else {
      sections.businessImpactStart = incident.detected_at;
    }
    
    const endMatch = impactText.match(/End Time:\s*(.+)/i);
    if (endMatch) {
      try {
        sections.businessImpactEnd = new Date(endMatch[1].trim()).toISOString();
      } catch (e) {
        sections.businessImpactEnd = incident.resolved_at;
      }
    } else {
      sections.businessImpactEnd = incident.resolved_at;
    }
    
    // Calculate duration in minutes
    if (sections.businessImpactStart && sections.businessImpactEnd) {
      const start = new Date(sections.businessImpactStart);
      const end = new Date(sections.businessImpactEnd);
      sections.businessImpactDuration = Math.floor((end.getTime() - start.getTime()) / 60000);
    }
    
    const descMatch = impactText.match(/Description:\s*(.+?)(?=\n-|\nAffected|$)/i);
    if (descMatch) sections.businessImpactDescription = descMatch[1].trim();
    
    const countriesMatch = impactText.match(/Affected Countries:\s*(\[.+?\])/i);
    if (countriesMatch) {
      try {
        sections.businessImpactAffectedCountries = JSON.parse(countriesMatch[1]);
      } catch (e) {
        sections.businessImpactAffectedCountries = [];
      }
    }
    
    const regReportingMatch = impactText.match(/Regulatory Reporting:\s*(true|false)/i);
    if (regReportingMatch) {
      sections.businessImpactRegulatoryReporting = regReportingMatch[1].toLowerCase() === 'true';
    }
    
    const regEntityMatch = impactText.match(/Regulatory Entity:\s*(.+)/i);
    if (regEntityMatch && sections.businessImpactRegulatoryReporting) {
      sections.businessImpactRegulatoryEntity = regEntityMatch[1].trim().replace(/^["']|["']$/g, '');
    }
  }

  console.log('[DEBUG] Parsing mitigation section...');
  // Extract Mitigation
  const mitigationMatch = content.match(/\[MITIGATION\]([\s\S]*?)(?=\[|$)/);
  if (mitigationMatch) {
    sections.mitigationDescription = mitigationMatch[1].trim();
    console.log('[DEBUG] Mitigation description length:', sections.mitigationDescription.length);
  } else {
    console.log('[WARN] No mitigation section found in AI response');
  }

  console.log('[DEBUG] Parsing causal analysis section...');
  // Extract Causal Analysis
  const causalMatch = content.match(/\[CAUSAL_ANALYSIS\]([\s\S]*?)(?=\[|$)/);
  if (causalMatch) {
    const causalText = causalMatch[1].trim();
    console.log('[DEBUG] Causal analysis text found:', causalText.substring(0, 200));
    try {
      const jsonMatch = causalText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        sections.causalAnalysis = JSON.parse(jsonMatch[0]);
        console.log('[DEBUG] Parsed causal analysis items:', sections.causalAnalysis.length);
      } else {
        console.log('[WARN] No JSON array found in causal analysis section');
      }
    } catch (e) {
      console.error('[ERROR] Failed to parse causal analysis:', e);
      console.error('[ERROR] Causal text that failed:', causalText);
      sections.causalAnalysis = [];
    }
  } else {
    console.log('[WARN] No causal analysis section found in AI response');
  }

  // Action items are now nested within causal analysis items
  console.log('[DEBUG] Action items are now nested within causal analysis');

  return sections;
}
