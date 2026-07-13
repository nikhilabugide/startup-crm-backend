import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

/**
 * Helper function to sign and generate a JWT token for a specific user ID.
 * 
 * @param {String} userId - The Mongoose ObjectId of the user.
 * @returns {String} The signed JWT string.
 */
export const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * Register a new user in the system.
 * 
 * @route POST /api/auth/register
 * @access Public
 */
export const register = async (req, res, next) => {
  /*
   * PRODUCTION SECURITY NOTE:
   * To prevent denial-of-service and brute-force registration scripts,
   * a rate limiter middleware (e.g., using 'express-rate-limit') should be mounted
   * to this endpoint in production.
   */
  try {
    const { name, email, password } = req.body;

    // Check if a user with the same email already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      // Return 409 Conflict using standardized response (same as duplicate key middleware fallback)
      return errorResponse(res, 'Email already exists', 409);
    }

    // Create and save new User document
    const user = await User.create({
      name,
      email,
      password
    });

    // Generate authenticated JWT
    const token = generateToken(user._id);

    // Remove password and return success payload
    const userJson = user.toJSON();

    return successResponse(
      res, 
      { token, user: userJson }, 
      'User registered successfully', 
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Log in an existing user.
 * 
 * @route POST /api/auth/login
 * @access Public
 */
export const login = async (req, res, next) => {
  /*
   * PRODUCTION SECURITY NOTE:
   * To prevent automated password-cracking and brute-force credential attacks,
   * a rate limiter middleware (e.g. 'express-rate-limit') MUST be applied to this endpoint
   * in production (limiting e.g., to 5 failures per 15 minutes per IP).
   */
  try {
    const { email, password } = req.body;

    // Find user by email and explicitly select the password field (excluded by default)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      // General response used to avoid leaking user presence details
      return errorResponse(res, 'Invalid credentials', 401);
    }

    // Compare Candidate password hash with stored password hash
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    // Check if the user account is active
    if (!user.isActive) {
      return errorResponse(res, 'Account is deactivated', 403);
    }

    // Generate authenticated JWT
    const token = generateToken(user._id);

    // Strip password from the user object
    const userJson = user.toJSON();

    return successResponse(
      res, 
      { token, user: userJson }, 
      'User logged in successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves the current logged in user's profile.
 * 
 * @route GET /api/auth/profile
 * @access Private
 */
export const getProfile = async (req, res, next) => {
  try {
    // req.user is populated by the protect middleware (excluding password)
    return successResponse(
      res, 
      req.user, 
      'User profile retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Updates the user's name or changes their password.
 * 
 * @route PUT /api/auth/profile
 * @access Private
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { name, oldPassword, newPassword } = req.body;

    // Retrieve user with password for verification
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Handle password change request
    if (newPassword) {
      if (!oldPassword) {
        return errorResponse(res, 'Please provide your current password to set a new password', 400);
      }

      // Check current password
      const isPasswordCorrect = await user.comparePassword(oldPassword);
      if (!isPasswordCorrect) {
        return errorResponse(res, 'Incorrect current password', 401);
      }

      // Assign new password. The pre-save hook will hash it before saving.
      user.password = newPassword;
    }

    // Only allow updating name (email changes require a dedicated verification flow)
    if (name) {
      user.name = name;
    }

    // Save triggers the validation and pre-save password-hashing middleware
    await user.save();

    // Clean user object before response (stripping password field)
    const userJson = user.toJSON();

    return successResponse(
      res, 
      userJson, 
      'Profile updated successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Log out user (clear session/cookies if applicable, or just send a success response).
 * 
 * @route POST /api/auth/logout
 * @access Private
 */
export const logout = async (req, res, next) => {
  try {
    // Standard logout notification. Frontend handles deletion of token from local storage.
    return successResponse(
      res, 
      null, 
      'Logged out successfully'
    );
  } catch (error) {
    next(error);
  }
};
