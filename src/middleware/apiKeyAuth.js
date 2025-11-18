/**
 * API Key Authentication Middleware
 * Protects admin endpoints (create/update/delete) with API key
 */

const logger = require('../utils/logger');

/**
 * Middleware to require valid API key for admin operations
 * Checks for API key in:
 * 1. X-API-Key header (recommended)
 * 2. Authorization: Bearer <key> header (alternative)
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const requireApiKey = (req, res, next) => {
  try {
    // Extract API key from headers
    const apiKey = req.headers['x-api-key'] || 
                   req.headers['authorization']?.replace('Bearer ', '');

    // Check if API key is provided
    if (!apiKey) {
      logger.warn('API key missing in request', {
        path: req.path,
        method: req.method,
        ip: req.ip,
      });

      return res.status(401).json({
        success: false,
        message: 'Unauthorized: API key is required for this operation',
        hint: 'Include API key in X-API-Key header or Authorization: Bearer <key> header',
      });
    }

    // Validate API key against environment variable
    const validApiKey = process.env.ADMIN_API_KEY;

    if (!validApiKey) {
      logger.error('ADMIN_API_KEY not configured in environment variables');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error',
      });
    }

    if (apiKey !== validApiKey) {
      logger.warn('Invalid API key attempt', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        providedKey: apiKey.substring(0, 20) + '...', // Log partial key for debugging
      });

      return res.status(403).json({
        success: false,
        message: 'Forbidden: Invalid API key',
      });
    }

    // API key is valid - log success and proceed
    logger.info('API key authenticated successfully', {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });

    next();
  } catch (error) {
    logger.error(`API key authentication error: ${error.message}`, {
      error: error.stack,
      path: req.path,
      method: req.method,
    });

    res.status(500).json({
      success: false,
      message: 'Authentication error',
    });
  }
};

/**
 * Optional: Middleware to check if API key is valid but not required
 * Useful for endpoints that want to identify authenticated users but allow public access
 */
const optionalApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || 
                 req.headers['authorization']?.replace('Bearer ', '');

  if (apiKey && apiKey === process.env.ADMIN_API_KEY) {
    req.isAuthenticated = true;
    req.isAdmin = true;
    logger.info('Optional API key provided and valid', {
      path: req.path,
      method: req.method,
    });
  } else {
    req.isAuthenticated = false;
    req.isAdmin = false;
  }

  next();
};

module.exports = {
  requireApiKey,
  optionalApiKey,
};
