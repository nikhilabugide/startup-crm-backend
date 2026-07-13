import Notification from '../models/Notification.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

/**
 * Get all notifications for the authenticated user (limit to recent 50).
 * 
 * @route GET /api/notifications
 * @access Private
 */
export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    return successResponse(res, notifications, 'Notifications retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Mark a single notification as read.
 * 
 * @route PATCH /api/notifications/:id/read
 * @access Private
 */
export const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return errorResponse(res, 'Notification not found', 404);
    }

    return successResponse(res, notification, 'Notification marked as read');
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all notifications for the authenticated user as read.
 * 
 * @route PATCH /api/notifications/read-all
 * @access Private
 */
export const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true }
    );

    return successResponse(res, null, 'All notifications marked as read');
  } catch (error) {
    next(error);
  }
};
