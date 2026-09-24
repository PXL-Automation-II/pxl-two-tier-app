const { getPool } = require('../config/db');
const logger = require('../utils/logger');

const state = {
  isConnected: false,
  lastError: null,
  errorCode: null,
  latencyMs: null,
  schemaInitialized: false,
  version: null,
  recordCount: 0,
  lastChecked: null
};

async function ensureSchema() {
  const pool = getPool();
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        department VARCHAR(100) DEFAULT 'General',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const [countResult] = await pool.query('SELECT COUNT(*) AS total FROM contacts');
    if (countResult[0].total === 0) {
      logger.info('Seeding initial sample contacts...');
      await pool.query(`
        INSERT INTO contacts (name, email, department) VALUES
        ('PXL Cloud Engineer', 'cloud.engineer@pxl.be', 'Automation II Team'),
        ('DevOps Specialist', 'devops@pxl.be', 'Infrastructure Architecture'),
        ('Lab Administrator', 'admin@learnerlab.local', 'Cloud Services')
      `);
    }

    state.schemaInitialized = true;
    logger.info('Database schema verified and ready.');
  } catch (err) {
    logger.error('Failed to initialize database schema:', err.message);
    throw err;
  }
}

async function pingDatabase(timeoutMs = 2000) {
  const pool = getPool();
  const start = Date.now();
  state.lastChecked = new Date().toISOString();

  let timer = null;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const timeoutErr = new Error(`Database connection timed out after ${timeoutMs}ms`);
      timeoutErr.code = 'ETIMEDOUT';
      reject(timeoutErr);
    }, timeoutMs);
  });

  try {
    const queryPromise = (async () => {
      const [versionRows] = await pool.query('SELECT VERSION() AS version');
      return versionRows;
    })();

    const versionRows = await Promise.race([queryPromise, timeoutPromise]);
    if (timer) clearTimeout(timer);

    state.latencyMs = Date.now() - start;
    state.isConnected = true;
    state.lastError = null;
    state.errorCode = null;

    if (versionRows && versionRows[0] && versionRows[0].version) {
      state.version = versionRows[0].version;
    }

    if (!state.schemaInitialized) {
      await ensureSchema();
    }

    try {
      const [countResult] = await pool.query('SELECT COUNT(*) AS total FROM contacts');
      if (countResult && countResult[0]) {
        state.recordCount = countResult[0].total;
      }
    } catch {
      // Non-critical if table query fails
    }

    return true;
  } catch (err) {
    if (timer) clearTimeout(timer);
    state.isConnected = false;
    state.lastError = err.message || 'Unknown database connection error';
    state.errorCode = err.code || 'ERR_CONNECTION_FAILED';
    state.latencyMs = null;
    state.version = null;
    return false;
  }
}

async function getAllContacts() {
  if (!state.isConnected) {
    throw new Error('Database is currently unavailable');
  }
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT id, name, email, department, created_at FROM contacts ORDER BY created_at DESC'
  );
  return rows;
}

async function createContact({ name, email, department }) {
  if (!state.isConnected) {
    throw new Error('Database is currently unavailable');
  }
  const pool = getPool();
  const [result] = await pool.query(
    'INSERT INTO contacts (name, email, department) VALUES (?, ?, ?)',
    [name, email, department || 'General']
  );
  state.recordCount++;
  return {
    id: result.insertId,
    name,
    email,
    department: department || 'General'
  };
}

async function deleteContact(id) {
  if (!state.isConnected) {
    throw new Error('Database is currently unavailable');
  }
  const pool = getPool();
  const [result] = await pool.query('DELETE FROM contacts WHERE id = ?', [id]);
  const deleted = result.affectedRows > 0;
  if (deleted) {
    state.recordCount = Math.max(0, state.recordCount - 1);
  }
  return deleted;
}

function getDatabaseState() {
  return { ...state };
}

module.exports = {
  pingDatabase,
  ensureSchema,
  getAllContacts,
  createContact,
  deleteContact,
  getDatabaseState
};
