const os = require('os');
const env = require('../config/env');
const contactService = require('../services/contactService');

function getServerMetadata() {
  const interfaces = os.networkInterfaces();
  const ipAddresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        ipAddresses.push(net.address);
      }
    }
  }

  return {
    hostname: os.hostname(),
    ipAddresses: ipAddresses.length > 0 ? ipAddresses : ['127.0.0.1'],
    uptimeSeconds: Math.floor(process.uptime()),
    nodeVersion: process.version,
    platform: `${os.type()} ${os.release()}`
  };
}

function getHealth(req, res) {
  const meta = getServerMetadata();
  const dbState = contactService.getDatabaseState();

  const payload = {
    status: dbState.isConnected ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    database: dbState.isConnected ? 'connected' : 'disconnected',
    dbLatencyMs: dbState.latencyMs,
    server: {
      hostname: meta.hostname,
      ip: meta.ipAddresses[0],
      uptime: meta.uptimeSeconds
    }
  };

  if (!dbState.isConnected) {
    payload.error = dbState.lastError || 'Database connection unavailable';
    return res.status(503).json(payload);
  }

  return res.status(200).json(payload);
}

function getInfo(req, res) {
  const meta = getServerMetadata();
  const dbState = contactService.getDatabaseState();

  res.json({
    app: 'PXL Two-Tier Cloud Web Application',
    version: '1.0.0',
    environment: {
      port: env.PORT,
      dbHost: env.DB_HOST,
      dbPort: env.DB_PORT,
      dbName: env.DB_NAME,
      dbUser: env.DB_USER
    },
    server: meta,
    database: dbState
  });
}

module.exports = {
  getHealth,
  getInfo
};
