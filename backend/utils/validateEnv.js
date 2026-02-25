/**
 * Environment variable validation utility
 * Validates required environment variables on startup
 */

const { createLogger } = require('./logger');
const logger = createLogger('EnvValidator');

/**
 * Validate environment variables
 * @param {Object} config - Configuration object with required and optional fields
 * @returns {boolean} - Returns true if validation passes
 */
function validateEnv(config = {}) {
  const { required = [], optional = [] } = config;
  const errors = [];
  const warnings = [];

  // Check required variables
  required.forEach((varName) => {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  });

  // Check optional variables (warn if missing)
  optional.forEach((varName) => {
    if (!process.env[varName]) {
      warnings.push(`Optional environment variable not set: ${varName}`);
    }
  });

  // Log results
  if (errors.length > 0) {
    logger.error('Environment validation failed:');
    errors.forEach((error) => logger.error(`  - ${error}`));
    return false;
  }

  if (warnings.length > 0) {
    logger.warn('Environment validation warnings:');
    warnings.forEach((warning) => logger.warn(`  - ${warning}`));
  }

  logger.info('Environment validation passed');
  return true;
}

/**
 * Validate backend environment variables
 */
function validateBackendEnv() {
  return validateEnv({
    required: ['DATABASE_URL'],
    optional: [
      'ANTHROPIC_API_KEY',
      'GOOGLE_CLOUD_LOCATION',
      'SERVICENOW_INSTANCE_URL',
      'SERVICENOW_USERNAME',
      'SERVICENOW_PASSWORD',
      'LOG_LEVEL',
      'CALENDAR_API_KEY',
    ],
  });
}

module.exports = { validateEnv, validateBackendEnv };
