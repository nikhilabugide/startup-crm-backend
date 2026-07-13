import mongoose from 'mongoose';

/**
 * Regex pattern for validating proper email formats.
 */
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Mongoose Schema for the Lead model.
 */
export const leadSchema = new mongoose.Schema(
  {
    /**
     * The lead's full name.
     * Must be between 2 and 100 characters long and is automatically trimmed.
     * @type {String}
     */
    name: {
      type: String,
      required: [true, 'Lead name is required'],
      trim: true,
      minlength: [2, 'Lead name must be at least 2 characters long'],
      maxlength: [100, 'Lead name cannot exceed 100 characters']
    },

    /**
     * The company name associated with the lead.
     * Required field and is automatically trimmed.
     * @type {String}
     */
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true
    },

    /**
     * The lead's contact email address.
     * Required, trimmed, and validated against standard email format.
     * @type {String}
     */
    email: {
      type: String,
      required: [true, 'Email address is required'],
      trim: true,
      validate: {
        validator: function(value) {
          return emailRegex.test(value);
        },
        message: 'Email must be a valid email address'
      }
    },

    /**
     * The lead's contact phone number.
     * Optional field and is automatically trimmed.
     * @type {String}
     */
    phone: {
      type: String,
      trim: true
    },

    /**
     * The current status of the lead in the sales pipeline.
     * Defaults to 'New'.
     * @type {String}
     */
    status: {
      type: String,
      enum: {
        values: ['New', 'Contacted', 'Meeting Scheduled', 'Proposal Sent', 'Won', 'Lost'],
        message: '{VALUE} is not a valid status. Allowed values are: New, Contacted, Meeting Scheduled, Proposal Sent, Won, Lost'
      },
      default: 'New'
    },

    /**
     * The customer acquisition source from which the lead originated.
     * Defaults to 'Website'.
     * @type {String}
     */
    source: {
      type: String,
      enum: {
        values: ['Website', 'Referral', 'LinkedIn', 'Cold Call', 'Email Campaign', 'Other'],
        message: '{VALUE} is not a valid source. Allowed values are: Website, Referral, LinkedIn, Cold Call, Email Campaign, Other'
      },
      default: 'Website'
    },

    /**
     * Additional notes or detailed comments regarding the lead.
     * Optional field with a maximum length of 1000 characters.
     * @type {String}
     */
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters']
    },

    /**
     * The User ID (Owner) who created/manages this lead.
     * Required field referencing the User model.
     * @type {mongoose.Schema.Types.ObjectId}
     */
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Lead owner is required']
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// --- Indexes ---

/**
 * Compound index on owner and status for fast filtered queries.
 */
leadSchema.index({ owner: 1, status: 1 });

/**
 * Single index on email for fast lookups.
 */
leadSchema.index({ email: 1 });

/**
 * Compound index on owner and createdAt for fast chronological/range filtering and default sorting.
 */
leadSchema.index({ owner: 1, createdAt: -1 });

/**
 * Compound index on owner and source for fast filtering by acquisition channel.
 */
leadSchema.index({ owner: 1, source: 1 });

/**
 * Compound index on owner and name for quick autocomplete searches.
 */
leadSchema.index({ owner: 1, name: 1 });

/**
 * Compound index on owner and company for quick autocomplete searches.
 */
leadSchema.index({ owner: 1, company: 1 });

// --- Virtuals ---

/**
 * Calculates the number of days since the lead was created.
 * Useful for pipeline age analysis.
 * 
 * @returns {Number} Number of days since creation, or 0 if not saved yet.
 */
leadSchema.virtual('age').get(function() {
  if (!this.createdAt) {
    return 0;
  }
  const diffMs = Date.now() - this.createdAt.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
});

/**
 * The Lead Model compiled from leadSchema.
 */
const Lead = mongoose.model('Lead', leadSchema);

export default Lead;
