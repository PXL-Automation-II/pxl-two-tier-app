const dotenv = require('dotenv');
const CONSTANTS = require('./constants');

dotenv.config();

function parseInteger(val, defaultVal, fieldName) {
  if (val === undefined || val === null || val === '') {
    return defaultVal;
  }
  const parsed = parseInt(val, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid environment variable "${fieldName}": expected integer, got "${val}"`);
  }
  return parsed;
}

const nodeEnv = process.env.NODE_ENV || 'development';
const port = parseInteger(process.env.PORT, CONSTANTS.SERVER.DEFAULT_PORT, 'PORT');
const dbPort = parseInteger(process.env.DB_PORT, CONSTANTS.DATABASE.DEFAULT_PORT, 'DB_PORT');
const dbConnectTimeout = parseInteger(
  process.env.DB_CONNECT_TIMEOUT,
  CONSTANTS.DATABASE.DEFAULT_CONNECT_TIMEOUT_MS,
  'DB_CONNECT_TIMEOUT'
);
const healthCheckInterval = parseInteger(
  process.env.HEALTH_CHECK_INTERVAL,
  CONSTANTS.DATABASE.DEFAULT_HEALTH_CHECK_INTERVAL_MS,
  'HEALTH_CHECK_INTERVAL'
);

if (port < 1 || port > 65535) {
  throw new Error(`Invalid PORT "${port}": must be between 1 and 65535`);
}
if (dbPort < 1 || dbPort > 65535) {
  throw new Error(`Invalid DB_PORT "${dbPort}": must be between 1 and 65535`);
}

// In production, DB_PASSWORD must be provided via runtime secret injection
if (nodeEnv === 'production' && !process.env.DB_PASSWORD) {
  throw new Error(
    'Missing required environment variable "DB_PASSWORD" for production environment.'
  );
}

const env = {
  NODE_ENV: nodeEnv,
  PORT: port,
  DB_HOST: process.env.DB_HOST || CONSTANTS.DATABASE.DEFAULT_HOST,
  DB_PORT: dbPort,
  DB_USER: process.env.DB_USER || CONSTANTS.DATABASE.DEFAULT_USER,
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_NAME: process.env.DB_NAME || CONSTANTS.DATABASE.DEFAULT_NAME,
  DB_CONNECT_TIMEOUT: dbConnectTimeout,
  HEALTH_CHECK_INTERVAL: healthCheckInterval,
  CORS_ORIGIN: process.env.CORS_ORIGIN || CONSTANTS.SERVER.DEFAULT_CORS_ORIGIN
};

module.exports = env;
