const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('../../src/app');

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

describe('Integration: API & HTTP Layer', () => {
  describe('GET /health', () => {
    it('returns valid JSON health report compliant with ALB Target Groups', async () => {
      const res = await fetch(`${baseUrl}/health`);
      assert.ok([200, 503].includes(res.status));
      assert.ok(res.headers.get('content-type')?.includes('application/json'));

      const body = await res.json();
      assert.ok(['healthy', 'degraded'].includes(body.status));
      assert.ok(body.timestamp);
      assert.ok(['connected', 'disconnected'].includes(body.database));
      assert.ok(body.server);
      assert.ok(body.server.hostname);
    });
  });

  describe('GET /api/info', () => {
    it('returns server environment, host architecture, and database state', async () => {
      const res = await fetch(`${baseUrl}/api/info`);
      assert.strictEqual(res.status, 200);
      assert.ok(res.headers.get('content-type')?.includes('application/json'));

      const body = await res.json();
      assert.strictEqual(body.app, 'PXL Two-Tier Cloud Web Application');
      assert.ok(body.server.hostname);
      assert.ok(body.server.platform);
      assert.strictEqual(typeof body.server.uptimeSeconds, 'number');
      assert.strictEqual(body.environment.dbPort, 3306);
    });
  });

  describe('GET / (Dashboard Static Delivery)', () => {
    it('serves HTML dashboard with 200 OK', async () => {
      const res = await fetch(`${baseUrl}/`);
      assert.strictEqual(res.status, 200);
      assert.ok(res.headers.get('content-type')?.includes('text/html'));
      const text = await res.text();
      assert.ok(text.includes('PXL Automation II'));
    });
  });

  describe('HTTP Error Handling & Route Protection', () => {
    it('returns 404 JSON response for nonexistent API route', async () => {
      const res = await fetch(`${baseUrl}/api/unknown-endpoint`);
      assert.strictEqual(res.status, 404);
      const body = await res.json();
      assert.ok(body.error.includes('Route GET /api/unknown-endpoint not found'));
    });

    it('returns 400 JSON response on malformed JSON payload', async () => {
      const res = await fetch(`${baseUrl}/api/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"invalid": json syntax}'
      });
      assert.strictEqual(res.status, 400);
      const body = await res.json();
      assert.strictEqual(body.error, 'Malformed JSON in request body');
    });

    it('returns 400 Bad Request when contact name is missing', async () => {
      const res = await fetch(`${baseUrl}/api/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@pxl.be' })
      });
      assert.strictEqual(res.status, 400);
      const body = await res.json();
      assert.ok(body.error.includes('"name" is required'));
    });

    it('returns 400 Bad Request when email format is invalid', async () => {
      const res = await fetch(`${baseUrl}/api/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Valid Name', email: 'invalid-email' })
      });
      assert.strictEqual(res.status, 400);
      const body = await res.json();
      assert.ok(body.error.includes('valid email address'));
    });

    it('returns 400 Bad Request when contact ID is not a positive integer', async () => {
      const res = await fetch(`${baseUrl}/api/contacts/abc`, {
        method: 'DELETE'
      });
      assert.strictEqual(res.status, 400);
      const body = await res.json();
      assert.ok(body.error.includes('positive integer'));
    });
  });

  describe('HTTP Defensive Security Headers', () => {
    it('sets protective security headers on responses', async () => {
      const res = await fetch(`${baseUrl}/health`);
      assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
      assert.strictEqual(res.headers.get('x-frame-options'), 'SAMEORIGIN');
      assert.strictEqual(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
      assert.strictEqual(res.headers.get('x-powered-by'), null);
    });
  });
});
