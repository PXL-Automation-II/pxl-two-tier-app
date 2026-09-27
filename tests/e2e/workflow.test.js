const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('../../src/app');
const { setPool } = require('../../src/config/db');
const contactService = require('../../src/services/contactService');

let server;
let baseUrl;
let mockDbRows = [];
let dbHealthy = true;

before((_, done) => {
  mockDbRows = [{ id: 1, name: 'Initial Contact', email: 'initial@pxl.be', department: 'Cloud' }];

  const simulatedPool = {
    async query(sql, params) {
      if (!dbHealthy) {
        throw new Error('Connection lost: simulated database outage');
      }
      if (typeof sql === 'string' && sql.includes('SELECT 1')) {
        return [[{ 1: 1 }]];
      }
      if (typeof sql === 'string' && sql.includes('CREATE TABLE')) {
        return [{}];
      }
      if (typeof sql === 'string' && sql.includes('SELECT COUNT(*)')) {
        return [[{ total: mockDbRows.length }]];
      }
      if (typeof sql === 'string' && sql.includes('SELECT id, name, email')) {
        return [[...mockDbRows]];
      }
      if (typeof sql === 'string' && sql.includes('INSERT INTO contacts')) {
        const newId = Date.now();
        const newRecord = {
          id: newId,
          name: params[0],
          email: params[1],
          department: params[2],
          created_at: new Date().toISOString()
        };
        mockDbRows.push(newRecord);
        return [{ insertId: newId }];
      }
      if (typeof sql === 'string' && sql.includes('DELETE FROM contacts')) {
        const id = params[0];
        const prevLength = mockDbRows.length;
        mockDbRows = mockDbRows.filter((r) => r.id !== id);
        return [{ affectedRows: prevLength - mockDbRows.length }];
      }
      return [[]];
    }
  };

  setPool(simulatedPool);

  server = app.listen(0, '127.0.0.1', async () => {
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    await contactService.pingDatabase();
    done();
  });
});

after((_, done) => {
  if (server) {
    server.close(done);
  } else {
    done();
  }
});

describe('E2E: Full Application User Workflows', () => {
  it('Flow 1: Initial client discovery and health inspection', async () => {
    // Step 1: Client loads the frontend HTML
    const pageRes = await fetch(`${baseUrl}/`);
    assert.strictEqual(pageRes.status, 200);
    const html = await pageRes.text();
    assert.ok(html.includes('PXL Automation II'));

    // Step 2: Client inspects system information
    const infoRes = await fetch(`${baseUrl}/api/info`);
    assert.strictEqual(infoRes.status, 200);
    const info = await infoRes.json();
    assert.strictEqual(info.app, 'PXL Two-Tier Cloud Web Application');
    assert.ok(info.server.hostname);

    // Step 3: AWS ALB health check verifies instance is healthy (HTTP 200)
    const healthRes = await fetch(`${baseUrl}/health`);
    assert.strictEqual(healthRes.status, 200);
    const health = await healthRes.json();
    assert.strictEqual(health.status, 'healthy');
    assert.strictEqual(health.database, 'connected');
  });

  it('Flow 2: Complete CRUD lifecycle for contact records', async () => {
    // Step 1: Read existing contacts
    const listRes1 = await fetch(`${baseUrl}/api/contacts`);
    assert.strictEqual(listRes1.status, 200);
    const initialList = await listRes1.json();
    const initialCount = initialList.length;

    // Step 2: Create a new contact
    const createRes = await fetch(`${baseUrl}/api/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jane Doe',
        email: 'jane.doe@pxl.be',
        department: 'Cloud Systems'
      })
    });
    assert.strictEqual(createRes.status, 201);
    const created = await createRes.json();
    assert.ok(created.id);
    assert.strictEqual(created.name, 'Jane Doe');

    // Step 3: Verify contact is in the list
    const listRes2 = await fetch(`${baseUrl}/api/contacts`);
    const updatedList = await listRes2.json();
    assert.strictEqual(updatedList.length, initialCount + 1);
    assert.ok(updatedList.some((c) => c.id === created.id));

    // Step 4: Delete the contact
    const deleteRes = await fetch(`${baseUrl}/api/contacts/${created.id}`, {
      method: 'DELETE'
    });
    assert.strictEqual(deleteRes.status, 200);
    const deleteResult = await deleteRes.json();
    assert.ok(deleteResult.message.includes('successfully deleted'));

    // Step 5: Verify contact is removed
    const listRes3 = await fetch(`${baseUrl}/api/contacts`);
    const finalList = await listRes3.json();
    assert.strictEqual(finalList.length, initialCount);
    assert.strictEqual(
      finalList.some((c) => c.id === created.id),
      false
    );
  });

  it('Flow 3: Graceful degradation and recovery during database outage', async () => {
    // Simulate database failure
    dbHealthy = false;
    await contactService.pingDatabase();

    // Verification 1: Health check immediately flags 503 degraded for ALB
    const degradedHealthRes = await fetch(`${baseUrl}/health`);
    assert.strictEqual(degradedHealthRes.status, 503);
    const degradedHealth = await degradedHealthRes.json();
    assert.strictEqual(degradedHealth.status, 'degraded');
    assert.strictEqual(degradedHealth.database, 'disconnected');

    // Verification 2: API endpoints report 503 Service Unavailable
    const degradedApiRes = await fetch(`${baseUrl}/api/contacts`);
    assert.strictEqual(degradedApiRes.status, 503);

    // Simulate database recovery
    dbHealthy = true;
    await contactService.pingDatabase();

    // Verification 3: Health check returns 200 healthy
    const recoveredHealthRes = await fetch(`${baseUrl}/health`);
    assert.strictEqual(recoveredHealthRes.status, 200);
    const recoveredHealth = await recoveredHealthRes.json();
    assert.strictEqual(recoveredHealth.status, 'healthy');

    // Verification 4: API endpoints resume normal operations
    const recoveredApiRes = await fetch(`${baseUrl}/api/contacts`);
    assert.strictEqual(recoveredApiRes.status, 200);
  });
});
