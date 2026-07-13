import mongoose from 'mongoose';

/**
 * Mongoose Schema for the Notification model.
 */
const notificationSchema = new mongoose.Schema(
  {
    /**
     * The User ID (Recipient) who should receive this notification.
     * Required field referencing the User model.
     */
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient is required']
    },

    /**
     * The title of the notification (e.g. 'Lead Created').
     */
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true
    },

    /**
     * The body message text of the notification.
     */
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true
    },

    /**
     * The type/category of notification to allow icon/color differentiation.
     */
    type: {
      type: String,
      enum: {
        values: ['lead_created', 'lead_updated', 'status_changed', 'info'],
        message: '{VALUE} is not a valid notification type.'
      },
      default: 'info'
    },

    /**
     * Flag indicating if the notification has been read by the recipient.
     */
    read: {
      type: Boolean,
      default: false
    },

    /**
     * Optional reference to the lead ID related to this notification.
     */
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead'
    }
  },
  {
    timestamps: true
  }
);

// Compound index on recipient, read status, and creation date for efficient queries
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
