const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { setPool } = require('../../src/config/db');
const contactService = require('../../src/services/contactService');

describe('Unit: Contact Service Business Logic', () => {
  let mockDbRows;

  beforeEach(() => {
    mockDbRows = [
      { id: 1, name: 'Alice Test', email: 'alice@pxl.be', department: 'Cloud' },
      { id: 2, name: 'Bob Test', email: 'bob@pxl.be', department: 'DevOps' }
    ];

    const mockPool = {
      async query(sql, params) {
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
          return [mockDbRows];
        }
        if (typeof sql === 'string' && sql.includes('INSERT INTO contacts')) {
          const newId = mockDbRows.length + 1;
          mockDbRows.push({ id: newId, name: params[0], email: params[1], department: params[2] });
          return [{ insertId: newId }];
        }
        if (typeof sql === 'string' && sql.includes('DELETE FROM contacts')) {
          const id = params[0];
          const initialLength = mockDbRows.length;
          mockDbRows = mockDbRows.filter((r) => r.id !== id);
          return [{ affectedRows: initialLength - mockDbRows.length }];
        }
        return [[]];
      }
    };

    setPool(mockPool);
  });

  it('pingDatabase establishes connection and measures latency', async () => {
    const success = await contactService.pingDatabase();
    assert.strictEqual(success, true);
    const state = contactService.getDatabaseState();
    assert.strictEqual(state.isConnected, true);
    assert.strictEqual(typeof state.latencyMs, 'number');
  });

  it('getAllContacts returns all database records', async () => {
    const contacts = await contactService.getAllContacts();
    assert.strictEqual(contacts.length, 2);
    assert.strictEqual(contacts[0].name, 'Alice Test');
  });

  it('createContact inserts a new record with generated ID', async () => {
    const created = await contactService.createContact({
      name: 'Charlie Test',
      email: 'charlie@pxl.be',
      department: 'QA'
    });
    assert.strictEqual(created.id, 3);
    assert.strictEqual(created.name, 'Charlie Test');

    const updatedList = await contactService.getAllContacts();
    assert.strictEqual(updatedList.length, 3);
  });

  it('deleteContact removes existing record and returns true', async () => {
    const deleted = await contactService.deleteContact(1);
    assert.strictEqual(deleted, true);

    const updatedList = await contactService.getAllContacts();
    assert.strictEqual(updatedList.length, 1);
    assert.strictEqual(updatedList[0].id, 2);
  });

  it('deleteContact returns false when record does not exist', async () => {
    const deleted = await contactService.deleteContact(999);
    assert.strictEqual(deleted, false);
  });
});
