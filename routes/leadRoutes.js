import express from 'express';
import { body } from 'express-validator';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  getLeads,
  createLead,
  getLeadById,
  updateLead,
  updateLeadStatus,
  deleteLead,
  getLeadStats,
  getMonthlyStats,
  searchLeads
} from '../controllers/leadController.js';

const router = express.Router();

// Apply protect middleware to ALL routes in this file
router.use(protect);

// Define validation rules for creating/updating a lead
const leadValidationRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Lead name is required')
    .isLength({ min: 2 }).withMessage('Lead name must be at least 2 characters long'),
  body('company')
    .trim()
    .notEmpty().withMessage('Company name is required'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email address is required')
    .isEmail().withMessage('Email must be a valid email address'),
  body('status')
    .trim()
    .notEmpty().withMessage('Lead status is required')
    .isIn(['New', 'Contacted', 'Meeting Scheduled', 'Proposal Sent', 'Won', 'Lost'])
    .withMessage('Invalid status. Allowed values: New, Contacted, Meeting Scheduled, Proposal Sent, Won, Lost'),
  body('source')
    .trim()
    .notEmpty().withMessage('Lead source is required')
    .isIn(['Website', 'Referral', 'LinkedIn', 'Cold Call', 'Email Campaign', 'Other'])
    .withMessage('Invalid source. Allowed values: Website, Referral, LinkedIn, Cold Call, Email Campaign, Other')
];

// Define validation rules for updating lead status
const updateStatusValidationRules = [
  body('status')
    .trim()
    .notEmpty().withMessage('Status is required')
    .isIn(['New', 'Contacted', 'Meeting Scheduled', 'Proposal Sent', 'Won', 'Lost'])
    .withMessage('Invalid status. Allowed values: New, Contacted, Meeting Scheduled, Proposal Sent, Won, Lost')
];

// --- Wire up all 8 endpoints ---

/**
 * @route GET /api/leads/stats
 * @desc Get high-level stats for leads
 * @access Private
 */
router.get('/stats', getLeadStats);
router.get('/stats/summary', getLeadStats);

/**
 * @route GET /api/leads/monthly-stats
 * @desc Get monthly lead stats for the last 6 months
 * @access Private
 */
router.get('/monthly-stats', getMonthlyStats);
router.get('/stats/monthly', getMonthlyStats);

/**
 * @route GET /api/leads
 * @desc Get paginated and filtered leads for the authenticated user
 * @access Private
 */
router.get('/', getLeads);

/**
 * @route POST /api/leads
 * @desc Create a new lead for the authenticated user
 * @access Private
 */
router.post('/', validate(leadValidationRules), createLead);

/**
 * @route GET /api/leads/search
 * @desc Quick search for autocomplete
 * @access Private
 */
router.get('/search', searchLeads);

/**
 * @route GET /api/leads/:id
 * @desc Get a specific lead by ID
 * @access Private
 */
router.get('/:id', getLeadById);

/**
 * @route PUT /api/leads/:id
 * @desc Update a specific lead by ID
 * @access Private
 */
router.put('/:id', validate(leadValidationRules), updateLead);

/**
 * @route PATCH /api/leads/:id/status
 * @desc Update the status of a specific lead
 * @access Private
 */
router.patch('/:id/status', validate(updateStatusValidationRules), updateLeadStatus);

/**
 * @route DELETE /api/leads/:id
 * @desc Delete a specific lead by ID
 * @access Private
 */
router.delete('/:id', deleteLead);

export default router;
