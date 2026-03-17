/**
 * Simple logging utility with different log levels
 * Replace console.log with structured logging
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const CURRENT_LOG_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL || 'INFO'];

class Logger {
  constructor(context = '') {
    this.context = context;
  }

  _log(level, message, ...args) {
    if (LOG_LEVELS[level] < CURRENT_LOG_LEVEL) {
      return;
    }

    const timestamp = new Date().toISOString();
    const contextStr = this.context ? `[${this.context}]` : '';
    const prefix = `[${timestamp}] [${level}]${contextStr}`;

    console.log(prefix, message, ...args);
  }

  debug(message, ...args) {
    this._log('DEBUG', message, ...args);
  }

  info(message, ...args) {
    this._log('INFO', message, ...args);
  }

  warn(message, ...args) {
    this._log('WARN', message, ...args);
  }

  error(message, ...args) {
    this._log('ERROR', message, ...args);
  }

  // Performance timing helper
  startTimer(label) {
    const start = Date.now();
    return {
      end: () => {
        const duration = Date.now() - start;
        this.info(`${label} completed in ${duration}ms`);
        return duration;
      },
    };
  }
}

// Create logger with context
function createLogger(context) {
  return new Logger(context);
}

module.exports = { Logger, createLogger, LOG_LEVELS };
