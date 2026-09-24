const app = require('./src/app');
const env = require('./src/config/env');
const { closePool } = require('./src/config/db');
const contactService = require('./src/services/contactService');
const { resolveAwsMetadata } = require('./src/utils/imds');
const logger = require('./src/utils/logger');

let server = null;
let healthCheckTimer = null;
let isShuttingDown = false;

// Background Database Connection & Health Loop
async function monitorDatabaseConnection() {
  await contactService.pingDatabase();

  healthCheckTimer = setInterval(async () => {
    if (isShuttingDown) return;
    await contactService.pingDatabase();
  }, env.HEALTH_CHECK_INTERVAL);
}

// Start HTTP Server
server = app.listen(env.PORT, '0.0.0.0', () => {
  logger.info(`PXL Two-Tier Web Application listening on port ${env.PORT}`);
  logger.info(`Environment: Database target ${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`);

  // Resolve AWS EC2 metadata in background
  resolveAwsMetadata()
    .then((aws) => {
      logger.info(`Placement: Availability Zone ${aws.availabilityZone} (isAws: ${aws.isAws})`);
    })
    .catch(() => {});

  // Kick off background database connection
  monitorDatabaseConnection().catch((err) => {
    logger.error('Initial database monitoring error:', err.message);
  });
});

// Graceful Shutdown Handler for SIGTERM and SIGINT
async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}. Initiating graceful shutdown...`);

  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
  }

  // Force close after 10 seconds timeout
  const forceExitTimer = setTimeout(() => {
    logger.error('Graceful shutdown timed out. Forcing termination.');
    process.exit(1);
  }, 10000);
  forceExitTimer.unref();

  // Stop accepting new connections
  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed. No longer accepting connections.');
      try {
        await closePool();
        logger.info('Graceful shutdown complete. Exiting cleanly.');
        process.exit(0);
      } catch (err) {
        logger.error('Error closing database pool during shutdown:', err.message);
        process.exit(1);
      }
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
