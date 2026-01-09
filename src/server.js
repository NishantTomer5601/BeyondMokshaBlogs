/**
 * Express Server
 * Main application entry point
 * Updated: Schema migration to remove slug, authorId, summary, status fields
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const logger = require('./utils/logger');
const blogRoutes = require('./routes/blogRoutes');
const { healthCheckLimiter } = require('./middleware/rateLimiter');

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'S3_BUCKET',
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  logger.error('❌ Missing required environment variables:', { missingEnvVars });
  missingEnvVars.forEach(varName => logger.error(`   - ${varName}`));
  process.exit(1);
}

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;
const API_PREFIX = process.env.API_PREFIX || '/api';

// ===========================
// Middleware Configuration
// ===========================

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging (development only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`);
    next();
  });
}

// ===========================
// Routes
// ===========================

// Health check endpoint with DB and S3 connectivity checks
// Rate limited to 1000 requests per 15 minutes per IP
app.get('/health', healthCheckLimiter, async (req, res) => {
  const health = {
    success: true,
    message: 'BeyondMoksha Blog API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: 'unknown',
      s3: 'unknown'
    }
  };

  try {
    // Check PostgreSQL connection
    const prisma = require('./prismaClient');
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = 'connected';
    logger.info('Health check: Database connected');
  } catch (dbError) {
    health.services.database = 'disconnected';
    health.success = false;
    health.message = 'Database connection failed';
    logger.error(`Health check: Database connection failed: ${dbError.message}`, { error: dbError.stack });
  }

  try {
    // Check S3 connectivity
    const { S3Client, HeadBucketCommand } = require('@aws-sdk/client-s3');
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    await s3Client.send(new HeadBucketCommand({ Bucket: process.env.S3_BUCKET }));
    health.services.s3 = 'connected';
    logger.info('Health check: S3 connected');
  } catch (s3Error) {
    health.services.s3 = 'disconnected';
    health.success = false;
    health.message = health.message === 'Database connection failed' 
      ? 'Database and S3 connection failed' 
      : 'S3 connection failed';
    logger.error(`Health check: S3 connection failed: ${s3Error.message}`, { error: s3Error.stack });
  }

  // Return appropriate status code
  const statusCode = health.success ? 200 : 503;
  res.status(statusCode).json(health);
});

// Blog routes
app.use(`${API_PREFIX}/blogs`, blogRoutes);

// Frontend compatibility alias (for routes like /blogs/30)
app.use('/blogs', blogRoutes);

// ===========================
// TEMPORARILY DISABLED: Search endpoint
// Uncomment when ready to test search functionality
// ===========================
// app.use(`${API_PREFIX}/search`, blogRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path,
  });
});

// ===========================
// Error Handling Middleware
// ===========================

app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`, { error: err.stack, path: req.path });

  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File size too large',
      error: err.message,
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Unexpected file field',
      error: err.message,
    });
  }

  // Prisma errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: 'A record with this value already exists',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Record not found',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }

  // Generic error response
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// ===========================
// Server Startup
// ===========================

const server = app.listen(PORT, () => {
  logger.info('\n🚀 BeyondMoksha Blog API Server');
  logger.info('================================');
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Server running on port: ${PORT}`);
  logger.info(`API Base URL: http://localhost:${PORT}${API_PREFIX}`);
  logger.info(`Health Check: http://localhost:${PORT}/health`);
  logger.info('================================\n');
});

// ===========================
// Graceful Shutdown
// ===========================

const gracefulShutdown = async (signal) => {
  logger.info(`\n${signal} received. Starting graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      // Close database connections
      const prisma = require('./prismaClient');
      await prisma.$disconnect();
      logger.info('Database connections closed');

      const { closePool } = require('./db/pool');
      await closePool();
      
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error(`Error during shutdown: ${error.message}`, { error: error.stack });
      process.exit(1);
    }
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 10000);
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`, { error: error.stack });
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', { reason, promise });
  gracefulShutdown('unhandledRejection');
});

module.exports = app;
