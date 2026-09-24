const os = require('os');
const env = require('../config/env');
const CONSTANTS = require('../config/constants');
const contactService = require('../services/contactService');
const { getCachedAwsMetadata } = require('../utils/imds');

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

  const awsMeta = getCachedAwsMetadata();
  const totalMemMb = Math.round(os.totalmem() / CONSTANTS.SYSTEM.BYTES_PER_MB);
  const freeMemMb = Math.round(os.freemem() / CONSTANTS.SYSTEM.BYTES_PER_MB);
  const usedMemMb = Math.max(0, totalMemMb - freeMemMb);
  const usedMemPercent = totalMemMb > 0 ? Math.round((usedMemMb / totalMemMb) * 100) : 0;

  return {
    hostname: os.hostname(),
    instanceId: awsMeta.instanceId || os.hostname(),
    availabilityZone: awsMeta.availabilityZone,
    isAws: awsMeta.isAws,
    ipAddresses: ipAddresses.length > 0 ? ipAddresses : [CONSTANTS.SYSTEM.DEFAULT_LOOPBACK_IP],
    uptimeSeconds: Math.floor(process.uptime()),
    nodeVersion: process.version,
    platform: `${os.type()} ${os.release()}`,
    memory: {
      totalMb: totalMemMb,
      usedMb: usedMemMb,
      freeMb: freeMemMb,
      usedPercent: usedMemPercent
    }
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
      availabilityZone: meta.availabilityZone,
      ip: meta.ipAddresses[0],
      uptime: meta.uptimeSeconds
    }
  };

  if (!dbState.isConnected) {
    payload.error = 'Database connection unavailable';
    return res.status(503).json(payload);
  }

  return res.status(200).json(payload);
}

function getInfo(req, res) {
  const meta = getServerMetadata();
  const dbState = contactService.getDatabaseState();
  const requestsServed = req.app.getRequestsCount ? req.app.getRequestsCount() : 1;

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
    server: {
      ...meta,
      requestsServed
    },
    database: {
      host: env.DB_HOST,
      port: env.DB_PORT,
      name: env.DB_NAME,
      connected: dbState.isConnected,
      ...dbState
    }
  });
}

function getDiagnostics(req, res) {
  const dbState = contactService.getDatabaseState();
  const isConnected = dbState.isConnected;
  res.json({
    connected: isConnected,
    status: isConnected ? 'connected' : 'disconnected',
    lastChecked: dbState.lastChecked,
    latencyMs: dbState.latencyMs,
    version: dbState.version,
    recordCount: dbState.recordCount,
    error: dbState.lastError,
    errorCode: dbState.errorCode,
    target: {
      host: env.DB_HOST,
      port: env.DB_PORT,
      database: env.DB_NAME,
      user: env.DB_USER,
      connectTimeoutMs: env.DB_CONNECT_TIMEOUT
    }
  });
}

async function postDiagnosticsPing(req, res) {
  const connected = await contactService.pingDatabase();
  const dbState = contactService.getDatabaseState();
  res.json({
    connected,
    status: connected ? 'connected' : 'disconnected',
    lastChecked: dbState.lastChecked,
    latencyMs: dbState.latencyMs,
    version: dbState.version,
    recordCount: dbState.recordCount,
    error: dbState.lastError,
    errorCode: dbState.errorCode,
    target: {
      host: env.DB_HOST,
      port: env.DB_PORT,
      database: env.DB_NAME,
      user: env.DB_USER,
      connectTimeoutMs: env.DB_CONNECT_TIMEOUT
    }
  });
}

module.exports = {
  getHealth,
  getInfo,
  getDiagnostics,
  postDiagnosticsPing
};
