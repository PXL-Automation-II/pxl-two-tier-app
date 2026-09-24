const mysql = require('mysql2/promise');
const env = require('./env');
const logger = require('../utils/logger');

let pool = null;

function getPool() {
  if (!pool) {
    logger.info(`Initializing MySQL connection pool for ${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}...`);
    pool = mysql.createPool({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      maxIdle: 10,
      idleTimeout: 60000,
      queueLimit: 0,
      connectTimeout: env.DB_CONNECT_TIMEOUT,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000
    });
  }
  return pool;
}

async function closePool() {
  if (pool) {
    logger.info('Closing database connection pool...');
    await pool.end();
    pool = null;
  }
}

module.exports = {
  getPool,
  closePool
};
