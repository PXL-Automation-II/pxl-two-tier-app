const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');

let server;
let baseUrl;

before((_, done) => {
  server = app.listen(0, '127.0.0.1', () => {
    baseUrl = `http://127.0.0.1:${server.address().port}`;
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

describe('Application Core Endpoints', () => {
  it('GET /health returns JSON with health information', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.ok(res.headers.get('content-type')?.includes('application/json'));
    // DB is not running during local unit test, so it returns 503 degraded, which is expected
    assert.ok([200, 503].includes(res.status));
    const body = await res.json();
    assert.ok(['healthy', 'degraded'].includes(body.status));
    assert.ok(body.timestamp);
    assert.ok(['connected', 'disconnected'].includes(body.database));
  });

  it('GET /api/info returns server environment and host metadata', async () => {
    const res = await fetch(`${baseUrl}/api/info`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.server);
    assert.ok(body.server.hostname);
    assert.ok(body.server.platform);
    assert.strictEqual(typeof body.server.uptimeSeconds, 'number');
    assert.ok(body.environment);
    assert.strictEqual(typeof body.environment.dbHost, 'string');
  });

  it('GET / returns HTML dashboard', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get('content-type')?.includes('text/html'));
    const html = await res.text();
    assert.ok(html.includes('PXL Automation II'));
  });
});

describe('Input Validation & Security Controls', () => {
  it('POST /api/contacts rejects requests with missing name', async () => {
    const res = await fetch(`${baseUrl}/api/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'valid@pxl.be', department: 'IT' })
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.ok(body.error.includes('name'));
  });

  it('POST /api/contacts rejects invalid email formats', async () => {
    const res = await fetch(`${baseUrl}/api/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'John Doe', email: 'not-an-email', department: 'IT' })
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.ok(body.error.includes('email'));
  });

  it('DELETE /api/contacts/:id rejects non-numeric contact IDs', async () => {
    const res = await fetch(`${baseUrl}/api/contacts/abc`, {
      method: 'DELETE'
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.ok(body.error.includes('positive integer'));
  });

  it('Rejects malformed JSON payloads with HTTP 400', async () => {
    const res = await fetch(`${baseUrl}/api/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ malformed json: }'
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.ok(body.error.includes('Malformed JSON'));
  });
});
