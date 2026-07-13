import express from 'express';
import { protect } from '../middleware/auth.js';
import { getNotifications, markAsRead, markAllAsRead } from '../controllers/notificationController.js';

const router = express.Router();

// Protect all notification routes
router.use(protect);

/**
 * @route GET /api/notifications
 * @desc Get all notifications for the logged-in user
 * @access Private
 */
router.get('/', getNotifications);

/**
 * @route PATCH /api/notifications/read-all
 * @desc Mark all notifications as read
 * @access Private
 */
router.patch('/read-all', markAllAsRead);

/**
 * @route PATCH /api/notifications/:id/read
 * @desc Mark a single notification as read
 * @access Private
 */
router.patch('/:id/read', markAsRead);

export default router;
