import { errorResponse } from '../utils/apiResponse.js';

/**
 * Global Express Error Handling Middleware.
 * Captures, processes, and standardizes errors across the application.
 * 
 * @param {Object} err - The error object.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Server error';
  let errors = null;

  // 1. Mongoose ValidationError: occurs when validation rules on schemas fail
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.keys(err.errors).reduce((acc, key) => {
      acc[key] = err.errors[key].message;
      return acc;
    }, {});
  }

  // 2. Mongoose CastError: occurs when query parameters or IDs are in invalid formats (e.g. invalid ObjectId)
  else if (err.name === 'CastError') {
    statusCode = 404;
    message = 'Resource not found';
  }

  // 3. MongoDB Duplicate Key Error (Code 11000): occurs on unique constraint violation (e.g. email index)
  else if (err.code === 11000) {
    statusCode = 409;
    message = 'Email already exists';
  }

  // 4. JWT JsonWebTokenError: occurs when signature verification fails
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Authorization denied.';
  }

  // 5. JWT TokenExpiredError: occurs when token expiration check fails
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token has expired. Please log in again.';
  }

  // Log the complete error stack in development environment
  if (process.env.NODE_ENV === 'development') {
    console.error('ErrorHandler Caught Error:', err);
  }

  // Expose stack trace details ONLY in development environment
  let payloadErrors = errors;
  if (process.env.NODE_ENV === 'development') {
    payloadErrors = {
      stack: err.stack,
      ...(errors ? { validationErrors: errors } : {})
    };
  }

  // Return standard error response using utils helper
  return errorResponse(res, message, statusCode, payloadErrors);
};
