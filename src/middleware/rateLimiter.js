/**
 * Rate Limiting Configuration
 * Protects API endpoints from abuse and DDoS attacks
 */

const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * Rate limiter for public read endpoints
 * Allows generous access for legitimate users while preventing abuse
 * 
 * Limit: 100 requests per 15 minutes per IP
 * Use case: GET /api/blogs, GET /api/blogs/:slug, etc.
 */
const publicReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
    retryAfter: '15 minutes',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  
  // Skip rate limiting for certain conditions
  skip: (req) => {
    // Skip rate limiting for health check endpoint
    return req.path === '/health';
  },

  // Handler called when rate limit is exceeded
  handler: (req, res) => {
    logger.warn('Public read rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });

    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again after 15 minutes',
      retryAfter: '15 minutes',
    });
  },

  // Use default key generator which handles IPv6 properly
  // It will use req.ip which includes proper IPv6 handling
});

/**
 * Rate limiter for admin write endpoints
 * Stricter limits for create/update/delete operations
 * 
 * Limit: 50 requests per hour per API key
 * Use case: POST /api/blogs, PUT /api/blogs/:id, DELETE /api/blogs/:id
 */
const adminWriteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each API key to 50 requests per hour
  message: {
    success: false,
    message: 'Too many admin operations, please try again after an hour',
    retryAfter: '1 hour',
  },
  standardHeaders: true,
  legacyHeaders: false,

  handler: (req, res) => {
    logger.warn('Admin write rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      apiKey: req.headers['x-api-key']?.substring(0, 20) + '...',
    });

    res.status(429).json({
      success: false,
      message: 'Too many admin operations, please try again after an hour',
      retryAfter: '1 hour',
    });
  },

  // Use default key generator (IP-based with proper IPv6 handling)
});

/**
 * Stricter rate limiter for delete operations
 * Extra protection for destructive operations
 * 
 * Limit: 20 requests per hour per API key
 * Use case: DELETE /api/blogs/:id
 */
const adminDeleteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit to 20 delete operations per hour
  message: {
    success: false,
    message: 'Too many delete operations, please try again after an hour',
    retryAfter: '1 hour',
  },
  standardHeaders: true,
  legacyHeaders: false,

  handler: (req, res) => {
    logger.warn('Admin delete rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });

    res.status(429).json({
      success: false,
      message: 'Too many delete operations, please try again after an hour',
      retryAfter: '1 hour',
    });
  },

  // Use default key generator (IP-based with proper IPv6 handling)
});

/**
 * Very generous limiter for health check endpoint
 * Allows monitoring tools to check frequently
 * 
 * Limit: 1000 requests per 15 minutes per IP
 */
const healthCheckLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Very generous limit
  message: {
    success: false,
    message: 'Too many health check requests',
  },
  standardHeaders: true,
  legacyHeaders: false,

  // Use default key generator
});

/**
 * Log rate limit information for monitoring
 */
const logRateLimitInfo = (req, res, next) => {
  // Log when rate limit headers are present
  const remaining = res.getHeader('RateLimit-Remaining');
  const limit = res.getHeader('RateLimit-Limit');
  
  if (remaining !== undefined && parseInt(remaining) < 10) {
    logger.info('Rate limit approaching', {
      ip: req.ip,
      path: req.path,
      remaining,
      limit,
    });
  }

  next();
};

module.exports = {
  publicReadLimiter,
  adminWriteLimiter,
  adminDeleteLimiter,
  healthCheckLimiter,
  logRateLimitInfo,
};
