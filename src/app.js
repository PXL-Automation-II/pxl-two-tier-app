const express = require('express');
const cors = require('cors');
const path = require('path');
const CONSTANTS = require('./config/constants');
const healthRoutes = require('./routes/healthRoutes');
const apiRoutes = require('./routes/apiRoutes');
const logger = require('./utils/logger');

const app = express();

// Security: disable X-Powered-By header
app.disable('x-powered-by');

// Request counting middleware for load-balancing observability
let totalRequests = 0;
app.use((req, res, next) => {
  totalRequests++;
  next();
});
app.getRequestsCount = () => totalRequests;

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Configurable CORS (defaults to wildcard for friction-free student lab access)
const allowedOrigins = process.env.CORS_ORIGIN || CONSTANTS.SERVER.DEFAULT_CORS_ORIGIN;
app.use(
  cors({
    origin: allowedOrigins === '*' ? '*' : allowedOrigins.split(',').map((o) => o.trim())
  })
);
app.use(express.json({ limit: CONSTANTS.SERVER.JSON_BODY_LIMIT }));

// Serve static frontend dashboard assets
app.use(express.static(path.join(__dirname, '../public')));

// Mount routes
app.use('/', healthRoutes);
app.use('/api', apiRoutes);

// 404 handler for unmatched API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

// Global error handler
app.use((err, req, res, _next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Malformed JSON in request body' });
  }
  logger.error('Unhandled request error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
