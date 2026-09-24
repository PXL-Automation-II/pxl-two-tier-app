const { getPool } = require('../config/db');
const logger = require('../utils/logger');

const state = {
  isConnected: false,
  lastError: null,
  latencyMs: null,
  schemaInitialized: false
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

async function pingDatabase() {
  const pool = getPool();
  const start = Date.now();
  try {
    await pool.query('SELECT 1');
    state.latencyMs = Date.now() - start;
    state.isConnected = true;
    state.lastError = null;

    if (!state.schemaInitialized) {
      await ensureSchema();
    }

    return true;
  } catch (err) {
    state.isConnected = false;
    state.lastError = err.message;
    state.latencyMs = null;
    return false;
  }
}

async function getAllContacts() {
  if (!state.isConnected) {
    throw new Error('Database is currently unavailable');
  }
  const pool = getPool();
  const [rows] = await pool.query('SELECT id, name, email, department, created_at FROM contacts ORDER BY created_at DESC');
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
  return result.affectedRows > 0;
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
