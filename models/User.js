import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * Regex pattern for validating proper email formats.
 */
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Mongoose Schema for the User model.
 */
export const userSchema = new mongoose.Schema(
  {
    /**
     * The user's full display name.
     * Must be between 2 and 50 characters long and is automatically trimmed.
     * @type {String}
     */
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [50, 'Name cannot exceed 50 characters']
    },

    /**
     * The user's unique email address.
     * Automatically converted to lowercase, trimmed, and validated against standard email format.
     * @type {String}
     */
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function(value) {
          return emailRegex.test(value);
        },
        message: 'Email must be a valid email address'
      }
    },

    /**
     * The user's hashed password.
     * Plaintext password is required and must be at least 6 characters long before hashing.
     * @type {String}
     */
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long']
    },

    /**
     * The role assigned to the user, controlling authorization levels.
     * Must be either 'admin' or 'user'. Defaults to 'user'.
     * @type {String}
     */
    role: {
      type: String,
      enum: {
        values: ['admin', 'user'],
        message: '{VALUE} is not a valid role. Allowed roles are: admin, user'
      },
      default: 'user'
    },

    /**
     * Status flag indicating if the user's account is currently active.
     * Defaults to true.
     * @type {Boolean}
     */
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

/**
 * Pre-save middleware to hash the password before saving it to the database.
 * The hashing will only run if the password field has been modified.
 */
userSchema.pre('save', async function() {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

/**
 * Compares a candidate plain text password with the user's stored hashed password.
 * 
 * @param {String} candidatePassword - The plain text password to compare.
 * @returns {Promise<Boolean>} True if the passwords match, false otherwise.
 */
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

/**
 * Overrides the default toJSON method to ensure sensitive fields (like password)
 * are deleted from the returned object before sending it to the client.
 * 
 * @returns {Object} The sanitized user object.
 */
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

/**
 * The User Model compiled from userSchema.
 */
const User = mongoose.model('User', userSchema);

export default User;
