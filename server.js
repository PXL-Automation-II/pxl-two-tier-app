const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const dotenv = require('dotenv');
const os = require('os');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Configuration
const PORT = parseInt(process.env.PORT || '3000', 10);
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_USER = process.env.DB_USER || 'pxluser';
const DB_PASSWORD = process.env.DB_PASSWORD || 'PxlSecurePassword123!';
const DB_NAME = process.env.DB_NAME || 'pxldb';

let dbPool = null;
let dbConnected = false;
let dbLastError = null;
let dbLatencyMs = null;

// Server Metadata
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

// Initialize MySQL Connection & Schema
async function initDatabase(retries = 30, delayMs = 3000) {
  console.log(`[DB] Attempting connection to MySQL at ${DB_HOST}:${DB_PORT} (Database: ${DB_NAME}, User: ${DB_USER})...`);
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      dbPool = mysql.createPool({
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 5000
      });

      // Test connection
      const start = Date.now();
      const [rows] = await dbPool.query('SELECT 1 + 1 AS solution');
      dbLatencyMs = Date.now() - start;

      // Create Table if not exists
      await dbPool.query(`
        CREATE TABLE IF NOT EXISTS contacts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(100) NOT NULL,
          department VARCHAR(100) DEFAULT 'Cloud Operations',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Seed initial sample data if empty
      const [countRows] = await dbPool.query('SELECT COUNT(*) AS total FROM contacts');
      if (countRows[0].total === 0) {
        console.log('[DB] Seeding initial sample contacts...');
        await dbPool.query(`
          INSERT INTO contacts (name, email, department) VALUES
          ('PXL Cloud Engineer', 'cloud.engineer@pxl.be', 'Automation II Team'),
          ('DevOps Lead', 'devops@pxl.be', 'Infrastructure Architecture'),
          ('Learner Lab Admin', 'admin@learnerlab.local', 'Cloud Services')
        `);
      }

      dbConnected = true;
      dbLastError = null;
      console.log(`[DB] Successfully connected to MySQL database '${DB_NAME}' in ${dbLatencyMs}ms!`);
      return;
    } catch (err) {
      dbConnected = false;
      dbLastError = err.message;
      console.warn(`[DB] Connection attempt ${attempt}/${retries} failed: ${err.message}. Retrying in ${delayMs / 1000}s...`);
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  console.error('[DB] All connection retries failed. The application will continue running in degraded mode.');
}

// Periodic Health Ping to DB
setInterval(async () => {
  if (!dbPool) return;
  try {
    const start = Date.now();
    await dbPool.query('SELECT 1');
    dbLatencyMs = Date.now() - start;
    dbConnected = true;
    dbLastError = null;
  } catch (err) {
    dbConnected = false;
    dbLastError = err.message;
  }
}, 10000);

// ==========================================
// API ROUTES
// ==========================================

// Health Check Endpoint (Used by ALB Target Group)
app.get('/health', (req, res) => {
  const meta = getServerMetadata();
  if (dbConnected) {
    return res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      dbLatencyMs,
      server: {
        hostname: meta.hostname,
        ip: meta.ipAddresses[0],
        uptime: meta.uptimeSeconds
      }
    });
  } else {
    return res.status(503).json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: dbLastError || 'Database connection unavailable',
      server: {
        hostname: meta.hostname,
        ip: meta.ipAddresses[0],
        uptime: meta.uptimeSeconds
      }
    });
  }
});

// Server Info API
app.get('/api/info', (req, res) => {
  const meta = getServerMetadata();
  res.json({
    app: 'PXL Two-Tier Cloud Web App',
    version: '1.0.0',
    server: meta,
    database: {
      connected: dbConnected,
      host: DB_HOST,
      port: DB_PORT,
      name: DB_NAME,
      latencyMs: dbLatencyMs,
      error: dbLastError
    }
  });
});

// Get Contacts
app.get('/api/contacts', async (req, res) => {
  if (!dbConnected) {
    return res.status(503).json({ error: 'Database unavailable', details: dbLastError });
  }
  try {
    const [rows] = await dbPool.query('SELECT * FROM contacts ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve contacts', details: err.message });
  }
});

// Create Contact
app.post('/api/contacts', async (req, res) => {
  if (!dbConnected) {
    return res.status(503).json({ error: 'Database unavailable', details: dbLastError });
  }
  const { name, email, department } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required fields' });
  }

  try {
    const [result] = await dbPool.query(
      'INSERT INTO contacts (name, email, department) VALUES (?, ?, ?)',
      [name, email, department || 'General']
    );
    res.status(201).json({
      id: result.insertId,
      name,
      email,
      department: department || 'General',
      message: 'Contact created successfully'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to insert contact', details: err.message });
  }
});

// Delete Contact
app.delete('/api/contacts/:id', async (req, res) => {
  if (!dbConnected) {
    return res.status(503).json({ error: 'Database unavailable', details: dbLastError });
  }
  try {
    await dbPool.query('DELETE FROM contacts WHERE id = ?', [req.params.id]);
    res.json({ message: 'Contact deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete contact', details: err.message });
  }
});

// Interactive Web UI Dashboard
app.get('/', (req, res) => {
  const meta = getServerMetadata();
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PXL Automation II — Two-Tier Cloud Dashboard</title>
  <style>
    :root {
      --primary: #0070f3;
      --success: #10b981;
      --danger: #ef4444;
      --bg: #0f172a;
      --card-bg: #1e293b;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --border: #334155;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 24px;
    }
    .container { max-width: 1100px; margin: 0 auto; }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 32px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .brand h1 { font-size: 24px; font-weight: 700; color: #fff; }
    .brand p { color: var(--text-muted); font-size: 14px; }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 600;
    }
    .badge-success { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid #10b981; }
    .badge-danger { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid #ef4444; }
    .badge-dot { width: 8px; height: 8px; border-radius: 50%; background-color: currentColor; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 32px; }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
    }
    .card-title { font-size: 12px; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; margin-bottom: 8px; }
    .card-value { font-size: 20px; font-weight: 600; color: #fff; word-break: break-all; }
    .card-subtitle { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
    .section-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { padding: 12px; border-bottom: 1px solid var(--border); color: var(--text-muted); font-size: 12px; text-transform: uppercase; }
    td { padding: 12px; border-bottom: 1px solid var(--border); font-size: 14px; }
    tr:hover { background-color: rgba(255, 255, 255, 0.02); }
    .form-group { display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 12px; margin-bottom: 20px; }
    input, button {
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: #0f172a;
      color: #fff;
      font-size: 14px;
    }
    input:focus { outline: none; border-color: var(--primary); }
    button {
      background: var(--primary);
      border: none;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    button:hover { opacity: 0.9; }
    .btn-delete { background: transparent; border: 1px solid var(--border); color: var(--danger); padding: 4px 8px; font-size: 12px; }
    .btn-delete:hover { background: rgba(239, 68, 68, 0.1); }
    footer { text-align: center; margin-top: 48px; color: var(--text-muted); font-size: 13px; border-top: 1px solid var(--border); padding-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">
        <h1>PXL Automation II — Cloud Two-Tier App</h1>
        <p>Declarative Infrastructure as Code Deployment with Terraform</p>
      </div>
      <div>
        <span class="badge ${dbConnected ? 'badge-success' : 'badge-danger'}">
          <span class="badge-dot"></span>
          Database: ${dbConnected ? 'Connected (' + dbLatencyMs + 'ms)' : 'Disconnected'}
        </span>
      </div>
    </header>

    <div class="grid">
      <div class="card">
        <div class="card-title">Instance Hostname</div>
        <div class="card-value" id="hostname">${meta.hostname}</div>
        <div class="card-subtitle">Serving EC2 Node</div>
      </div>
      <div class="card">
        <div class="card-title">Private IP Address</div>
        <div class="card-value" id="ip">${meta.ipAddresses.join(', ')}</div>
        <div class="card-subtitle">Internal Subnet IP</div>
      </div>
      <div class="card">
        <div class="card-title">Database Endpoint</div>
        <div class="card-value">${DB_HOST}:${DB_PORT}</div>
        <div class="card-subtitle">Target: ${DB_NAME}</div>
      </div>
      <div class="card">
        <div class="card-title">Server Uptime</div>
        <div class="card-value" id="uptime">${meta.uptimeSeconds}s</div>
        <div class="card-subtitle">Node.js ${meta.nodeVersion}</div>
      </div>
    </div>

    <div class="card">
      <div class="section-title">
        <span>Persistent Database Records</span>
        <button onclick="fetchContacts()" style="padding: 6px 12px; font-size: 12px; background: var(--border);">Refresh Data</button>
      </div>

      <form id="contactForm" onsubmit="addContact(event)" class="form-group">
        <input type="text" id="name" placeholder="Full Name" required />
        <input type="email" id="email" placeholder="Email Address" required />
        <input type="text" id="department" placeholder="Department (e.g. Cloud Ops)" />
        <button type="submit">Add Record</button>
      </form>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Department</th>
            <th>Created</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody id="contactsBody">
          <tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Loading contacts...</td></tr>
        </tbody>
      </table>
    </div>

    <footer>
      PXL Digital • Automation II • AWS & Terraform Evaluation Assignment (PE1)
    </footer>
  </div>

  <script>
    async function fetchContacts() {
      try {
        const res = await fetch('/api/contacts');
        const data = await res.json();
        const tbody = document.getElementById('contactsBody');
        if (!Array.isArray(data) || data.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: #94a3b8;">No contacts stored in MySQL yet.</td></tr>';
          return;
        }
        tbody.innerHTML = data.map(c => \`
          <tr>
            <td>#\${c.id}</td>
            <td><strong>\${c.name}</strong></td>
            <td>\${c.email}</td>
            <td>\${c.department}</td>
            <td>\${new Date(c.created_at).toLocaleString()}</td>
            <td><button class="btn-delete" onclick="deleteContact(\${c.id})">Delete</button></td>
          </tr>
        \`).join('');
      } catch (err) {
        document.getElementById('contactsBody').innerHTML = '<tr><td colspan="6" style="text-align:center; color: #ef4444;">Failed to load contacts from database.</td></tr>';
      }
    }

    async function addContact(e) {
      e.preventDefault();
      const name = document.getElementById('name').value;
      const email = document.getElementById('email').value;
      const department = document.getElementById('department').value;

      try {
        const res = await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, department })
        });
        if (res.ok) {
          document.getElementById('contactForm').reset();
          fetchContacts();
        } else {
          alert('Failed to save contact');
        }
      } catch (err) {
        alert('Network error');
      }
    }

    async function deleteContact(id) {
      if (!confirm('Delete contact #' + id + '?')) return;
      try {
        await fetch('/api/contacts/' + id, { method: 'DELETE' });
        fetchContacts();
      } catch (err) {
        alert('Failed to delete');
      }
    }

    fetchContacts();
  </script>
</body>
</html>`;

  res.send(html);
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[HTTP] PXL Two-Tier Web Application listening on port ${PORT}...`);
  // Initialize Database in background (with retries)
  initDatabase().catch((err) => {
    console.error('[DB] Fatal error initializing database pool:', err);
  });
});
