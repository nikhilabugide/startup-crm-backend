import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables (useful if called in isolation, e.g. seeding/testing scripts)
dotenv.config();

/**
 * Establishes a connection to MongoDB Atlas using MONGODB_URI environment variable.
 * If the connection fails, logs the error and terminates the application process.
 * 
 * Handles backward compatibility for useNewUrlParser and useUnifiedTopology options
 * which are required in older Mongoose versions but cause crashes in Mongoose 9.x+.
 * 
 * @returns {Promise<void>} Resolves when connection succeeds.
 */
export const connectDB = async () => {
  try {
    let conn;
    
    try {
      // Attempt connection with the requested compatibility options
      conn = await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
    } catch (error) {
      // If the installed Mongoose version is modern (9.x+) and rejects these legacy options,
      // fallback and connect without them.
      if (error.message.toLowerCase().includes('not supported')) {
        conn = await mongoose.connect(process.env.MONGODB_URI);
      } else {
        throw error;
      }
    }

    console.log(`MongoDB Atlas Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    // Exit application process with failure exit code
    process.exit(1);
  }
};
