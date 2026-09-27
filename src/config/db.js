const mysql = require('mysql2/promise');
const env = require('./env');
const CONSTANTS = require('./constants');
const logger = require('../utils/logger');

let pool = null;

function getPool() {
  if (!pool) {
    logger.info(
      `Initializing MySQL connection pool for ${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}...`
    );
    pool = mysql.createPool({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      waitForConnections: true,
      connectionLimit: CONSTANTS.DATABASE.POOL.CONNECTION_LIMIT,
      maxIdle: CONSTANTS.DATABASE.POOL.MAX_IDLE,
      idleTimeout: CONSTANTS.DATABASE.POOL.IDLE_TIMEOUT_MS,
      queueLimit: CONSTANTS.DATABASE.POOL.QUEUE_LIMIT,
      connectTimeout: env.DB_CONNECT_TIMEOUT,
      enableKeepAlive: true,
      keepAliveInitialDelay: CONSTANTS.DATABASE.POOL.KEEP_ALIVE_INITIAL_DELAY_MS
    });
  }
  return pool;
}

function setPool(customPool) {
  pool = customPool;
}

async function closePool() {
  if (pool) {
    logger.info('Closing database connection pool...');
    if (typeof pool.end === 'function') {
      await pool.end();
    }
    pool = null;
  }
}

module.exports = {
  getPool,
  setPool,
  closePool
};
