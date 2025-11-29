/**
 * Redis Cache Utility (Optional)
 * Provides caching functionality for frequently accessed data
 * Enable by setting REDIS_ENABLED=true in .env
 */

const logger = require('./logger');

let redisClient = null;
const REDIS_ENABLED = process.env.REDIS_ENABLED === 'true';

/**
 * Initialize Redis client
 */
const initRedis = async () => {
  if (!REDIS_ENABLED) {
    logger.info('Redis caching is disabled');
    return null;
  }

  try {
    const { createClient } = require('redis');
    
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    redisClient.on('error', (err) => {
      logger.error(`Redis Client Error: ${err.message}`, { error: err });
    });

    redisClient.on('connect', () => {
      logger.info('✓ Redis connected');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error(`Failed to initialize Redis: ${error.message}`, { error: error.stack });
    logger.info('Continuing without cache...');
    return null;
  }
};

/**
 * Get value from cache
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} Cached value or null
 */
const getCache = async (key) => {
  if (!REDIS_ENABLED || !redisClient) return null;

  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.error(`Cache get error for key ${key}: ${error.message}`, { error: error.stack });
    return null;
  }
};

/**
 * Set value in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds (default: 300)
 * @returns {Promise<boolean>} Success status
 */
const setCache = async (key, value, ttl = 300) => {
  if (!REDIS_ENABLED || !redisClient) return false;

  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    logger.error(`Cache set error for key ${key}: ${error.message}`, { error: error.stack });
    return false;
  }
};

/**
 * Delete value from cache
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} Success status
 */
const deleteCache = async (key) => {
  if (!REDIS_ENABLED || !redisClient) return false;

  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    logger.error(`Cache delete error for key ${key}: ${error.message}`, { error: error.stack });
    return false;
  }
};

/**
 * Delete multiple keys matching a pattern
 * @param {string} pattern - Key pattern (e.g., 'blogs:*')
 * @returns {Promise<number>} Number of keys deleted
 */
const deleteCachePattern = async (pattern) => {
  if (!REDIS_ENABLED || !redisClient) return 0;

  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length === 0) return 0;

    await redisClient.del(keys);
    return keys.length;
  } catch (error) {
    logger.error(`Cache pattern delete error for pattern ${pattern}: ${error.message}`, { error: error.stack });
    return 0;
  }
};

/**
 * Generate cache key for blog list
 * @param {Object} params - Query parameters
 * @returns {string} Cache key
 */
const getBlogListCacheKey = (params) => {
  const { page, limit, tags, search, status } = params;
  return `blogs:list:${page}:${limit}:${tags?.join(',')}:${search}:${status}`;
};

/**
 * Generate cache key for single blog
 * @param {number} id - Blog ID
 * @returns {string} Cache key
 */
const getBlogCacheKey = (id) => {
  return `blog:${id}`;
};

/**
 * Generate cache key for search results
 * @param {string} query - Search query
 * @param {number} page - Page number
 * @param {number} limit - Results limit
 * @returns {string} Cache key
 */
const getSearchCacheKey = (query, page, limit) => {
  return `search:${query}:${page}:${limit}`;
};

/**
 * Invalidate all blog-related caches
 * Call this after creating, updating, or deleting a blog
 */
const invalidateBlogCaches = async () => {
  if (!REDIS_ENABLED || !redisClient) return;

  try {
    await Promise.all([
      deleteCachePattern('blogs:list:*'),
      deleteCachePattern('search:*'),
    ]);
    logger.info('Blog caches invalidated');
  } catch (error) {
    logger.error(`Cache invalidation error: ${error.message}`, { error: error.stack });
  }
};

/**
 * Close Redis connection
 */
const closeRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis connection closed');
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeRedis();
});

process.on('SIGTERM', async () => {
  await closeRedis();
});

module.exports = {
  initRedis,
  getCache,
  setCache,
  deleteCache,
  deleteCachePattern,
  getBlogListCacheKey,
  getBlogCacheKey,
  getSearchCacheKey,
  invalidateBlogCaches,
  closeRedis,
};
