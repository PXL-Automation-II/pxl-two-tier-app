const { describe, it } = require('node:test');
const assert = require('node:assert');
const env = require('../../src/config/env');

describe('Unit: Environment Configuration', () => {
  it('loads valid default server port as an integer', () => {
    assert.strictEqual(typeof env.PORT, 'number');
    assert.ok(env.PORT > 0 && env.PORT <= 65535);
  });

  it('loads database host and user configurations', () => {
    assert.strictEqual(typeof env.DB_HOST, 'string');
    assert.ok(env.DB_HOST.length > 0);
    assert.strictEqual(typeof env.DB_USER, 'string');
    assert.ok(env.DB_USER.length > 0);
  });

  it('loads valid database port and timeouts', () => {
    assert.strictEqual(typeof env.DB_PORT, 'number');
    assert.strictEqual(env.DB_PORT, 3306);
    assert.strictEqual(typeof env.DB_CONNECT_TIMEOUT, 'number');
    assert.ok(env.DB_CONNECT_TIMEOUT >= 1000);
    assert.strictEqual(typeof env.HEALTH_CHECK_INTERVAL, 'number');
    assert.ok(env.HEALTH_CHECK_INTERVAL >= 1000);
  });
});
