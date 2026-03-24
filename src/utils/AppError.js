// src/utils/AppError.js

class AppError extends Error {
  /**
   * @param {string} message   Human-readable message
   * @param {number} statusCode HTTP status code (default 500)
   * @param {string} code       Machine-readable code for the client
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // flag to distinguish from programmer errors
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
