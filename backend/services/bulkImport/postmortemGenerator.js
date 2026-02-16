const pool = require('../../db');
const { getAIService } = require('../aiService');
const { createLogger } = require('../../utils/logger');
const crypto = require('crypto');

const logger = createLogger('BulkImport:PostmortemGenerator');

/**
 * Parse an ISO 8601 duration string (e.g. "PT21H17M", "P1DT2H30M") into total minutes.
 * Returns null if the input is not a valid duration string.
 */
function parseISO8601Duration(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  if (typeof value !== 'string') return null;

  const match = value.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!match) return null;

  const days = parseInt(match[1] || '0', 10);
  const hours = parseInt(match[2] || '0', 10);
  const minutes = parseInt(match[3] || '0', 10);
  // seconds ignored for integer-minute precision

  return days * 1440 + hours * 60 + minutes;
}

/**
 * Generate a full postmortem from extracted document text using AI.
 * Creates or updates the postmortem record in the database.
 *
 * Returns { postmortemId, needsInput, questions? }
 */
async function generatePostmortem(incidentId, extractedText, metadata, itemId, autoPublish) {
  logger.info(`Generating postmortem for incident ${incidentId}, item ${itemId}`);

  const aiService = getAIService();

  const prompt = `You are an expert Site Reliability Engineer. You are given the raw text of a postmortem document. Your job is to extract and structure all the information into our platform's postmortem format.

RAW POSTMORTEM DOCUMENT:
${extractedText.substring(0, 20000)}

KNOWN METADATA:
- Incident Number: ${metadata.incidentNumber || 'Unknown'}
- Title: ${metadata.title || 'Unknown'}
- Severity: ${metadata.severity || 'Unknown'}
- Detected At: ${metadata.detectedAt || 'Unknown'}
- Resolved At: ${metadata.resolvedAt || 'Unknown'}
- Affected Service: ${metadata.affectedService || 'Unknown'}

Generate a structured postmortem in the following JSON format. Extract as much information as possible from the document. If information is not available, use reasonable defaults or null.

{
  "businessImpact": {
    "application": "Name of the affected application/service",
    "startTime": "ISO 8601 timestamp or null",
    "endTime": "ISO 8601 timestamp or null",
    "duration": null,
    "description": "Detailed description of business impact – what users experienced, which features were unavailable, scope of impact. 2-3 paragraphs.",
    "affectedCountries": ["US", "UK"],
    "regulatoryReporting": false,
    "regulatoryEntity": null
  },
  "mitigation": {
    "description": "Detailed description of mitigation steps taken. What immediate actions were taken, what resilience patterns were applied, key decisions and rationale. 2-4 paragraphs."
  },
  "causalAnalysis": [
    {
      "interceptionLayer": "operate|response|design|build|test|release|deploy|define",
      "cause": "Short cause title",
      "subCause": "More specific sub-cause",
      "description": "Detailed description of this causal factor",
      "actionItems": [
        {
          "description": "Specific actionable item to address this cause",
          "priority": "high|medium|low"
        }
      ]
    }
  ],
  "missingFields": [
    {
      "field": "fieldName",
      "question": "What should we put for X? The document doesn't mention..."
    }
  ]
}

IMPORTANT:
- Generate at least 3-5 causal analysis items across different interception layers
- Each causal analysis item must have 1-3 action items
- The business impact description should be detailed (2-3 paragraphs minimum)
- The mitigation description should be detailed (2-4 paragraphs)
- If you cannot determine certain fields from the document, add them to missingFields
- Valid interceptionLayer values: define, design, build, test, release, deploy, operate, response
- Valid priority values: high, medium, low
- Return ONLY the JSON, no markdown formatting`;

  let postmortemData;
  let lastError;
  const maxRetries = 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const maxTokens = 8192 * (attempt + 1); // 8192, 16384, 24576

    const result = await aiService.generateCompletion(prompt, maxTokens);
    let jsonText = result.text.trim().replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const stopReason = result.stopReason || result.finishReason || 'unknown';

    logger.info(`AI postmortem response for item ${itemId} (attempt ${attempt + 1}):`, {
      rawLength: result.text.length,
      stopReason,
      outputTokens: result.usage?.outputTokens,
      maxTokens,
    });

    // Check for truncation and retry if possible
    const isTruncated = stopReason === 'max_tokens' || stopReason === 'MAX_TOKENS' || stopReason === 'length';
    if (isTruncated && attempt < maxRetries) {
      logger.warn(`AI postmortem response truncated for item ${itemId} (stopReason: ${stopReason}). Retrying with higher limit…`);
      continue;
    }

    try {
      postmortemData = JSON.parse(jsonText);
      break;
    } catch (parseError) {
      lastError = parseError;
      if (attempt < maxRetries) {
        logger.warn(`JSON parse failed for postmortem item ${itemId} (attempt ${attempt + 1}): ${parseError.message}. Retrying…`);
        continue;
      }
      logger.error(`Failed to parse postmortem JSON for item ${itemId} after ${maxRetries + 1} attempts:`, parseError);
      throw new Error(`Postmortem generation failed: ${parseError.message}`);
    }
  }

  // Calculate duration – parse ISO 8601 strings, fall back to start/end diff
  let duration = parseISO8601Duration(postmortemData.businessImpact.duration);
  if (duration == null && postmortemData.businessImpact.startTime && postmortemData.businessImpact.endTime) {
    try {
      const s = new Date(postmortemData.businessImpact.startTime);
      const e = new Date(postmortemData.businessImpact.endTime);
      const diff = Math.floor((e.getTime() - s.getTime()) / 60000);
      if (Number.isFinite(diff) && diff >= 0) duration = diff;
    } catch { /* ignore */ }
  }

  const status = autoPublish ? 'published' : 'draft';

  // Upsert postmortem
  const existing = await pool.query('SELECT id FROM postmortems WHERE incident_id = $1', [incidentId]);
  let postmortemId;

  if (existing.rows.length > 0) {
    postmortemId = existing.rows[0].id;
    await pool.query(
      `UPDATE postmortems
       SET business_impact_application = $1,
           business_impact_start       = $2,
           business_impact_end         = $3,
           business_impact_duration    = $4,
           business_impact_description = $5,
           business_impact_affected_countries   = $6,
           business_impact_regulatory_reporting = $7,
           business_impact_regulatory_entity    = $8,
           mitigation_description = $9,
           causal_analysis        = $10,
           action_items           = $11,
           status                 = $12,
           published_at = CASE WHEN $12::varchar = 'published' THEN CURRENT_TIMESTAMP ELSE published_at END,
           updated_at   = CURRENT_TIMESTAMP
       WHERE id = $13`,
      [
        postmortemData.businessImpact.application,
        postmortemData.businessImpact.startTime,
        postmortemData.businessImpact.endTime,
        duration,
        postmortemData.businessImpact.description,
        JSON.stringify(postmortemData.businessImpact.affectedCountries || []),
        postmortemData.businessImpact.regulatoryReporting || false,
        postmortemData.businessImpact.regulatoryEntity,
        postmortemData.mitigation.description,
        JSON.stringify(postmortemData.causalAnalysis || []),
        JSON.stringify([]),
        status,
        postmortemId,
      ]
    );
  } else {
    const userRow = await pool.query("SELECT id FROM users WHERE email = 'manager@example.com'");
    const userId = userRow.rows[0]?.id || null;

    const ins = await pool.query(
      `INSERT INTO postmortems (
        id, incident_id, status,
        business_impact_application, business_impact_start, business_impact_end,
        business_impact_duration, business_impact_description,
        business_impact_affected_countries, business_impact_regulatory_reporting,
        business_impact_regulatory_entity,
        mitigation_description, causal_analysis, action_items,
        created_by_id, published_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        CASE WHEN $2::varchar = 'published' THEN CURRENT_TIMESTAMP ELSE NULL END
      ) RETURNING id`,
      [
        incidentId, status,
        postmortemData.businessImpact.application,
        postmortemData.businessImpact.startTime,
        postmortemData.businessImpact.endTime,
        duration,
        postmortemData.businessImpact.description,
        JSON.stringify(postmortemData.businessImpact.affectedCountries || []),
        postmortemData.businessImpact.regulatoryReporting || false,
        postmortemData.businessImpact.regulatoryEntity,
        postmortemData.mitigation.description,
        JSON.stringify(postmortemData.causalAnalysis || []),
        JSON.stringify([]),
        userId,
      ]
    );
    postmortemId = ins.rows[0].id;
  }

  // Link import item → postmortem
  await pool.query(
    'UPDATE bulk_import_items SET postmortem_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [postmortemId, itemId]
  );

  // Handle missing fields → AI questions
  const missingFields = postmortemData.missingFields || [];
  if (missingFields.length > 0) {
    const questions = missingFields.map(f => ({
      id: crypto.randomUUID(),
      question: f.question,
      field: f.field,
      answered: false,
      answer: null,
    }));

    await pool.query(
      'UPDATE bulk_import_items SET ai_questions = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [JSON.stringify(questions), itemId]
    );

    const critical = ['incidentNumber', 'severity', 'detectedAt'];
    if (missingFields.some(f => critical.includes(f.field))) {
      return { postmortemId, needsInput: true, questions };
    }
  }

  return { postmortemId, needsInput: false };
}

module.exports = { generatePostmortem };
