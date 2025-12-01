/**
 * Centralized Error Handling Middleware
 */

/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(statusCode, message, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;

  // Default error
  if (!statusCode) {
    statusCode = 500;
    message = 'Internal server error';
  }

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', {
      statusCode,
      message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

/**
 * Handle 404 errors
 */
const notFound = (req, res, next) => {
  const error = new ApiError(404, `Route ${req.originalUrl} not found`);
  next(error);
};

/**
 * Async handler to wrap async route handlers
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  ApiError,
  errorHandler,
  notFound,
  asyncHandler
};
