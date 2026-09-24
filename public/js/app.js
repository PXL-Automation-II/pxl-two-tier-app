document.addEventListener('DOMContentLoaded', () => {
  const dbBadge = document.getElementById('dbBadge');
  const dbBadgeText = document.getElementById('dbBadgeText');
  const hostnameElem = document.getElementById('hostname');
  const ipAddressElem = document.getElementById('ipAddress');
  const dbEndpointElem = document.getElementById('dbEndpoint');
  const dbDatabaseNameElem = document.getElementById('dbDatabaseName');
  const uptimeElem = document.getElementById('uptime');
  const runtimeVersionElem = document.getElementById('runtimeVersion');
  const contactsBody = document.getElementById('contactsBody');
  const contactForm = document.getElementById('contactForm');
  const refreshBtn = document.getElementById('refreshBtn');
  const formError = document.getElementById('formError');

  function showError(msg) {
    if (!msg) {
      formError.classList.add('hidden');
      formError.textContent = '';
      return;
    }
    formError.classList.remove('hidden');
    formError.textContent = msg;
  }

  async function fetchServerInfo() {
    try {
      const res = await fetch('/api/info');
      const data = await res.json();

      if (data.server) {
        hostnameElem.textContent = data.server.hostname || 'Unknown';
        ipAddressElem.textContent = Array.isArray(data.server.ipAddresses)
          ? data.server.ipAddresses.join(', ')
          : '127.0.0.1';
        uptimeElem.textContent = `${data.server.uptimeSeconds}s`;
        runtimeVersionElem.textContent = `Node.js ${data.server.nodeVersion}`;
      }

      const dbHost = data.environment?.dbHost || data.database?.host || '127.0.0.1';
      const dbPort = data.environment?.dbPort || data.database?.port || 3306;
      const dbName = data.environment?.dbName || data.database?.name || 'pxldb';

      dbEndpointElem.textContent = `${dbHost}:${dbPort}`;
      dbDatabaseNameElem.textContent = `Target: ${dbName}`;

      const isConnected = data.database?.isConnected ?? data.database?.connected ?? false;
      if (isConnected) {
        dbBadge.className = 'badge badge-success';
        const latency =
          data.database?.latencyMs !== null && data.database?.latencyMs !== undefined
            ? ` (${data.database.latencyMs}ms)`
            : '';
        dbBadgeText.textContent = `Database: Connected${latency}`;
      } else {
        dbBadge.className = 'badge badge-danger';
        dbBadgeText.textContent = 'Database: Disconnected';
      }
    } catch {
      dbBadge.className = 'badge badge-danger';
      dbBadgeText.textContent = 'Database: Connection Failed';
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

  // Initial load
  fetchServerInfo();
  fetchContacts();

  // Periodic polling for live updates
  setInterval(fetchServerInfo, 10000);
});
