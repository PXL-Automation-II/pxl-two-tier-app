document.addEventListener('DOMContentLoaded', () => {
  const dbBadge = document.getElementById('dbBadge');
  const dbBadgeText = document.getElementById('dbBadgeText');
  const hostnameElem = document.getElementById('hostname');
  const availabilityZoneElem = document.getElementById('availabilityZone');
  const ipAddressElem = document.getElementById('ipAddress');
  const requestsServedElem = document.getElementById('requestsServed');
  const dbEndpointElem = document.getElementById('dbEndpoint');
  const dbDatabaseNameElem = document.getElementById('dbDatabaseName');
  const memoryUsageElem = document.getElementById('memoryUsage');
  const uptimeElem = document.getElementById('uptime');
  const contactsBody = document.getElementById('contactsBody');
  const contactForm = document.getElementById('contactForm');
  const refreshBtn = document.getElementById('refreshBtn');
  const formError = document.getElementById('formError');

  // Diagnostics modal elements
  const debugModal = document.getElementById('debugModal');
  const closeDebugModalBtn = document.getElementById('closeDebugModalBtn');
  const dismissDebugModalBtn = document.getElementById('dismissDebugModalBtn');
  const retryPingBtn = document.getElementById('retryPingBtn');
  const copyDiagBtn = document.getElementById('copyDiagBtn');
  const diagErrorCode = document.getElementById('diagErrorCode');
  const diagTimestamp = document.getElementById('diagTimestamp');
  const diagErrorMessage = document.getElementById('diagErrorMessage');
  const diagHost = document.getElementById('diagHost');
  const diagPort = document.getElementById('diagPort');
  const diagDbName = document.getElementById('diagDbName');
  const diagUser = document.getElementById('diagUser');
  const diagRaw = document.getElementById('diagRaw');
  const diagBanner = document.getElementById('diagBanner');

  let isDbConnected = false;
  let latestDbDiagnostics = null;

  function showError(msg) {
    if (!msg) {
      formError.classList.add('hidden');
      formError.textContent = '';
      return;
    }
    formError.classList.remove('hidden');
    formError.textContent = msg;
  }

  function renderDiagnostics(diag) {
    if (!diag) return;
    const isConn = Boolean(diag.connected);
    if (diagBanner) {
      diagBanner.className = isConn
        ? 'diag-banner diag-banner-success'
        : 'diag-banner diag-banner-error';
    }
    if (diagErrorCode) {
      diagErrorCode.textContent = isConn ? 'CONNECTED' : diag.errorCode || 'DISCONNECTED';
    }
    if (diagTimestamp) {
      const timeStr = diag.lastChecked
        ? new Date(diag.lastChecked).toLocaleTimeString()
        : new Date().toLocaleTimeString();
      diagTimestamp.textContent = `Last checked: ${timeStr}`;
    }
    if (diagErrorMessage) {
      diagErrorMessage.textContent = isConn
        ? `Database connection verified successfully (${diag.latencyMs ?? 0}ms latency).`
        : diag.error || 'Unable to establish TCP connection to MySQL database target.';
    }
    if (diagHost) diagHost.textContent = diag.target?.host || '-';
    if (diagPort) diagPort.textContent = String(diag.target?.port || '3306');
    if (diagDbName) diagDbName.textContent = diag.target?.database || '-';
    if (diagUser) diagUser.textContent = diag.target?.user || '-';
    if (diagRaw) diagRaw.textContent = JSON.stringify(diag, null, 2);
  }

  function openDebugModal() {
    if (!debugModal) return;
    renderDiagnostics(latestDbDiagnostics);
    debugModal.classList.remove('hidden');
    dbBadge.setAttribute('aria-expanded', 'true');
  }

  function closeDebugModal() {
    if (!debugModal) return;
    debugModal.classList.add('hidden');
    dbBadge.setAttribute('aria-expanded', 'false');
  }

  async function fetchServerInfo() {
    try {
      const res = await fetch('/api/info');
      const data = await res.json();

      if (data.server) {
        hostnameElem.textContent = data.server.hostname || 'Unknown';
        if (availabilityZoneElem) {
          availabilityZoneElem.textContent = data.server.availabilityZone || 'local-dev';
        }
        ipAddressElem.textContent = Array.isArray(data.server.ipAddresses)
          ? data.server.ipAddresses.join(', ')
          : '127.0.0.1';
        if (requestsServedElem) {
          requestsServedElem.textContent = `${data.server.requestsServed || 1} reqs`;
        }
        if (memoryUsageElem && data.server.memory) {
          memoryUsageElem.textContent = `RAM: ${data.server.memory.usedPercent}% (${data.server.memory.usedMb}MB)`;
        }
        if (uptimeElem) {
          uptimeElem.textContent = `Uptime: ${data.server.uptimeSeconds}s (Node ${data.server.nodeVersion})`;
        }
      }

      const dbHost = data.environment?.dbHost || data.database?.host || '127.0.0.1';
      const dbPort = data.environment?.dbPort || data.database?.port || 3306;
      const dbName = data.environment?.dbName || data.database?.name || 'pxldb';
      const dbUser = data.environment?.dbUser || data.database?.user || 'pxluser';

      dbEndpointElem.textContent = `${dbHost}:${dbPort}`;

      const dbVer = data.database?.version ? ` (MySQL ${data.database.version})` : '';
      const dbRows =
        data.database?.recordCount !== undefined && data.database?.recordCount !== null
          ? ` - ${data.database.recordCount} rows`
          : '';
      dbDatabaseNameElem.textContent = `Target: ${dbName}${dbVer}${dbRows}`;

      const isConnected = data.database?.isConnected ?? data.database?.connected ?? false;
      isDbConnected = Boolean(isConnected);

      latestDbDiagnostics = {
        connected: isDbConnected,
        status: isDbConnected ? 'connected' : 'disconnected',
        lastChecked: data.database?.lastChecked || new Date().toISOString(),
        latencyMs: data.database?.latencyMs ?? null,
        version: data.database?.version ?? null,
        recordCount: data.database?.recordCount ?? 0,
        error: data.database?.lastError ?? null,
        errorCode: data.database?.errorCode ?? (isDbConnected ? null : 'DISCONNECTED'),
        target: {
          host: dbHost,
          port: dbPort,
          database: dbName,
          user: dbUser
        }
      };

      if (isDbConnected) {
        dbBadge.className = 'badge badge-success';
        const latency =
          data.database?.latencyMs !== null && data.database?.latencyMs !== undefined
            ? ` (${data.database.latencyMs}ms)`
            : '';
        dbBadgeText.textContent = `Database: Connected${latency}`;
        dbBadge.title = 'Database connected.';
      } else {
        dbBadge.className = 'badge badge-danger';
        dbBadgeText.textContent = 'Database: Disconnected';
        dbBadge.title = 'Database disconnected. Click to open diagnostics.';
      }
    } catch {
      isDbConnected = false;
      dbBadge.className = 'badge badge-danger';
      dbBadgeText.textContent = 'Database: Connection Failed';
      dbBadge.title = 'Database connection failed. Click to open diagnostics.';

      latestDbDiagnostics = {
        connected: false,
        status: 'disconnected',
        lastChecked: new Date().toISOString(),
        latencyMs: null,
        version: null,
        recordCount: 0,
        error: 'Network request to /api/info failed',
        errorCode: 'ERR_FETCH_FAILED',
        target: {
          host: '127.0.0.1',
          port: 3306,
          database: 'pxldb',
          user: 'pxluser'
        }
      };
    }
  }

  async function fetchContacts() {
    try {
      const res = await fetch('/api/contacts');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        contactsBody.innerHTML = '';
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 6;
        cell.className = 'text-center text-muted';
        cell.textContent = errorData.error || 'Database unavailable. Unable to load contacts.';
        row.appendChild(cell);
        contactsBody.appendChild(row);
        return;
      }

      const data = await res.json();
      contactsBody.innerHTML = '';

      if (!Array.isArray(data) || data.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 6;
        cell.className = 'text-center text-muted';
        cell.textContent = 'No records in database. Add a contact using the form above.';
        row.appendChild(cell);
        contactsBody.appendChild(row);
        return;
      }

      // Safe DOM construction to strictly prevent XSS
      data.forEach((contact) => {
        const row = document.createElement('tr');

        const idCell = document.createElement('td');
        idCell.textContent = `#${contact.id}`;

        const nameCell = document.createElement('td');
        const strong = document.createElement('strong');
        strong.textContent = contact.name;
        nameCell.appendChild(strong);

        const emailCell = document.createElement('td');
        emailCell.textContent = contact.email;

        const deptCell = document.createElement('td');
        deptCell.textContent = contact.department;

        const dateCell = document.createElement('td');
        dateCell.textContent = contact.created_at
          ? new Date(contact.created_at).toLocaleString()
          : 'N/A';

        const actionCell = document.createElement('td');
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-delete';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => deleteContact(contact.id, contact.name));
        actionCell.appendChild(deleteBtn);

        row.appendChild(idCell);
        row.appendChild(nameCell);
        row.appendChild(emailCell);
        row.appendChild(deptCell);
        row.appendChild(dateCell);
        row.appendChild(actionCell);

        contactsBody.appendChild(row);
      });
    } catch {
      contactsBody.innerHTML = '';
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 6;
      cell.className = 'text-center text-muted';
      cell.textContent = 'Network error while retrieving contacts.';
      row.appendChild(cell);
      contactsBody.appendChild(row);
    }
  }

  async function handleAddContact(e) {
    e.preventDefault();
    showError(null);

    const name = document.getElementById('nameInput').value.trim();
    const email = document.getElementById('emailInput').value.trim();
    const department = document.getElementById('departmentInput').value.trim();

    if (!name || !email) {
      showError('Name and email are required');
      return;
    }

    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, department: department || 'General' })
      });

      const data = await res.json();
      if (!res.ok) {
        showError(data.error || 'Failed to save contact');
        return;
      }

      contactForm.reset();
      await fetchContacts();
      await fetchServerInfo();
    } catch {
      showError('Network error while saving contact');
    }
  }

  async function deleteContact(id, name) {
    if (!confirm(`Delete contact "${name}" (#${id})?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || 'Failed to delete contact');
        return;
      }
      await fetchContacts();
      await fetchServerInfo();
    } catch {
      alert('Network error while deleting contact');
    }
  }

  contactForm.addEventListener('submit', handleAddContact);
  refreshBtn.addEventListener('click', () => {
    fetchServerInfo();
    fetchContacts();
  });

  // Database status button interaction
  dbBadge.addEventListener('click', () => {
    if (!isDbConnected) {
      openDebugModal();
    } else {
      // Button is green: secret tiny little JavaScript game to be hooked up later
    }
  });

  if (closeDebugModalBtn) {
    closeDebugModalBtn.addEventListener('click', closeDebugModal);
  }
  if (dismissDebugModalBtn) {
    dismissDebugModalBtn.addEventListener('click', closeDebugModal);
  }

  if (debugModal) {
    debugModal.addEventListener('click', (e) => {
      if (e.target === debugModal) {
        closeDebugModal();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && debugModal && !debugModal.classList.contains('hidden')) {
      closeDebugModal();
    }
  });

  if (retryPingBtn) {
    retryPingBtn.addEventListener('click', async () => {
      retryPingBtn.disabled = true;
      retryPingBtn.textContent = 'Testing...';
      try {
        const res = await fetch('/api/diagnostics/ping', { method: 'POST' });
        const diag = await res.json();
        latestDbDiagnostics = diag;
        renderDiagnostics(diag);
        await fetchServerInfo();
        if (diag.connected) {
          await fetchContacts();
        }
      } catch (err) {
        renderDiagnostics({
          connected: false,
          status: 'disconnected',
          errorCode: 'NETWORK_ERROR',
          error: err.message,
          lastChecked: new Date().toISOString(),
          target: latestDbDiagnostics?.target
        });
      } finally {
        retryPingBtn.disabled = false;
        retryPingBtn.textContent = 'Test Connection';
      }
    });
  }

  if (copyDiagBtn) {
    copyDiagBtn.addEventListener('click', async () => {
      try {
        const text = JSON.stringify(latestDbDiagnostics || {}, null, 2);
        await navigator.clipboard.writeText(text);
        const originalText = copyDiagBtn.textContent;
        copyDiagBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyDiagBtn.textContent = originalText;
        }, 2000);
      } catch {
        alert('Failed to copy diagnostics to clipboard');
      }
    });
  }

  // Initial load
  fetchServerInfo();
  fetchContacts();

  // Periodic polling for live updates
  setInterval(fetchServerInfo, 10000);
});
