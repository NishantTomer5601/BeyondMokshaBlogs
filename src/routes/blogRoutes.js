/**
 * Blog Routes
 * Defines all API endpoints for blog operations
 */

const express = require('express');
const multer = require('multer');
const {
  getBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
  permanentDeleteBlog,
  searchBlogsController,
  getBlogContent,
  getLatestBlogs,
  getPopularBlogs,
} = require('../controllers/blogController');
const {
  validateCreateBlog,
  validateUpdateBlog,
  validateBlogId,
  validateBlogListQuery,
  validateSearchQuery,
  validateFileUpload,
} = require('../middleware/validateRequest');
const { requireApiKey } = require('../middleware/apiKeyAuth');
const {
  publicReadLimiter,
  adminWriteLimiter,
  adminDeleteLimiter,
} = require('../middleware/rateLimiter');

const router = express.Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB default
  },
});

/**
 * @route   GET /api/blogs
 * @desc    Get paginated list of blogs with optional filters
 * @query   page, limit, tags, search
 * @access  Public
 * @rateLimit 100 requests per 15 minutes per IP
 */
router.get('/', publicReadLimiter, validateBlogListQuery, getBlogs);

/**
 * @route   GET /api/blogs/feed/latest
 * @desc    Get latest blogs
 * @query   limit (optional, default: 10, max: 50)
 * @access  Public
 * @rateLimit 100 requests per 15 minutes per IP
 */
router.get('/feed/latest', publicReadLimiter, getLatestBlogs);

/**
 * @route   GET /api/blogs/feed/popular
 * @desc    Get popular blogs sorted by views
 * @query   limit (optional, default: 10, max: 50)
 * @access  Public
 * @rateLimit 100 requests per 15 minutes per IP
 */
router.get('/feed/popular', publicReadLimiter, getPopularBlogs);

/**
 * @route   GET /api/blogs/search
 * @desc    Full-text search across blogs (title, tags)
 * @query   query, page, limit
 * @access  Public
 * @rateLimit 100 requests per 15 minutes per IP
 */
router.get('/search', publicReadLimiter, validateSearchQuery, searchBlogsController);

/**
 * @route   GET /api/blogs/:id
 * @desc    Get single blog by ID
 * @param   id
 * @access  Public
 * @rateLimit 100 requests per 15 minutes per IP
 */
router.get('/:id', publicReadLimiter, validateBlogId, getBlogById);

/**
 * @route   GET /api/blogs/:id/content
 * @desc    Get blog with full HTML content from S3
 * @param   id
 * @access  Public
 * @rateLimit 100 requests per 15 minutes per IP
 */
router.get('/:id/content', publicReadLimiter, validateBlogId, getBlogContent);

/**
 * @route   POST /api/blogs
 * @desc    Create a new blog
 * @body    title, tags, readTime
 * @files   content (required), cover (optional)
 * @access  Protected - Requires valid API key
 * @rateLimit 50 requests per hour per API key
 */
router.post(
  '/',
  adminWriteLimiter,
  requireApiKey,
  upload.fields([
    { name: 'content', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
  ]),
  validateFileUpload,
  validateCreateBlog,
  createBlog
);

/**
 * @route   PUT /api/blogs/:id
 * @desc    Update blog metadata and optionally replace files
 * @param   id
 * @body    title, tags, readTime, views, likes
 * @files   content (optional), cover (optional)
 * @access  Protected - Requires valid API key
 * @rateLimit 50 requests per hour per API key
 */
router.put(
  '/:id',
  adminWriteLimiter,
  requireApiKey,
  upload.fields([
    { name: 'content', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
  ]),
  validateUpdateBlog,
  updateBlog
);

/**
 * @route   DELETE /api/blogs/:id
 * @desc    Soft delete a blog (sets deletedAt)
 * @param   id
 * @access  Protected - Requires valid API key
 * @rateLimit 20 requests per hour per API key
 */
router.delete('/:id', adminDeleteLimiter, requireApiKey, validateBlogId, deleteBlog);

/**
 * @route   DELETE /api/blogs/:id/permanent
 * @desc    Permanently delete blog from DB and S3
 * @param   id
 * @access  Protected - Requires valid API key
 * @rateLimit 20 requests per hour per API key
 */
router.delete('/:id/permanent', adminDeleteLimiter, requireApiKey, validateBlogId, permanentDeleteBlog);

module.exports = router;
