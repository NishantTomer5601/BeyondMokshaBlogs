/**
 * Content Processing Utilities
 * Handles content sanitization, conversion, and optimization
 */

// Note: Install these packages if you want to use this:
// npm install dompurify jsdom marked

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param {string} html - Raw HTML content
 * @returns {string} Sanitized HTML
 */
const sanitizeHtml = (html) => {
  // Option 1: Using DOMPurify (recommended for production)
  // const { JSDOM } = require('jsdom');
  // const createDOMPurify = require('dompurify');
  // const window = new JSDOM('').window;
  // const DOMPurify = createDOMPurify(window);
  // 
  // return DOMPurify.sanitize(html, {
  //   ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
  //                  'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre', 'hr', 'table', 
  //                  'thead', 'tbody', 'tr', 'th', 'td', 'div', 'span'],
  //   ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'target', 'rel'],
  //   ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  // });

  // Option 2: Simple sanitization (for development)
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
    .replace(/on\w+="[^"]*"/g, '') // Remove inline event handlers
    .replace(/on\w+='[^']*'/g, '');
};

/**
 * Convert Markdown to HTML
 * @param {string} markdown - Markdown content
 * @returns {string} HTML content
 */
const markdownToHtml = (markdown) => {
  // const { marked } = require('marked');
  // return marked.parse(markdown);
  
  // Simple fallback for now
  return markdown;
};

/**
 * Extract plain text from HTML (for search indexing)
 * @param {string} html - HTML content
 * @returns {string} Plain text
 */
const htmlToPlainText = (html) => {
  return html
    .replace(/<[^>]*>/g, ' ')       // Remove HTML tags
    .replace(/\s+/g, ' ')           // Normalize whitespace
    .replace(/&nbsp;/g, ' ')        // Replace &nbsp;
    .trim();
};

/**
 * Extract first N characters for preview/summary
 * @param {string} content - Full content (HTML or plain text)
 * @param {number} length - Maximum length
 * @returns {string} Truncated content
 */
const createExcerpt = (content, length = 200) => {
  const plainText = htmlToPlainText(content);
  if (plainText.length <= length) {
    return plainText;
  }
  return plainText.substring(0, length).trim() + '...';
};

/**
 * Optimize images in HTML content (add lazy loading, responsive attributes)
 * @param {string} html - HTML content
 * @returns {string} Optimized HTML
 */
const optimizeImages = (html) => {
  return html.replace(
    /<img([^>]*)>/gi,
    '<img$1 loading="lazy" decoding="async">'
  );
};

/**
 * Process blog content for storage
 * @param {string} content - Raw content
 * @param {string} contentType - 'text/html' or 'text/markdown'
 * @returns {Object} Processed content data
 */
const processContentForStorage = (content, contentType) => {
  let processedHtml = content;
  
  // Convert Markdown to HTML if needed
  if (contentType === 'text/markdown') {
    processedHtml = markdownToHtml(content);
  }
  
  // Sanitize HTML
  processedHtml = sanitizeHtml(processedHtml);
  
  // Optimize images
  processedHtml = optimizeImages(processedHtml);
  
  // Generate excerpt for search/preview
  const excerpt = createExcerpt(processedHtml, 200);
  
  // Extract word count
  const wordCount = htmlToPlainText(processedHtml).split(/\s+/).length;
  
  return {
    html: processedHtml,
    excerpt,
    wordCount,
    readTime: Math.ceil(wordCount / 200), // Average reading speed: 200 words/min
  };
};

module.exports = {
  sanitizeHtml,
  markdownToHtml,
  htmlToPlainText,
  createExcerpt,
  optimizeImages,
  processContentForStorage,
};
