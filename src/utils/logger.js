/**
 * Winston Logger Configuration
 * Structured logging for production-ready applications
 */

const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define which logs to print based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Define transports
const transports = [
  // Console transport for all environments
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
    ),
  }),
  
  // File transport for errors (always active)
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'error.log'),
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
    ),
  }),
  
  // File transport for all logs
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'combined.log'),
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
    ),
  }),
];

// Create the logger instance
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Create a stream object for Morgan HTTP logger
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

/**
 * Log HTTP request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
logger.logRequest = (req, res) => {
  const { method, url, ip } = req;
  const { statusCode } = res;
  logger.http(`${method} ${url} - ${statusCode} - ${ip}`);
};

/**
 * Log database query
 * @param {string} query - SQL query
 * @param {number} duration - Query duration in ms
 */
logger.logQuery = (query, duration) => {
  logger.debug(`DB Query [${duration}ms]: ${query}`);
};

/**
 * Log S3 operation
 * @param {string} operation - S3 operation type
 * @param {string} key - S3 object key
 * @param {boolean} success - Operation success status
 */
logger.logS3Operation = (operation, key, success = true) => {
  const message = `S3 ${operation}: ${key}`;
  if (success) {
    logger.info(message);
  } else {
    logger.error(`${message} - FAILED`);
  }
};

/**
 * Log authentication event
 * @param {string} event - Auth event type
 * @param {string} userId - User ID
 * @param {boolean} success - Auth success status
 */
logger.logAuth = (event, userId, success = true) => {
  const message = `Auth ${event}: User ${userId}`;
  if (success) {
    logger.info(message);
  } else {
    logger.warn(`${message} - FAILED`);
  }
};

module.exports = logger;
