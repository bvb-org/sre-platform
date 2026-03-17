const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { createLogger } = require('../../utils/logger');

const logger = createLogger('BulkImport:DocumentParser');

/**
 * Extract text content from uploaded files (PDF, DOCX, or plain text).
 */
async function extractText(filePath, fileType) {
  logger.info(`Extracting text from ${filePath} (type: ${fileType})`);

  try {
    if (fileType === 'application/pdf' || filePath.endsWith('.pdf')) {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      logger.info(`PDF extracted: ${data.text.length} characters, ${data.numpages} pages`);
      return data.text;
    }

    if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileType === 'application/msword' ||
      filePath.endsWith('.docx') ||
      filePath.endsWith('.doc')
    ) {
      const result = await mammoth.extractRawText({ path: filePath });
      logger.info(`DOCX extracted: ${result.value.length} characters`);
      if (result.messages.length > 0) {
        logger.warn('DOCX extraction warnings:', result.messages);
      }
      return result.value;
    }

    // Fallback: read as plain text
    const text = fs.readFileSync(filePath, 'utf-8');
    logger.info(`Plain text read: ${text.length} characters`);
    return text;
  } catch (error) {
    logger.error(`Failed to extract text from ${filePath}:`, error);
    throw new Error(`Text extraction failed: ${error.message}`);
  }
}

module.exports = { extractText };
