const express = require('express');
const router = express.Router({ mergeParams: true });
const pool = require('../db');
const { getAIService } = require('../services/aiService');
const { getKnowledgeGraphService } = require('../services/knowledgeGraphService');

// GET /api/incidents/:id/postmortem - Get postmortem for an incident
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        p.*,
        u.name as creator_name,
        u.email as creator_email
      FROM postmortems p
      LEFT JOIN users u ON p.created_by_id = u.id
      WHERE p.incident_id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.json({ postmortem: null });
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

    res.json(postmortem);
  } catch (error) {
    console.error('Error fetching postmortem:', error);
    res.status(500).json({ error: 'Failed to fetch postmortem' });
  }
});

// POST /api/incidents/:id/postmortem/create - Create empty postmortem
router.post('/create', async (req, res) => {
  try {
    const { userId } = req.body;

    // Check if postmortem already exists
    const existingResult = await pool.query(
      'SELECT id FROM postmortems WHERE incident_id = $1',
      [req.params.id]
    );

    if (existingResult.rows.length > 0) {
      // Return existing postmortem
      const postmortemResult = await pool.query(
        'SELECT * FROM postmortems WHERE incident_id = $1',
        [req.params.id]
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
        publishedAt: row.published_at,
      };
      return res.json(postmortem);
    }

    // Create new empty postmortem
    const insertResult = await pool.query(
      `INSERT INTO postmortems (
        id, incident_id, status, created_by_id
      ) VALUES (
        gen_random_uuid(), $1, 'draft', $2
      ) RETURNING id`,
      [req.params.id, userId]
    );

    const postmortemId = insertResult.rows[0].id;

    // Fetch and return the created postmortem
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
      businessImpactRegulatoryReporting: row.business_impact_regulatory_reporting || false,
      businessImpactRegulatoryEntity: row.business_impact_regulatory_entity,
      mitigationDescription: row.mitigation_description,
      causalAnalysis: row.causal_analysis || [],
      actionItems: row.action_items || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      publishedAt: row.published_at,
    };

    res.json(postmortem);
  } catch (error) {
    console.error('Error creating empty postmortem:', error);
    res.status(500).json({ error: 'Failed to create postmortem' });
  }
});

// POST /api/incidents/:id/postmortem - Generate or update postmortem
router.post('/', async (req, res) => {
  const startTime = Date.now();
  console.log('[DEBUG] POST /postmortem - Request received at', new Date().toISOString());
  console.log('[DEBUG] Request body:', JSON.stringify(req.body));
  
  try {
    const { action, userId } = req.body;

    if (action === 'generate') {
      console.log('[DEBUG] Starting postmortem generation for incident:', req.params.id);
      const dbQueryStart = Date.now();
      
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
        [req.params.id]
      );
      
      const dbQueryDuration = Date.now() - dbQueryStart;
      console.log('[DIAGNOSTIC] Database query took:', dbQueryDuration, 'ms');

      if (incidentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Incident not found' });
      }

      const incident = incidentResult.rows[0];
      
      // Log timeline event count for diagnostics
      const timelineCount = incident.timeline_events?.length || 0;
      console.log('[DIAGNOSTIC] Timeline events count:', timelineCount);
      console.log('[DIAGNOSTIC] Services count:', incident.services?.length || 0);

      // Check if incident is resolved or closed
      if (incident.status !== 'resolved' && incident.status !== 'closed') {
        return res.status(400).json({ 
          error: 'Postmortem can only be generated for resolved or closed incidents' 
        });
      }

      // Generate postmortem using Anthropic Claude
      console.log('[DEBUG] Building prompt for AI generation');
      const prompt = buildPostmortemPrompt(incident);
      
      const promptLength = prompt.length;
      const estimatedTokens = Math.ceil(promptLength / 4); // Rough estimate: 1 token ≈ 4 chars
      console.log('[DIAGNOSTIC] Prompt length:', promptLength, 'characters');
      console.log('[DIAGNOSTIC] Estimated prompt tokens:', estimatedTokens);
      
      console.log('[DEBUG] Calling AI API...');
      const apiCallStart = Date.now();
      const aiService = getAIService();
      const result = await aiService.generateCompletion(prompt, 8192);
      
      const apiCallDuration = Date.now() - apiCallStart;
      console.log('[DIAGNOSTIC] AI API call took:', apiCallDuration, 'ms');
      console.log('[DIAGNOSTIC] Using provider:', aiService.getProvider(), 'model:', aiService.getModel());

      const generatedContent = result.text;

      console.log('[DEBUG] AI response received, length:', generatedContent.length);
      console.log('[DIAGNOSTIC] Response tokens used:', result.usage?.outputTokens || 'unknown');
      console.log('[DIAGNOSTIC] Input tokens used:', result.usage?.inputTokens || 'unknown');

      // Parse the AI response into structured sections
      console.log('[DEBUG] Parsing AI response into sections...');
      const sections = parsePostmortemSections(generatedContent, incident);
      console.log('[DEBUG] Parsed sections:', JSON.stringify(sections, null, 2));

      // Check if postmortem already exists
      const existingResult = await pool.query(
        'SELECT id FROM postmortems WHERE incident_id = $1',
        [req.params.id]
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
            req.params.id,
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

      const duration = Date.now() - startTime;
      console.log('[DEBUG] Postmortem generation completed successfully in', duration, 'ms');
      console.log('[DEBUG] Sending response with postmortem data');
      return res.json(postmortem);
    }

    res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[ERROR] Postmortem generation failed after', duration, 'ms');
    console.error('[ERROR] Error details:', error);
    console.error('[ERROR] Error stack:', error.stack);
    
    // Ensure we always send JSON response
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate postmortem', details: error.message });
    } else {
      console.error('[ERROR] Headers already sent, cannot send error response');
    }
  }
});

// PATCH /api/incidents/:id/postmortem - Update postmortem sections
router.patch('/', async (req, res) => {
  try {
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
    } = req.body;

    // Build dynamic update query
    const updates = [];
    const values = [];
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
    values.push(req.params.id);

    const updateQuery = `
      UPDATE postmortems 
      SET ${updates.join(', ')}
      WHERE incident_id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Postmortem not found' });
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

    // If postmortem was just published, trigger knowledge graph processing
    if (status === 'published') {
      const knowledgeGraphService = getKnowledgeGraphService();
      if (knowledgeGraphService.isAvailable()) {
        // Process asynchronously - don't wait for completion
        knowledgeGraphService.processPublishedPostmortem(row.id)
          .then(() => {
            console.log('[Postmortem] Knowledge graph processing completed for:', row.id);
          })
          .catch(err => {
            console.error('[Postmortem] Knowledge graph processing failed:', err);
          });
      }
    }

    res.json(postmortem);
  } catch (error) {
    console.error('Error updating postmortem:', error);
    res.status(500).json({ error: 'Failed to update postmortem' });
  }
});

// POST /api/incidents/:id/postmortem/check - AI proofreading and quality check
router.post('/check', async (req, res) => {
  try {
    const { action, postmortem, question, section, currentContent } = req.body;

    const aiService = getAIService();

    if (action === 'check') {
      // AI proofreading and quality check
      const prompt = buildQualityCheckPrompt(postmortem);
      const result = await aiService.generateCompletion(prompt, 2048);
      return res.json({ feedback: result.text });
    } else if (action === 'ask') {
      // AI coaching - answer questions about postmortem methodology
      const prompt = buildCoachingPrompt(question, postmortem);
      const result = await aiService.generateCompletion(prompt, 1024);
      return res.json({ answer: result.text });
    } else if (action === 'expand') {
      // AI section expansion
      const prompt = buildExpansionPrompt(section, currentContent, postmortem);
      const result = await aiService.generateCompletion(prompt, 1024);
      return res.json({ expandedContent: result.text });
    }

    res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('Error in AI check:', error);
    res.status(500).json({ error: 'Failed to process AI request' });
  }
});

// POST /api/incidents/:id/postmortem/generate-chunked - Generate postmortem in chunks
router.post('/generate-chunked', async (req, res) => {
  const startTime = Date.now();
  console.log('[DEBUG] POST /postmortem/generate-chunked - Request received at', new Date().toISOString());
  
  try {
    const { section, userId } = req.body;
    
    if (!section) {
      return res.status(400).json({ error: 'Section parameter is required' });
    }

    console.log('[DEBUG] Generating section:', section);
    const dbQueryStart = Date.now();
    
    // Fetch incident data - optimized query based on section needs
    let incidentQuery;
    if (section === 'business_impact') {
      // For business impact, we need basic incident info only
      incidentQuery = `
        SELECT
          i.*,
          il.name as lead_name,
          r.name as reporter_name,
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
        WHERE i.id = $1
      `;
    } else if (section === 'mitigation') {
      // For mitigation, we need timeline events but can limit them
      incidentQuery = `
        SELECT
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
               ORDER BY te.id, te.created_at DESC
               LIMIT 50
             ) timeline_subquery
            ), '[]'::json
          ) as timeline_events
        FROM incidents i
        LEFT JOIN users il ON i.incident_lead_id = il.id
        LEFT JOIN users r ON i.reporter_id = r.id
        WHERE i.id = $1
      `;
    } else if (section === 'causal_analysis') {
      // For causal analysis, we need summarized timeline
      incidentQuery = `
        SELECT
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
               ORDER BY te.id, te.created_at DESC
               LIMIT 30
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
        WHERE i.id = $1
      `;
    } else {
      return res.status(400).json({ error: 'Invalid section' });
    }

    const incidentResult = await pool.query(incidentQuery, [req.params.id]);
    
    const dbQueryDuration = Date.now() - dbQueryStart;
    console.log('[DIAGNOSTIC] Database query took:', dbQueryDuration, 'ms');

    if (incidentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const incident = incidentResult.rows[0];
    
    const timelineCount = incident.timeline_events?.length || 0;
    console.log('[DIAGNOSTIC] Timeline events count:', timelineCount);

    // Check if incident is resolved or closed
    if (incident.status !== 'resolved' && incident.status !== 'closed') {
      return res.status(400).json({
        error: 'Postmortem can only be generated for resolved or closed incidents'
      });
    }

    // Build section-specific prompt
    let prompt;
    let maxTokens;
    
    if (section === 'business_impact') {
      prompt = buildBusinessImpactPrompt(incident);
      maxTokens = 1024;
    } else if (section === 'mitigation') {
      prompt = buildMitigationPrompt(incident);
      maxTokens = 2048;
    } else if (section === 'causal_analysis') {
      prompt = buildCausalAnalysisPrompt(incident);
      maxTokens = 4096;
    }
    
    const promptLength = prompt.length;
    const estimatedTokens = Math.ceil(promptLength / 4);
    console.log('[DIAGNOSTIC] Prompt length:', promptLength, 'characters');
    console.log('[DIAGNOSTIC] Estimated prompt tokens:', estimatedTokens);
    
    console.log('[DEBUG] Calling AI API for section:', section);
    const apiCallStart = Date.now();
    const aiService = getAIService();
    const aiResult = await aiService.generateCompletion(prompt, maxTokens);
    
    const apiCallDuration = Date.now() - apiCallStart;
    console.log('[DIAGNOSTIC] AI API call took:', apiCallDuration, 'ms');
    console.log('[DIAGNOSTIC] Using provider:', aiService.getProvider(), 'model:', aiService.getModel());

    const generatedContent = aiResult.text;

    console.log('[DEBUG] AI response received, length:', generatedContent.length);
    console.log('[DIAGNOSTIC] Response tokens used:', aiResult.usage?.outputTokens || 'unknown');
    console.log('[DIAGNOSTIC] Input tokens used:', aiResult.usage?.inputTokens || 'unknown');

    // Parse the section-specific response
    let sectionData;
    if (section === 'business_impact') {
      sectionData = parseBusinessImpact(generatedContent, incident);
    } else if (section === 'mitigation') {
      sectionData = { mitigationDescription: generatedContent.trim() };
    } else if (section === 'causal_analysis') {
      sectionData = parseCausalAnalysis(generatedContent);
    }

    // Check if postmortem exists, create if not
    const existingResult = await pool.query(
      'SELECT id FROM postmortems WHERE incident_id = $1',
      [req.params.id]
    );

    let postmortemId;
    if (existingResult.rows.length === 0) {
      // Create new postmortem
      const insertResult = await pool.query(
        `INSERT INTO postmortems (
          id, incident_id, status, created_by_id
        ) VALUES (
          gen_random_uuid(), $1, 'draft', $2
        ) RETURNING id`,
        [req.params.id, userId]
      );
      postmortemId = insertResult.rows[0].id;
    } else {
      postmortemId = existingResult.rows[0].id;
    }

    // Update the specific section
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (section === 'business_impact') {
      if (sectionData.businessImpactApplication !== undefined) {
        updates.push(`business_impact_application = $${paramCount++}`);
        values.push(sectionData.businessImpactApplication);
      }
      if (sectionData.businessImpactStart !== undefined) {
        updates.push(`business_impact_start = $${paramCount++}`);
        values.push(sectionData.businessImpactStart);
      }
      if (sectionData.businessImpactEnd !== undefined) {
        updates.push(`business_impact_end = $${paramCount++}`);
        values.push(sectionData.businessImpactEnd);
      }
      if (sectionData.businessImpactDuration !== undefined) {
        updates.push(`business_impact_duration = $${paramCount++}`);
        values.push(sectionData.businessImpactDuration);
      }
      if (sectionData.businessImpactDescription !== undefined) {
        updates.push(`business_impact_description = $${paramCount++}`);
        values.push(sectionData.businessImpactDescription);
      }
      if (sectionData.businessImpactAffectedCountries !== undefined) {
        updates.push(`business_impact_affected_countries = $${paramCount++}`);
        values.push(JSON.stringify(sectionData.businessImpactAffectedCountries));
      }
      if (sectionData.businessImpactRegulatoryReporting !== undefined) {
        updates.push(`business_impact_regulatory_reporting = $${paramCount++}`);
        values.push(sectionData.businessImpactRegulatoryReporting);
      }
      if (sectionData.businessImpactRegulatoryEntity !== undefined) {
        updates.push(`business_impact_regulatory_entity = $${paramCount++}`);
        values.push(sectionData.businessImpactRegulatoryEntity);
      }
    } else if (section === 'mitigation') {
      updates.push(`mitigation_description = $${paramCount++}`);
      values.push(sectionData.mitigationDescription);
    } else if (section === 'causal_analysis') {
      updates.push(`causal_analysis = $${paramCount++}`);
      values.push(JSON.stringify(sectionData.causalAnalysis));
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(postmortemId);

    const updateQuery = `
      UPDATE postmortems
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, values);
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
    };

    const duration = Date.now() - startTime;
    console.log('[DEBUG] Section generation completed successfully in', duration, 'ms');
    
    return res.json({ section, postmortem });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[ERROR] Section generation failed after', duration, 'ms');
    console.error('[ERROR] Error details:', error);
    console.error('[ERROR] Error stack:', error.stack);
    
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate section', details: error.message });
    }
  }
});

// Helper functions
function buildBusinessImpactPrompt(incident) {
  const services = incident.services || [];
  
  return `You are an expert Site Reliability Engineer writing the Business Impact section of a postmortem. Generate ONLY the business impact details based on the following incident data:

**Incident Details:**
- Incident Number: ${incident.incident_number}
- Title: ${incident.title}
- Description: ${incident.description}
- Severity: ${incident.severity}
- Started: ${incident.detected_at}
- Resolved: ${incident.resolved_at || 'Not yet resolved'}
- Duration: ${calculateDuration(incident.detected_at, incident.resolved_at)}

**Affected Services:**
${services.map(s => `- ${s.serviceName} (Team: ${s.teamName})`).join('\n') || 'None specified'}

**Context:**
- Impact: ${incident.impact || 'Unknown'}

Generate the business impact section with this EXACT format:

Application: <name of the affected application or service>
Start Time: ${incident.detected_at}
End Time: ${incident.resolved_at || incident.detected_at}
Description: <A detailed 2-3 paragraph description of which specific functionalities were not available for end customers/consumers. Explain what users could not do, which features were broken, and the scope of the impact.>
Affected Countries: ["US", "UK", "DE"]
Regulatory Reporting: false
Regulatory Entity: N/A

IMPORTANT:
- Application field is REQUIRED - use the service name from affected services or derive from incident title
- Description MUST be detailed (2-3 paragraphs minimum)
- Use actual ISO timestamps for Start Time and End Time
- Affected Countries should be a valid JSON array
- Be specific about user impact, not just technical details`;
}

function buildMitigationPrompt(incident) {
  const timelineEvents = incident.timeline_events || [];
  
  // Summarize timeline if too long
  let timelineSummary;
  if (timelineEvents.length > 50) {
    const keyEvents = timelineEvents.slice(0, 20).concat(timelineEvents.slice(-20));
    timelineSummary = `${keyEvents.map(e => `- ${e.createdAt}: [${e.type}] ${e.description}`).join('\n')}
... (${timelineEvents.length - 40} additional events omitted for brevity)`;
  } else {
    timelineSummary = timelineEvents.map(e => `- ${e.createdAt}: [${e.type}] ${e.description} (by ${e.userName})`).join('\n') || 'No timeline events recorded';
  }
  
  return `You are an expert Site Reliability Engineer writing the Mitigation section of a postmortem. 
  
You know that for mitigation it is important to focus on the actions taken to contain and resolve the incident and minimize customer impact. Time is of the essence, therefore you evaluate the timeline of events, anything taking more than 30 minutes should be questioned. 

Some recommended questions to guide your analysis:
- In case of a recent deployment, did you prepare a rollback plan before deploying?
- In case of a sudden failure: 
    - where you alerted about the failure? If not, why not and how could monitoring/alerting be improved to catch similar issues faster in the future?
    - was it clear what was needed to resolove the incident? If not, what were the blockers to understanding the issue and how could that be improved for next time?
    - where there any resilience measures that could have been applied to reduce the blast radius? (circuit breakers, fallbacks, rate limiting, etc.)
    - were there runbooks or documented procedures that could have been followed to reduce time to mitigation?
    - in case of an internal component failure, question about the LCM of this component. How is that done?
- Are there any best practices or patterns that could have been applied to mitigate faster? (e.g. better runbooks, more automation, improved monitoring/alerting, etc.)

Generate ONLY the mitigation description based on the following incident data:

**Incident Details:**
- Title: ${incident.title}
- Severity: ${incident.severity}
- Duration: ${calculateDuration(incident.detected_at, incident.resolved_at)}

**Timeline of Events:**
${timelineSummary}

**Resolution Context:**
- Steps to Resolve: ${incident.steps_to_resolve || 'Not documented'}

Generate a detailed mitigation description (2-4 paragraphs) that explains:
- What immediate actions were taken to contain or resolve the incident
- What are your concern about the mitigation process (e.g. was it too slow, were there any missteps, was the wrong approach taken)
- What improvements could be made to the mitigation process (e.g. better runbooks, more automation, improved monitoring/alerting)
- What resilience patterns were applied (circuit breakers, fallbacks, rate limiting, etc.)
- Key decisions made and their rationale
- How the incident was brought under control
- Timeline of mitigation steps

Be specific and technical. Focus on actions taken, not just what happened. Return ONLY the mitigation description text, no headers or formatting.`;
}

function buildCausalAnalysisPrompt(incident) {
  const timelineEvents = incident.timeline_events || [];
  const services = incident.services || [];
  
  // Summarize timeline for causal analysis
  let timelineSummary;
  if (timelineEvents.length > 30) {
    const keyEvents = timelineEvents.slice(0, 15).concat(timelineEvents.slice(-15));
    timelineSummary = `${keyEvents.map(e => `- ${e.createdAt}: [${e.type}] ${e.description}`).join('\n')}
... (${timelineEvents.length - 30} additional events omitted)`;
  } else {
    timelineSummary = timelineEvents.map(e => `- ${e.createdAt}: [${e.type}] ${e.description}`).join('\n') || 'No timeline events recorded';
  }
  
  return `You are an expert Site Reliability Engineer performing systemic causal analysis using the Swiss cheese model. Generate ONLY the causal analysis based on the following incident data:

**Incident Details:**
- Title: ${incident.title}
- Description: ${incident.description}
- Severity: ${incident.severity}

**Affected Services:**
${services.map(s => `- ${s.serviceName} (Team: ${s.teamName})`).join('\n') || 'None specified'}

**Timeline Summary:**
${timelineSummary}

**Root Cause Context:**
- Problem Statement: ${incident.problem_statement || 'Not documented'}
- Causes: ${incident.causes || 'Under investigation'}

Generate a systemic causal analysis using the Swiss cheese model. You MUST generate at least 3-6 causal analysis items per group (mitigation and prevention), try to cover multiple layers of the model. Group the causal analysis into the following categories:
- Mitigation: these are recommendations related to the layers 'operate' and 'response'
- Prevention: these are recommendations related to the layers 'define', 'design', 'build', and 'deploy'

For each causal analysis item, provide:
- A clear description of the issue or gap identified
- The layer of the Swiss cheese model it relates to (define, design, build, test, deploy, operate, response)
- Specific recommendations for how to address it

Use the guidance below to identify potential holes in each layer:

**Interception Layer Guidance:**

### define
This layer covers all business related steps. Clear requirements, well defined boundaries and the agreement that all involved parties have a clear understanding of these requirements and how these can be translated into design and test cases.  

#### Engineering principles to consider:
-   Requirements should be clear, concise, and free of ambiguity
-   Define what needs to be delivered and the boundaries of the requirements, what should not happen?
-   Involve all relevant stakeholders in defining requirements
-   Define both functional and non-functional requirements
-   Define acceptance criteria to ensure requirements are met
-   Identify and document dependencies early in the process
-   Ensure requirements are testable and measurable
-   Regularly review and update requirements as needed to reflect changing business needs
-   Prioritize requirements based on business value and risk
-   Ensure that requirements are feasible and achievable within the project constraints
-   Communicate requirements effectively to all team members and stakeholders

#### Sample questions (not needed to use them all always, pick the ones that are relevant) :
-	Are the boundaries of the requirements clear?
-	Have the requirements been communicated properly?
-	Have all relevant stakeholders been involved in defining the requirements?
-	Have dependencies been identified and documented?
-	Are acceptance criteria defined and agreed upon?



### design
This layer covers all architecture related steps. For example the design of a specific application, but also the design of the infra landscape, the tools available, the frameworks available, the strictness of your systems (both too strict or not strict enough), etc. These decisions should be covered in the well architected framework.

#### Engineering principles to consider:
-   Follow established architectural principles and patterns
-   Ensure the design aligns with business and non-functional requirements
-   Ensure the design is fault tolerant and resilient to failures, auto-healing where possible
-   Design for scalability, reliability, and maintainability
-   Incorporate security best practices into the design
-   Use design reviews and peer feedback to validate the design
-   Ensure the design is modular and promotes separation of concerns
-   Consider the operational aspects of the design, including monitoring, alerting and 2nd day operations
-   Document the design decisions and rationale for future reference
-   Validate the design through prototyping or proof of concepts when necessary
-   Regularly review and update the design to address emerging technologies and changing requirements

#### Sample questions:
-	Does the design follow [WAF] best practices? 
-	Are there any flaws in the design that contributed to the impact (e.g. no input validation)
-	Can the design be tested properly?
-	Is the design in line with the business requirements (e.g. response should be within 2 secs)
-	Is the design in line with the non functional requirements?
-	Is the design future proof and adaptable to changing requirements?



### build
This layer covers all actions and procedures within the squads / sprints. It translates the design into working software, if needed refactoring of existing software, writing tests. If during this process difficulties are encountered it’s valid to challenge design or requirements to improve them. It’s unlikely that define and design will be first time right. Some guidance can be taken from existing software quality models like ISO25010 or FURPS.

####  ISO/IEC 25010 (Software Quality Model)
| Characteristic | Description |
|----------------|-------------|
| 1. Functional Suitability | How well the software meets stated needs.<br>Includes: <br>• Functional completeness <br>• Functional correctness <br>• Functional appropriateness |
| 2. Performance Efficiency | Resource usage and response times.<br>Includes: <br>• Time behavior <br>• Resource utilization <br>• Capacity |
| 3. Compatibility | Ability to work with other systems.<br>Includes: <br>• Co-existence <br>• Interoperability |
| 4. Usability | Ease of use and user experience.<br>Includes: <br>• Learnability <br>• Operability <br>• User error protection <br>• User interface aesthetics <br>• Accessibility |
| 5. Reliability | Ability to perform under conditions.<br>Includes: <br>• Maturity <br>• Availability <br>• Fault tolerance <br>• Recoverability |
| 6. Security | Protection against threats.<br>Includes: <br>• Confidentiality <br>• Integrity <br>• Non-repudiation <br>• Accountability <br>• Authenticity |
| 7. Maintainability | Ease of modification.<br>Includes: <br>• Modularity <br>• Reusability <br>• Analyzability <br>• Modifiability <br>• Testability |
| 8. Portability | Ability to be transferred to other environments.<br>Includes: <br>• Adaptability <br>• Installability <br>• Replaceability |


#### Engineering principles to consider:
-   Follow established best practices for resilience, security, and software development
-   Use static code analysis tools to identify potential issues
-   Implement designs properly while maintaining code quality and maintainability
-   Using least power principle
-   Create software that is built for testing and observability
-   For every release update the documentation accordingly
-   Ensure business requirements are properly implemented in code
-   Challenge design and requirements when implementation reveals issues
-   Refactor code as needed to improve quality and maintainability
-   Provide feedback to improve upstream processes
-   Implement sufficient validation processes including peer review
-   Be strict in validation, the more pain you take now, the less pain you have later
-   Maximize automation in build, test, and deployment processes
-   Continuously monitor and improve the build process to reduce friction and increase efficiency
-   Limit manual steps in the build process to reduce the risk of human error

#### Sample questions:
-	Does the team follow best practices regarding resilience, security and software development?
-	Is the design properly implemented?
-	Have the business requirements been taken into account with the implementation?
-	Have the design and requirements been challenged enough?
-	Is the LCM and capacity management up to par? 
-	Is the software build for testing? 
-	Are there enough validations in the process like peer-review?
-	Is there enough automation in the process?
-	Are build failures and regressions addressed promptly and transparently?
-	Are feature toggles or other mechanisms used to manage incomplete features?


### test
This layer covers all actions related to testing. There is an overlap with the previous Build layer where testing is also part of as “is software build in such a way that it can be tested”. This is a deep dive into the testing practices within the team, but also external tests (e.g. PenTests) being executed

#### Engineering principles to consider:
-   Implement a comprehensive testing strategy that includes unit, integration, system, and acceptance testing
-   Ensure test cases cover both functional and non-functional requirements
-   Incorporate exploratory testing to uncover issues that may not be captured by scripted test cases
-   Ensure that testing includes edge cases and negative scenarios to identify potential failure points
-   Use automated testing tools to increase efficiency and coverage
-   Use metrics and analytics to measure the effectiveness of the testing process and identify areas for improvement
-   Foster a culture of quality within the team, emphasizing the importance of testing and quality assurance
-   Leverage continuous integration and continuous deployment (CI/CD) pipelines to automate testing and deployment processes
-   Maintain a separate test environment that closely mirrors production for replaying production issues
-   Test as much of your basic functionality as possible on your local machine or non-prod environment
-   Involve testers early in the development process to identify potential issues
-   Regularly review and update test cases to reflect changes in requirements and design
-   Track and manage defects effectively to ensure timely resolution
-   Conduct performance and load testing to validate system behavior under stress
-   Ensure security testing is part of the overall testing strategy
-   Use code coverage metrics to identify untested areas of the codebase
-   Incorporate user feedback into acceptance testing to ensure the system meets user needs
-   Encourage collaboration between developers, testers, and other stakeholders to improve the overall quality of the software
-   Use version control to manage test cases and maintain a history of changes
-   Regularly conduct retrospectives to identify areas for improvement in the testing process
-   Ensure that testing practices are aligned with industry standards and best practices
-   Validate that test-case are in line with the requirements and design
  
#### Sample questions:
-	Does the data reflect the business requirements?
-	Are best practices regarding testing used?
-	Have all scenarios been tested?
-	Have proper testing practices been used in non-prod to mimick production scenarios?
-	Can the change be tested in non-prod?
-	Are performance and load tests conducted ?


### release
This layer covers all packaging, sign off activities etc. Change management is also covered in this step for example. How big is the release, how is it reviewed, how is it described in the change record, etc.

#### Engineering principles to consider:
-   Follow established change management processes and procedures
-   Changes are peer-reviewed by external teams to ensure independence and approved by relevant stakeholders
-   Changes are homogeneous and clearly described with a single change type
-   Use a standardized change request template to capture all necessary information
-   Clearly define the scope and objectives of the change
-   Assess the potential impact and risks associated with the change and how you mitigate them
-   Develop a comprehensive test plan, deployment strategy and rollback strategy
-   Schedule changes during appropriate windows to minimize impact on users, but have enough time to validate the change
-   Communicate changes effectively to all affected parties before and after implementation
-   Understand how to validate the change in production and make sure release strategy is in line with the risk of the change
-   Monitor the system closely after the change to detect and address any issues promptly
-   Document the change thoroughly, including any lessons learned for future reference
-   Ensure that changes are aligned with business priorities and objectives
-   Use automation tools to streamline the change management process where possible
-   Ensure compliance with regulatory and organizational policies related to change management
-   Regularly review and update change management processes to reflect best practices and lessons learned

#### Sample questions:
-	Has the change been peer reviewed?
-	Has the change been approved by relevant stakeholders?
-	Is the change homogeneous? In other words is this change only doing an update of software or a decommisioning of endpoints. Especially decommissioning is something that needs to be done without any other changes to not impact rollback options. The full change should be described by 1 change type. Is the change type set correctly?
-	Is the change properly described
-	Are test plan and rollback strategy properly described and do they reflect reality?
-	Have all situational circumstance been taken into account (e.g. DR activities, change freeze, release windows, high care periods)
-	Have all best practices been followed?
-	Is it clear what has been tested and what could not been tested and do you align the release strategy on these uncertainties? Typically production data is hard to replicate on non-prod resulting in other resource usage (cpu, memory) compared to non-prod. 
-	Is it clear what deploy strategy will be used and why?
-	Is there a communication plan for informing stakeholders before and after release?
-	Are monitoring and alerting in place to detect issues? (Example : Observability L2 complaint ?)
-	Does the change need to be executed within a specific timeframe or can it take multiple days?



### deploy
This layer covers all aspects of bringing a release to production. What strategy is used, what validations are used, what technique is used for deployment, etc. 

#### Engineering principles to consider:
-   Have a fully automated deployment process to minimize human error
-   Do changes to your interface, e.g. API changes,tooling, or database changes in isolation to minimize risk and maximize rollback options
-   Use of deployment strategies that minimize user impact and cover the risk of the deployment (e.g., canary, blue-green)
-   Make sure mitigation measures are in place before deployment (e.g., feature toggles, circuit breakers)
-   Intermediate checks are in place to validate the deployment against production data.
-   Implement comprehensive monitoring and alerting to detect issues early
-   Make sure you know how to validate the deployment (e.g., smoke tests, canary analysis) at every stage of the deployment
-   Ensure rollback procedures are well-defined, known and tested
-   Communicate deployment plans and status to all relevant stakeholders
-   Conduct post-deployment reviews to identify areas for improvement
-   Ensure deployments are scheduled during appropriate windows to minimize impact on users ( this is not always during low traffic periodes, sometimes it’s better to do it during high traffic periods to validate the system under load)
-   Document deployment procedures and lessons learned for future reference
-   Ensure compliance with regulatory and organizational policies related to deployment (e.g. release windows, change freeze periods)
-   Regularly review and update deployment processes to reflect best practices and lessons learned

#### Sample questions:
-	Was the deployment properly executed?
-	Was the deployment properly monitored?
-	Was the deployment properly validated?
-	Where best practices used?
-	Was the chosen deployment strategy in line with the risk of the deployment? 


### 7. operate
This layer covers all aspects of running the applications in production e.g. standby practices, migrations, DR activities, etc. It includes day-to-day operations, monitoring, incident response, capacity management, DR and ensuring service continuity. The goal is to ensure that systems are stable, observable, secure, and resilient under real-world conditions.

#### Engineering principles to consider:
-   System is auto healing where possible
-   If possible have a degraded mode to limit user impact
-   Capacity is managed proactively to prevent resource exhaustion
-   Regularly review and update operational procedures to reflect changes in the system and best practices
-   Ensure operational readiness through thorough testing and validation before deployment
-   Implement robust monitoring and alerting to detect and respond to issues promptly
-   Foster a culture of continuous improvement in operational practices
-   Ensure clear communication and collaboration between development and operations teams
-   Conduct regular training and drills to prepare teams for incident response
-   Use automation to streamline operational tasks and reduce the risk of human error
-   Maintain comprehensive documentation of operational procedures and system architecture
-   Implement security best practices to protect systems and data
-   Regularly review and update disaster recovery and business continuity plans
-   Use metrics and analytics to measure operational performance and identify areas for improvement
-   Encourage feedback from users and stakeholders to improve operational practices
-   Ensure compliance with regulatory and organizational policies related to operations
-   Validate that operational practices are aligned with industry standards and best practices
-   Ensure that operational practices are regularly reviewed and updated to reflect changes in the system architecture and business requirements
-   Validate that operational practices cover both functional and non-functional requirements
-   Incorporate feedback from incident reviews to improve operational practices and resilience strategies
-   Ensure that operational practices are designed to support scalability and flexibility as the system evolves

#### Sample questions:
-	Standby/on-call practices/runbooks/documentation
-	Operational readiness
-	Resilience patterns failed or worked?
-	Capacity management
-	Tooling and automation


### 8. response
This layer covers all mitigation actions and resolution actions needed to solve impact. 

#### Engineering principles to consider:
-   Focus on mitigation to minimize user impact before working on a permanent fix
-   Communicate proactively with stakeholders to manage expectations
-   Document steps taken during the incident for future reference
-   Document decision-making processes to improve future responses
-   Rapidly identify and mitigate the impact of incidents to minimize user disruption
-   Maintain clear and timely communication with all stakeholders during incidents
-   Use well-prepared response procedures and tools to streamline incident resolution
-   Coordinate response efforts across teams and organizations effectively
-   Conduct thorough post-incident reviews to identify improvement opportunities
-   Implement feedback loops to enhance response capabilities over time
-   Share lessons learned across teams to improve organizational response maturity
-   Ensure response procedures are regularly reviewed and updated to reflect best practices
-   Train teams on incident response protocols and tools to ensure preparedness
-   Foster a culture of continuous improvement in incident response processes
-   Use metrics and analytics to measure the effectiveness of incident response and identify areas for improvement

#### Sample questions:
-	Have best practices been used?
-	Was the communication and decision making up to par?
-	Was the response well prepared (e.g. helm rollback) 
-	Was there enough focus on mitigation over fixing?
-	Was the blast radius of the issue quickly identified and contained?
-	Was the user impact minimized as quickly as possible, i.e. focus on mitigation over solving?
-	Was the response time within acceptable thresholds?
-	How did the communication go, i.e. contacting other teams, escalating priority ? 


Format as a valid JSON array with this EXACT structure:
[
  {
    "interceptionLayer": "operate",
    "cause": "Alerting gaps",
    "subCause": "Missing alerts for key metrics",
    "description": "Brief explanation of this specific failure",
    "actionItems": [
      {
        "description": "Specific action to address this cause",
        "priority": "high"
      }
    ]
  }
]

Valid interceptionLayer values: define, design, build, test, release, deploy, operate, response
Valid priority values: high, medium, low

IMPORTANT:
- Generate 2-4 distinct causal analysis items covering different interception layers
- Each item MUST have 1-3 action items
- Action items should be specific and actionable
- The JSON must be valid and parseable
- Focus on systemic failures, not just immediate technical causes

Return ONLY the JSON array, no other text or formatting.`;
}

function parseBusinessImpact(content, incident) {
  const sections = {
    businessImpactApplication: null,
    businessImpactStart: null,
    businessImpactEnd: null,
    businessImpactDuration: null,
    businessImpactDescription: null,
    businessImpactAffectedCountries: [],
    businessImpactRegulatoryReporting: false,
    businessImpactRegulatoryEntity: null,
  };

  const appMatch = content.match(/Application:\s*(.+?)(?=\n|$)/i);
  if (appMatch) {
    sections.businessImpactApplication = appMatch[1].trim();
  } else if (incident.services && incident.services.length > 0) {
    sections.businessImpactApplication = incident.services[0].serviceName;
  } else {
    sections.businessImpactApplication = incident.title || 'Unknown Application';
  }
  
  const startMatch = content.match(/Start Time:\s*(.+?)(?=\n|$)/i);
  if (startMatch) {
    try {
      sections.businessImpactStart = new Date(startMatch[1].trim()).toISOString();
    } catch (e) {
      sections.businessImpactStart = incident.detected_at;
    }
  } else {
    sections.businessImpactStart = incident.detected_at;
  }
  
  const endMatch = content.match(/End Time:\s*(.+?)(?=\n|$)/i);
  if (endMatch) {
    try {
      sections.businessImpactEnd = new Date(endMatch[1].trim()).toISOString();
    } catch (e) {
      sections.businessImpactEnd = incident.resolved_at;
    }
  } else {
    sections.businessImpactEnd = incident.resolved_at;
  }
  
  if (sections.businessImpactStart && sections.businessImpactEnd) {
    const start = new Date(sections.businessImpactStart);
    const end = new Date(sections.businessImpactEnd);
    sections.businessImpactDuration = Math.floor((end.getTime() - start.getTime()) / 60000);
  }
  
  const descMatch = content.match(/Description:\s*([\s\S]*?)(?=\nApplication:|Start Time:|End Time:|Affected Countries:|Regulatory Reporting:|Regulatory Entity:|$)/i);
  if (descMatch) {
    sections.businessImpactDescription = descMatch[1].trim();
  }
  
  const countriesMatch = content.match(/Affected Countries:\s*(\[[\s\S]*?\])/i);
  if (countriesMatch) {
    try {
      sections.businessImpactAffectedCountries = JSON.parse(countriesMatch[1]);
    } catch (e) {
      sections.businessImpactAffectedCountries = [];
    }
  }
  
  const regReportingMatch = content.match(/Regulatory Reporting:\s*(true|false)/i);
  if (regReportingMatch) {
    sections.businessImpactRegulatoryReporting = regReportingMatch[1].toLowerCase() === 'true';
  }
  
  const regEntityMatch = content.match(/Regulatory Entity:\s*(.+?)(?=\n|$)/i);
  if (regEntityMatch && sections.businessImpactRegulatoryReporting) {
    const entity = regEntityMatch[1].trim().replace(/^["']|["']$/g, '');
    if (entity && entity.toLowerCase() !== 'n/a') {
      sections.businessImpactRegulatoryEntity = entity;
    }
  }

  return sections;
}

function parseCausalAnalysis(content) {
  let causalText = content.trim();
  
  try {
    // Remove markdown code blocks if present
    causalText = causalText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Try to find JSON array
    const jsonMatch = causalText.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (jsonMatch) {
      const causalAnalysis = JSON.parse(jsonMatch[0]);
      return {
        causalAnalysis: causalAnalysis.filter(item =>
          item.interceptionLayer && item.cause && item.description
        )
      };
    }
  } catch (e) {
    console.error('Failed to parse causal analysis JSON:', e);
  }
  
  return { causalAnalysis: [] };
}

// Helper functions
function buildPostmortemPrompt(incident) {
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
${services.map(s => `- ${s.serviceName} (Team: ${s.teamName})`).join('\n') || 'None specified'}

**Timeline of Events:**
${timelineEvents.map(e => `- ${e.createdAt}: [${e.type}] ${e.description} (by ${e.userName})`).join('\n') || 'No timeline events recorded'}

**Additional Context:**
- Problem Statement: ${incident.problem_statement || 'Not documented'}
- Impact: ${incident.impact || 'Unknown'}
- Causes: ${incident.causes || 'Under investigation'}
- Steps to Resolve: ${incident.steps_to_resolve || 'Not documented'}

CRITICAL: You must generate ALL sections below with the EXACT format specified. Do not skip any section.

[BUSINESS_IMPACT]
You MUST provide each field on its own line in this exact format:
Application: <name of the affected application or service>
Start Time: ${incident.detected_at}
End Time: ${incident.resolved_at || incident.detected_at}
Description: <A detailed multi-line description of which specific functionalities were not available for end customers/consumers. Explain what users could not do, which features were broken, and the scope of the impact.>
Affected Countries: ["US", "UK", "DE"]
Regulatory Reporting: false
Regulatory Entity: N/A

IMPORTANT:
- Application field is REQUIRED - use the service name from affected services or derive from incident title
- Description MUST be detailed and can span multiple lines
- Use actual ISO timestamps for Start Time and End Time
- Affected Countries should be a valid JSON array

[MITIGATION]
Describe all actions, resilience patterns, or decisions that were taken to mitigate the incident. Be specific about what was done and why. This should be a detailed narrative explaining:
- What immediate actions were taken
- What resilience patterns were applied
- What decisions were made and their rationale
- How the incident was brought under control

[CAUSAL_ANALYSIS]
Provide a systemic causal analysis using the Swiss cheese model. You MUST generate at least 2-4 causal analysis items.

**Interception Layer Guidance:**
- **define**: Failures in requirements, specifications, or initial design decisions. Ask: Were requirements clear? Was the system properly scoped?
- **design**: Architectural or design flaws. Ask: Was the design resilient? Were dependencies considered? Was scalability planned?
- **build**: Implementation bugs, code quality issues. Ask: Were coding best practices followed? Was error handling adequate?
- **test**: Testing gaps, missed scenarios. Ask: Was test coverage sufficient? Were edge cases tested? Was load testing done?
- **release**: Release process failures, approval gaps. Ask: Were release checklists followed? Was the rollback plan tested?
- **deploy**: Deployment errors, configuration issues. Ask: Was the deployment automated? Were configs validated? Was monitoring enabled?
- **operate**: Monitoring, alerting, or operational gaps. Ask: Were alerts configured? Was the dashboard comprehensive? Were runbooks available?
- **response**: Incident detection and response delays. Ask: Was the incident detected quickly? Was escalation clear? Were responders trained?

Format as a valid JSON array with this EXACT structure:
[
  {
    "interceptionLayer": "operate",
    "cause": "Alerting gaps",
    "subCause": "Missing alerts for key metrics",
    "description": "Brief explanation of this specific failure",
    "actionItems": [
      {
        "description": "Specific action to address this cause",
        "priority": "high"
      }
    ]
  }
]

Valid interceptionLayer values: define, design, build, test, release, deploy, operate, response
Valid priority values: high, medium, low

IMPORTANT:
- Generate at least 2-4 distinct causal analysis items
- Each item MUST have at least 1-3 action items
- Action items should be specific and actionable
- The JSON must be valid and parseable

Be professional, factual, and constructive. Focus on learning and improvement rather than blame.`;
}

function calculateDuration(start, end) {
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

function parsePostmortemSections(content, incident) {
  const sections = {
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
    actionItems: [],
  };

  // Extract Business Impact
  const businessImpactMatch = content.match(/\[BUSINESS_IMPACT\]([\s\S]*?)(?=\[|$)/);
  if (businessImpactMatch) {
    const impactText = businessImpactMatch[1].trim();
    
    const appMatch = impactText.match(/Application:\s*(.+?)(?=\n|$)/i);
    if (appMatch) {
      sections.businessImpactApplication = appMatch[1].trim();
    } else if (incident.services && incident.services.length > 0) {
      sections.businessImpactApplication = incident.services[0].serviceName;
    } else {
      sections.businessImpactApplication = incident.title || 'Unknown Application';
    }
    
    const startMatch = impactText.match(/Start Time:\s*(.+?)(?=\n|$)/i);
    if (startMatch) {
      try {
        sections.businessImpactStart = new Date(startMatch[1].trim()).toISOString();
      } catch (e) {
        sections.businessImpactStart = incident.detected_at;
      }
    } else {
      sections.businessImpactStart = incident.detected_at;
    }
    
    const endMatch = impactText.match(/End Time:\s*(.+?)(?=\n|$)/i);
    if (endMatch) {
      try {
        sections.businessImpactEnd = new Date(endMatch[1].trim()).toISOString();
      } catch (e) {
        sections.businessImpactEnd = incident.resolved_at;
      }
    } else {
      sections.businessImpactEnd = incident.resolved_at;
    }
    
    if (sections.businessImpactStart && sections.businessImpactEnd) {
      const start = new Date(sections.businessImpactStart);
      const end = new Date(sections.businessImpactEnd);
      sections.businessImpactDuration = Math.floor((end.getTime() - start.getTime()) / 60000);
    }
    
    const descMatch = impactText.match(/Description:\s*([\s\S]*?)(?=\nApplication:|Start Time:|End Time:|Affected Countries:|Regulatory Reporting:|Regulatory Entity:|\[|$)/i);
    if (descMatch) {
      sections.businessImpactDescription = descMatch[1].trim();
    }
    
    const countriesMatch = impactText.match(/Affected Countries:\s*(\[[\s\S]*?\])/i);
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
    
    const regEntityMatch = impactText.match(/Regulatory Entity:\s*(.+?)(?=\n|$)/i);
    if (regEntityMatch && sections.businessImpactRegulatoryReporting) {
      const entity = regEntityMatch[1].trim().replace(/^["']|["']$/g, '');
      if (entity && entity.toLowerCase() !== 'n/a') {
        sections.businessImpactRegulatoryEntity = entity;
      }
    }
  }

  // Extract Mitigation
  const mitigationMatch = content.match(/\[MITIGATION\]([\s\S]*?)(?=\[|$)/);
  if (mitigationMatch) {
    sections.mitigationDescription = mitigationMatch[1].trim();
  }

  // Extract Causal Analysis
  const causalMatch = content.match(/\[CAUSAL_ANALYSIS\]([\s\S]*?)(?=\[|$)/);
  if (causalMatch) {
    let causalText = causalMatch[1].trim();
    
    try {
      causalText = causalText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      const jsonMatch = causalText.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) {
        sections.causalAnalysis = JSON.parse(jsonMatch[0]);
        sections.causalAnalysis = sections.causalAnalysis.filter(item => 
          item.interceptionLayer && item.cause && item.description
        );
      }
    } catch (e) {
      console.error('Failed to parse causal analysis JSON:', e);
      sections.causalAnalysis = [];
    }
  }

  return sections;
}

function buildQualityCheckPrompt(postmortem) {
  return `You are an expert SRE reviewing a postmortem document based on the Swiss cheese model methodology. Analyze the following postmortem for completeness, clarity, and quality. Provide specific, actionable feedback.

**Postmortem Content:**

**Business Impact:**
- Application: ${postmortem.businessImpactApplication || '(Empty)'}
- Start Time: ${postmortem.businessImpactStart || '(Empty)'}
- End Time: ${postmortem.businessImpactEnd || '(Empty)'}
- Duration: ${postmortem.businessImpactDuration ? `${postmortem.businessImpactDuration} minutes` : '(Empty)'}
- Description: ${postmortem.businessImpactDescription || '(Empty)'}
- Affected Countries: ${JSON.stringify(postmortem.businessImpactAffectedCountries || [])}
- Regulatory Reporting: ${postmortem.businessImpactRegulatoryReporting ? 'Yes' : 'No'}
- Regulatory Entity: ${postmortem.businessImpactRegulatoryEntity || 'N/A'}

**Mitigation:**
${postmortem.mitigationDescription || '(Empty)'}

**Causal Analysis (Swiss Cheese Model):**
${postmortem.causalAnalysis && postmortem.causalAnalysis.length > 0
  ? JSON.stringify(postmortem.causalAnalysis, null, 2)
  : '(Empty)'}

---

Please provide a structured quality assessment with the following format:

**Overall Quality Score:** [Rate 1-10]

**Strengths:**
- [List what's done well]

**Issues Found:**
- [List specific problems with severity: ✅ Good, ⚠️ Needs Improvement, ❌ Critical Issue]

**Specific Recommendations:**
- [Provide actionable suggestions for improvement]

Focus on:
1. Completeness (are all sections filled with sufficient detail?)
2. Clarity (is the writing clear and understandable?)
3. Business impact clarity (is it clear what users/customers experienced?)
4. Mitigation detail (are the actions taken well documented?)
5. Systemic analysis (does the causal analysis identify multiple layers of failure?)
6. Actionability (are action items specific, measurable, and assigned to appropriate layers?)
7. Learning value (does it provide insights for future prevention?)

Be constructive and specific. Flag sections with only 1-2 sentences as insufficient. Evaluate whether the Swiss cheese model is properly applied with multiple interception layers identified.`;
}

function buildCoachingPrompt(question, postmortem) {
  // Count total action items across all causal analysis entries
  const totalActionItems = postmortem.causalAnalysis?.reduce((sum, item) =>
    sum + (item.actionItems?.length || 0), 0) || 0;

  return `You are an expert SRE coach helping someone write a better postmortem using the Swiss cheese model methodology. Answer their question with practical, actionable guidance.

**User's Question:**
${question}

**Current Postmortem Context:**
This postmortem follows the Swiss cheese model approach with systemic causal analysis:
- Business Impact: ${postmortem.businessImpactDescription ? 'Written' : 'Empty'}
- Mitigation: ${postmortem.mitigationDescription ? 'Written' : 'Empty'}
- Causal Analysis: ${postmortem.causalAnalysis?.length || 0} interception layers identified
- Action Items: ${totalActionItems} items across all layers

**Postmortem Structure:**
The postmortem uses three main sections:
1. **Business Impact** - Documents what happened from users' or business perspective (service downtime, degraded performance, affected customers, revenue impact, etc.)
2. **Mitigation** - Describes actions, resilience patterns, or decisions taken to mitigate the incident
3. **Causal Analysis** - Uses Swiss cheese model to identify systemic failures across multiple interception layers (define, design, build, test, release, deploy, operate, response)

Provide a helpful, concise answer (2-4 paragraphs) that:
1. Directly addresses their question
2. Provides practical examples if relevant
3. References the Swiss cheese model and systemic thinking
4. Suggests how to apply this to their current postmortem
5. Emphasizes identifying multiple layers of failure rather than a single root cause

Be encouraging and educational. Help them understand that effective postmortems identify systemic issues across the software development lifecycle, not just immediate technical causes.`;
}

function buildExpansionPrompt(section, currentContent, postmortem) {
  const sectionNames = {
    businessImpactDescription: 'Business Impact Description',
    mitigationDescription: 'Mitigation Description',
  };

  const sectionGuidance = {
    businessImpactDescription: `Focus on:
- Which specific functionalities were unavailable for end customers/consumers
- What users could not do and which features were broken
- The scope and scale of the impact (number of users, geographic regions, business functions)
- Any revenue, compliance, or reputational impact`,
    mitigationDescription: `Focus on:
- Immediate actions taken to contain or resolve the incident
- Resilience patterns applied (circuit breakers, fallbacks, rate limiting, etc.)
- Key decisions made and their rationale
- How the incident was brought under control
- Timeline of mitigation steps`,
  };

  return `You are an expert SRE helping expand a postmortem section using the Swiss cheese model methodology. The user wants to expand the "${sectionNames[section] || section}" section.

**Current Content:**
${currentContent || '(Empty)'}

**Full Postmortem Context:**
- Incident: ${postmortem.incidentId || 'Unknown'}
- Application: ${postmortem.businessImpactApplication || 'Unknown'}
- Duration: ${postmortem.businessImpactDuration ? `${postmortem.businessImpactDuration} minutes` : 'Unknown'}

**Section Guidance:**
${sectionGuidance[section] || 'Provide more technical detail and specificity'}

Please expand this section with:
1. More technical detail and specificity
2. Relevant metrics or data points (if applicable)
3. Clear, professional language
4. 2-3 paragraphs of comprehensive content
5. Focus on systemic understanding rather than blame

Maintain the same tone and style as the original. Add substance without being verbose. Focus on providing value to future readers who want to learn from this incident and prevent similar issues.

Return only the expanded content, without any preamble or explanation.`;
}

module.exports = router;
