const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import database pool (this will test connection on import)
require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Import routes
const incidentsRouter = require('./routes/incidents');
const runbooksRouter = require('./routes/runbooks');
const usersRouter = require('./routes/users');
const postmortemRouter = require('./routes/postmortem');

// Use routes
app.use('/api/incidents', incidentsRouter);
app.use('/api/incidents/:id/postmortem', postmortemRouter);
app.use('/api/runbooks', runbooksRouter);
app.use('/api/users', usersRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on port ${PORT}`);
});
