import express from 'express';
import { body } from 'express-validator';
import { register, login, getProfile, updateProfile, logout } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// --- 1. Validation Schemas ---

/**
 * Validation rules for registration endpoint.
 */
const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters long'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Email must be a valid email address'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
];

/**
 * Validation rules for login endpoint.
 */
const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Email must be a valid email address'),
  body('password')
    .notEmpty().withMessage('Password is required')
];


// --- 2. Route Bindings ---

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', validate(registerValidation), register);

/**
 * @route POST /api/auth/login
 * @desc Authenticate user and get token
 * @access Public
 */
router.post('/login', validate(loginValidation), login);

/**
 * @route POST /api/auth/logout
 * @desc Terminate user session / logout
 * @access Private
 */
router.post('/logout', protect, logout);

/**
 * @route GET /api/auth/profile
 * @desc Get current user profile
 * @access Private
 */
router.get('/profile', protect, getProfile);

/**
 * @route PUT /api/auth/profile
 * @desc Update user profile (name or password)
 * @access Private
 */
router.put('/profile', protect, updateProfile);

export default router;
