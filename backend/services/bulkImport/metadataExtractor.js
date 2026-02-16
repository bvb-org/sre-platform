const pool = require('../../db');
const { getAIService } = require('../aiService');
const { createLogger } = require('../../utils/logger');

const logger = createLogger('BulkImport:MetadataExtractor');

const MAX_RETRIES = 2;
const INITIAL_MAX_TOKENS = 4096;

/**
 * Attempt to repair truncated JSON by closing open strings, arrays, and objects.
 * This is a best-effort fallback — not a full JSON parser.
 */
function repairTruncatedJson(jsonText) {
  let repaired = jsonText.trim();

  // If it doesn't start with '{', it's not salvageable
  if (!repaired.startsWith('{')) return null;

  // If already valid, return as-is
  try {
    return JSON.parse(repaired);
  } catch (_) {
    // continue with repair
  }

  // Remove any trailing comma
  repaired = repaired.replace(/,\s*$/, '');

  // Count open braces/brackets and close them
  let inString = false;
  let escaped = false;
  let openBraces = 0;
  let openBrackets = 0;
  let lastCharBeforeTruncation = '';

  for (let i = 0; i < repaired.length; i++) {
    const ch = repaired[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (ch === '{') openBraces++;
      else if (ch === '}') openBraces--;
      else if (ch === '[') openBrackets++;
      else if (ch === ']') openBrackets--;
    }
    lastCharBeforeTruncation = ch;
  }

  // Close unterminated string
  if (inString) {
    repaired += '"';
  }

  // Remove trailing key without value (e.g., `"someKey":` at the end)
  repaired = repaired.replace(/,?\s*"[^"]*"\s*:\s*$/, '');

  // Remove trailing comma after closing quote
  repaired = repaired.replace(/,\s*$/, '');

  // Close open brackets and braces
  for (let i = 0; i < openBrackets; i++) {
    repaired += ']';
  }
  for (let i = 0; i < openBraces; i++) {
    repaired += '}';
  }

  try {
    return JSON.parse(repaired);
  } catch (_) {
    return null;
  }
}

/**
 * Use AI to extract structured metadata from raw document text.
 * Returns an object with incident number, title, severity, dates, etc.
 */
async function extractMetadata(text, itemId) {
  logger.info(`Extracting metadata for item ${itemId}`);

  const aiService = getAIService();

  const prompt = `You are an expert at analyzing incident postmortem documents. Extract the following metadata from this document text. If you cannot find a field, set it to null.

DOCUMENT TEXT:
${text.substring(0, 15000)}

Extract and return a valid JSON object with these fields:
{
  "incidentNumber": "The incident number (e.g., INC-12345, INC0012345, etc.) - look for patterns like INC followed by numbers",
  "title": "A short descriptive title for the incident (max 200 chars)",
  "description": "A brief description of what happened (max 500 chars)",
  "severity": "One of: critical, high, medium, low - based on the impact described",
  "detectedAt": "ISO 8601 timestamp of when the incident was detected/started, or null",
  "resolvedAt": "ISO 8601 timestamp of when the incident was resolved, or null",
  "affectedService": "The primary service or application affected",
  "affectedCountries": ["Array of country codes affected, e.g. US, UK, DE"],
  "summary": "A 2-3 sentence summary of the entire postmortem",
  "hasActionItems": true,
  "actionItemCount": 0,
  "hasMitigationSteps": true,
  "hasBusinessImpact": true,
  "hasTimeline": true
}

IMPORTANT: Return ONLY the JSON object, no other text or markdown formatting. Keep string values concise to avoid truncation.`;

  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const maxTokens = INITIAL_MAX_TOKENS * (attempt + 1); // 4096, 8192, 12288

    try {
      const result = await aiService.generateCompletion(prompt, maxTokens);
      let jsonText = result.text.trim();
      const stopReason = result.stopReason || result.finishReason || 'unknown';

      logger.info(`AI response for item ${itemId} (attempt ${attempt + 1}):`, {
        rawLength: result.text.length,
        stopReason,
        outputTokens: result.usage?.outputTokens,
        maxTokens,
      });

      // Remove markdown code blocks if present
      jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

      // Check for truncation and retry if possible
      const isTruncated = stopReason === 'max_tokens' || stopReason === 'MAX_TOKENS' || stopReason === 'length';
      if (isTruncated && attempt < MAX_RETRIES) {
        logger.warn(`AI response truncated for item ${itemId} (stopReason: ${stopReason}, tokens: ${result.usage?.outputTokens}/${maxTokens}). Retrying with higher limit…`);
        continue;
      }

      // Try direct parse first
      let metadata;
      try {
        metadata = JSON.parse(jsonText);
      } catch (parseError) {
        // If truncated, attempt JSON repair
        if (isTruncated || !jsonText.endsWith('}')) {
          logger.warn(`JSON parse failed for item ${itemId}, attempting repair (truncated: ${isTruncated}, length: ${jsonText.length})`);
          metadata = repairTruncatedJson(jsonText);
          if (metadata) {
            logger.info(`JSON repair succeeded for item ${itemId}`);
          } else {
            throw parseError; // repair failed, throw original error
          }
        } else {
          throw parseError;
        }
      }

      // Persist metadata to DB
      await pool.query(
        `UPDATE bulk_import_items
         SET extracted_metadata = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [JSON.stringify(metadata), itemId]
      );

      logger.info(`Metadata extracted for item ${itemId}:`, {
        incidentNumber: metadata.incidentNumber,
        title: metadata.title,
        severity: metadata.severity,
      });

      return metadata;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES) {
        logger.warn(`Attempt ${attempt + 1} failed for item ${itemId}: ${error.message}. Retrying…`);
        continue;
      }
    }
  }

  // All retries exhausted
  logger.error(`Failed to extract metadata for item ${itemId} after ${MAX_RETRIES + 1} attempts:`, lastError);

  // Store partial metadata with error note
  await pool.query(
    `UPDATE bulk_import_items
     SET extracted_metadata = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [JSON.stringify({ error: lastError.message }), itemId]
  );

  throw new Error(`Metadata extraction failed: ${lastError.message}`);
}

module.exports = { extractMetadata };
