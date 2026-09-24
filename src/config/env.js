const dotenv = require('dotenv');

dotenv.config();

const env = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  DB_HOST: process.env.DB_HOST || '127.0.0.1',
  DB_PORT: parseInt(process.env.DB_PORT || '3306', 10),
  DB_USER: process.env.DB_USER || 'pxluser',
  DB_PASSWORD: process.env.DB_PASSWORD || 'PxlSecurePassword123!',
  DB_NAME: process.env.DB_NAME || 'pxldb',
  DB_CONNECT_TIMEOUT: parseInt(process.env.DB_CONNECT_TIMEOUT || '5000', 10),
  HEALTH_CHECK_INTERVAL: parseInt(process.env.HEALTH_CHECK_INTERVAL || '10000', 10)
};

module.exports = env;
