/**
 * PostgreSQL Connection Pool
 * Provides raw database access for complex queries and connection pooling
 */

const { Pool } = require('pg');
const logger = require('../utils/logger');

// Parse DATABASE_URL
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not defined');
}

// Create connection pool
const pool = new Pool({
  connectionString,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection not available
  maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
});

// Pool error handler
pool.on('error', (err) => {
  logger.error(`Unexpected error on idle database client: ${err.message}`, { error: err.stack });
  process.exit(-1);
});

// Test connection
pool.on('connect', () => {
  if (process.env.NODE_ENV === 'development') {
    logger.info('✓ PostgreSQL pool connected');
  }
});

/**
 * Execute a query with the pool
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV === 'development') {
      logger.info('Executed query', { text, duration, rows: res.rowCount });
    }
    
    return res;
  } catch (error) {
    logger.error(`Database query error: ${error.message}`, { error: error.stack, text });
    throw error;
  }
};

/**
 * Get a client from the pool for transactions
 * Remember to release the client after use
 */
const getClient = async () => {
  const client = await pool.connect();
  const query = client.query;
  const release = client.release;

  // Set a timeout of 5 seconds, after which we will log this client's last query
  const timeout = setTimeout(() => {
    logger.warn('A client has been checked out for more than 5 seconds!');
  }, 5000);

  // Monkey patch the query method to keep track of the last query executed
  client.query = (...args) => {
    client.lastQuery = args;
    return query.apply(client, args);
  };

  client.release = () => {
    clearTimeout(timeout);
    client.query = query;
    client.release = release;
    return release.apply(client);
  };

  return client;
};

// Graceful shutdown
const closePool = async () => {
  await pool.end();
  logger.info('Database pool closed');
};

process.on('SIGINT', async () => {
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closePool();
  process.exit(0);
});

module.exports = {
  pool,
  query,
  getClient,
  closePool,
};
