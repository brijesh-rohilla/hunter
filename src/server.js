// src/server.js
'use strict';

require('dotenv').config();

const app = require('./app');
const logger = require('./utils/logger');
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const PORT = parseInt(process.env.PORT || '3000', 10);

const server = app.listen(PORT, () => {
  logger.info(`🚀 Data Entry Module running on http://localhost:${PORT}`);
  logger.info(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});

// ── Graceful shutdown ──────────────────────────────────────────────────────
function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });

  // Force exit after 10 s if server hasn't closed
  setTimeout(() => {
    logger.error('Could not close connections in time, forcing exit.');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', err);
  process.exit(1);
});
