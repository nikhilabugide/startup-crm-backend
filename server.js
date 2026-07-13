import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';

// Database & Middleware Imports
import { connectDB } from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';

// Route Imports
import authRoutes from './routes/authRoutes.js';
import leadRoutes from './routes/leadRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

// Load environment variables
dotenv.config();

/**
 * Validates that all required environment variables are present on startup.
 * Logs any missing variables and terminates the process immediately.
 */
const checkRequiredEnvVars = () => {
  const requiredVars = ['MONGODB_URI', 'JWT_SECRET', 'PORT'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error(`[Fatal Startup Error] Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
  }
};

// Initialize the Express Application
const app = express();

// --- 1. Global Security & Utility Middleware Setup ---

// helmet: Sets various HTTP headers to secure the app from common web vulnerabilities
app.use(helmet());

// morgan: Logs incoming requests to the console based on running environment
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined')); // detailed standard logging for production
} else {
  app.use(morgan('dev')); // concise, colorized logging for development
}

// cors: Configures Cross-Origin Resource Sharing with production-grade configurations
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://your-app.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// express.json: Parses incoming requests with JSON payloads, limiting size to 10kb to prevent DOS attacks
// Must be defined before mongoSanitize so req.body is parsed and sanitized
app.use(express.json({ limit: '10kb' }));

// express.urlencoded: Parses URL-encoded request bodies
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Custom Express 5 compatibility middleware:
// Redefines req.query to be configurable & writable so express-mongo-sanitize can mutate it.
app.use((req, res, next) => {
  if (req.query) {
    Object.defineProperty(req, 'query', {
      value: { ...req.query },
      writable: true,
      configurable: true,
      enumerable: true
    });
  }
  next();
});

// express-mongo-sanitize: Sanitizes req.body, req.query, and req.params against NoSQL injection queries
app.use(mongoSanitize());

// express-rate-limit: Sets up request limiting per IP address
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 authentication requests per windowMs
  message: 'Too many auth attempts.'
});

// Apply rate limiting middleware
app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);


// --- 2. Endpoint Routing Setup ---

// Health Check Route: Lightweight endpoint to verify the service is running
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date()
  });
});

// Authentication endpoints
app.use('/api/auth', authRoutes);

// Leads management endpoints
app.use('/api/leads', leadRoutes);

// Notifications management endpoints
app.use('/api/notifications', notificationRoutes);


// --- 3. Error Handling Middleware ---

// Fallback for non-existent endpoints (404 Not Found)
app.use((req, res, next) => {
  const error = new Error(`Cannot find ${req.originalUrl} on this server`);
  error.statusCode = 404;
  next(error);
});

// Global Error Handler: catches all next(err) invocations
app.use(errorHandler);


// --- 4. Server Boot Initialization & Lifecycle Handles ---

/**
 * Handles graceful shutdown by cleanly closing database connections
 * before terminating the Node process.
 * 
 * @param {String} signal - Received termination signal (e.g. SIGINT, SIGTERM)
 */
const gracefulShutdown = async (signal) => {
  console.log(`\n[${signal}] Server shutting down gracefully...`);
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed cleanly.');
    process.exit(0);
  } catch (error) {
    console.error('Error during database connection closure:', error);
    process.exit(1);
  }
};

// Process lifecycle event listeners for SIGINT and SIGTERM
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

/**
 * Boots the CRM backend application:
 * 1. Validates environment variables
 * 2. Connects to MongoDB Atlas database
 * 3. Starts listening for Express server connections
 */
const startServer = async () => {
  try {
    // 1. Perform environment variable validation first
    checkRequiredEnvVars();

    // 2. Connect to MongoDB Atlas
    await connectDB();

    const PORT = process.env.PORT || 5000;
    const mode = process.env.NODE_ENV || 'development';

    // 3. Start listening for client connections
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} in ${mode} mode`);
    });
  } catch (error) {
    console.error(`Critical Failure during boot startup: ${error.message}`);
    process.exit(1);
  }
};

startServer();
