#!/usr/bin/env node

const net = require('node:net');
const mysql = require('mysql2/promise');
const env = require('../src/config/env');

async function testTcp(host, port, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let isResolved = false;

    socket.setTimeout(timeoutMs);

    socket.connect(port, host, () => {
      isResolved = true;
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        reject(new Error(`TCP connection to ${host}:${port} timed out after ${timeoutMs}ms.`));
      }
    });

    socket.on('error', (err) => {
      if (!isResolved) {
        isResolved = true;
        reject(err);
      }
    });
  });
}

async function runDiagnostics() {
  console.log('----------------------------------------------------');
  console.log(' PXL Two-Tier App: Database Connectivity Diagnostics');
  console.log('----------------------------------------------------');
  console.log(`Target Host: ${env.DB_HOST}`);
  console.log(`Target Port: ${env.DB_PORT}`);
  console.log(`Target User: ${env.DB_USER}`);
  console.log(`Database:    ${env.DB_NAME}`);
  console.log('----------------------------------------------------');

  console.log('\n[Step 1/3] Testing TCP connectivity to database host...');
  try {
    await testTcp(env.DB_HOST, env.DB_PORT);
    console.log(
      `[PASS] Successfully established TCP socket connection to ${env.DB_HOST}:${env.DB_PORT}`
    );
  } catch (err) {
    console.error(`[FAIL] Could not reach ${env.DB_HOST}:${env.DB_PORT}`);
    console.error(`Reason: ${err.message}`);
    console.error('\nTroubleshooting suggestions:');
    console.error('1. Check if the database EC2 instance or RDS instance is in running state.');
    console.error(
      '2. Verify the Database Security Group allows inbound TCP traffic on port 3306 from this host or its Security Group.'
    );
    console.error(
      '3. Verify subnet route tables and VPC peering / NAT configuration if across subnets.'
    );
    process.exit(1);
  }

  console.log('\n[Step 2/3] Testing MySQL authentication and handshake...');
  let connection;
  try {
    connection = await mysql.createConnection({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      connectTimeout: 5000
    });
    console.log('[PASS] MySQL authentication successful.');
  } catch (err) {
    console.error('[FAIL] MySQL authentication failed.');
    console.error(`Reason: ${err.message}`);
    console.error('\nTroubleshooting suggestions:');
    console.error('1. Verify DB_USER and DB_PASSWORD environment variables.');
    console.error('2. Ensure user has GRANT permissions to access DB_NAME.');
    process.exit(1);
  }

  console.log('\n[Step 3/3] Inspecting schema and sample records...');
  try {
    const [rows] = await connection.query('SHOW TABLES LIKE "contacts"');
    if (rows.length === 0) {
      console.log(
        '[WARN] Table "contacts" does not exist yet. The application will create it upon startup.'
      );
    } else {
      const [countResult] = await connection.query('SELECT COUNT(*) as count FROM contacts');
      console.log(`[PASS] Table "contacts" exists with ${countResult[0].count} records.`);
    }
  } catch (err) {
    console.error(`[FAIL] Query execution error: ${err.message}`);
  } finally {
    if (connection) {
      await connection.end();
    }
  }

  console.log('\n----------------------------------------------------');
  console.log('Result: Database is healthy and reachable.');
  console.log('----------------------------------------------------');
}

runDiagnostics().catch((err) => {
  console.error('Unexpected diagnostic error:', err);
  process.exit(1);
});
