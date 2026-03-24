// src/middleware/requestLogger.js
'use strict';

const logger = require('../utils/logger');

function requestLogger(req, _res, next) {
  logger.info(`${req.method} ${req.originalUrl} — ${req.ip}`);
  next();
}

module.exports = requestLogger;
