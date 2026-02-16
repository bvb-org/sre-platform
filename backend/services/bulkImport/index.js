const { processItem, resumeItem, updateItemStatus, updateSessionStatus, UPLOAD_DIR } = require('./importOrchestrator');
const { extractText } = require('./documentParser');
const { extractMetadata } = require('./metadataExtractor');
const { lookupServiceNow, createIncident } = require('./incidentCreator');
const { generatePostmortem } = require('./postmortemGenerator');

module.exports = {
  // Main orchestrator
  processItem,
  resumeItem,
  updateItemStatus,
  updateSessionStatus,
  UPLOAD_DIR,

  // Individual steps (for testing / advanced usage)
  extractText,
  extractMetadata,
  lookupServiceNow,
  createIncident,
  generatePostmortem,
};
