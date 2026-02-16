const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import utilities
const { createLogger } = require('./utils/logger');
const { validateBackendEnv } = require('./utils/validateEnv');

// Validate environment variables before starting
if (!validateBackendEnv()) {
  console.error('❌ Environment validation failed. Please check your .env file.');
  process.exit(1);
}

// Import database pool (this will test connection on import)
require('./db');

const logger = createLogger('Server');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Increase timeout for long-running AI operations (5 minutes)
app.use((req, res, next) => {
  req.setTimeout(300000); // 5 minutes
  res.setTimeout(300000); // 5 minutes
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Import routes
const incidentsRouter = require('./routes/incidents');
const incidentRolesRouter = require('./routes/incidentRoles');
const investigationStreamsRouter = require('./routes/investigationStreams');
const runbooksRouter = require('./routes/runbooks');
const usersRouter = require('./routes/users');
const postmortemRouter = require('./routes/postmortem');
const postmortemsRouter = require('./routes/postmortems');
const knowledgeGraphRouter = require('./routes/knowledgeGraph');
const serviceNowRouter = require('./routes/servicenow');
const analyticsRouter = require('./routes/analytics');
const bulkImportRouter = require('./routes/bulkImport');

// Use routes
app.use('/api/incidents', incidentsRouter);
app.use('/api/incidents/:id/roles', incidentRolesRouter);
app.use('/api/incidents', investigationStreamsRouter);
app.use('/api/incidents/:id/postmortem', postmortemRouter);
app.use('/api/incidents/:id/recommendations', knowledgeGraphRouter);
app.use('/api/runbooks', runbooksRouter);
app.use('/api/postmortems', postmortemsRouter);
app.use('/api/users', usersRouter);
app.use('/api/knowledge-graph', knowledgeGraphRouter);
app.use('/api/servicenow', serviceNowRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/bulk-import', bulkImportRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Backend server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Log level: ${process.env.LOG_LEVEL || 'INFO'}`);
});
