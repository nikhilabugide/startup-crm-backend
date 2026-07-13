import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { errorResponse } from '../utils/apiResponse.js';

/**
 * Express middleware to protect routes. Verifies the Bearer JWT token,
 * retrieves the associated user from the database, and attaches it to the request object.
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware callback.
 */
export const protect = async (req, res, next) => {
  let token;

  // 1. Extract token from Authorization header (Bearer <token>)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    // Split "Bearer <token>" to extract the token part
    token = req.headers.authorization.split(' ')[1];
  }

  // If no token is found in the headers
  if (!token) {
    return errorResponse(res, 'No token provided, access denied', 401);
  }

  try {
    // 2. Verify the token signature and expiration
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Find the user associated with this token (excluding password for security)
    const currentUser = await User.findById(decoded.id).select('-password');
    
    // If the user was deleted since the token was issued
    if (!currentUser) {
      return errorResponse(res, 'User belonging to this token no longer exists', 401);
    }

    // 4. Attach the authenticated user to the request context
    req.user = currentUser;
    next();
  } catch (error) {
    // Handle expired tokens specifically to allow client-side handling/redirection
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 'Token has expired, please login again', 401);
    }
    
    // Handle general token verification failures (e.g. malformed or invalid signature)
    return errorResponse(res, 'Token is invalid', 401);
  }
};
