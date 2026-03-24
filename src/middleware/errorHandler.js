// src/middleware/errorHandler.js
'use strict';

const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  // Multer errors (file size / type)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      code: 'FILE_TOO_LARGE',
      message: 'Uploaded file exceeds the 5 MB limit.',
    });
  }

  if (err instanceof AppError && err.isOperational) {
    // Expected, user-facing error
    logger.warn(`Operational error [${err.code}]: ${err.message}`);
    return res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
    });
  }

  // Unexpected programmer or infrastructure error
  logger.error('Unexpected error', err);

  return res.status(500).json({
    success: false,
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred. Please try again later.',
  });
}

module.exports = errorHandler;
