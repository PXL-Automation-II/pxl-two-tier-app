const { describe, it } = require('node:test');
const assert = require('node:assert');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateContactInput({ name, email, department }) {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return { valid: false, error: 'Field "name" is required and must be a non-empty string' };
  }
  if (name.trim().length > 100) {
    return { valid: false, error: 'Field "name" cannot exceed 100 characters' };
  }

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return { valid: false, error: 'Field "email" is required and must be a valid email address' };
  }
  if (email.trim().length > 100) {
    return { valid: false, error: 'Field "email" cannot exceed 100 characters' };
  }

  const cleanDept = department && typeof department === 'string' ? department.trim() : 'General';
  if (cleanDept.length > 100) {
    return { valid: false, error: 'Field "department" cannot exceed 100 characters' };
  }

  return {
    valid: true,
    data: {
      name: name.trim(),
      email: email.trim(),
      department: cleanDept
    }
  };
}

function validateId(param) {
  const id = parseInt(param, 10);
  if (isNaN(id) || id <= 0) {
    return { valid: false, error: 'Parameter "id" must be a positive integer' };
  }
  return { valid: true, id };
}

describe('Unit: Input Validation Logic', () => {
  describe('Contact Creation Validation', () => {
    it('accepts valid contact payloads', () => {
      const result = validateContactInput({
        name: 'Jane Cloud',
        email: 'jane@pxl.be',
        department: 'Infrastructure'
      });
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.data.name, 'Jane Cloud');
      assert.strictEqual(result.data.email, 'jane@pxl.be');
      assert.strictEqual(result.data.department, 'Infrastructure');
    });

    it('defaults department to General if not provided', () => {
      const result = validateContactInput({
        name: 'Jane Cloud',
        email: 'jane@pxl.be'
      });
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.data.department, 'General');
    });

    it('rejects empty or whitespace-only name', () => {
      const result = validateContactInput({ name: '   ', email: 'valid@pxl.be' });
      assert.strictEqual(result.valid, false);
      assert.ok(result.error.includes('"name" is required'));
    });

    it('rejects name exceeding 100 characters', () => {
      const result = validateContactInput({ name: 'A'.repeat(101), email: 'valid@pxl.be' });
      assert.strictEqual(result.valid, false);
      assert.ok(result.error.includes('cannot exceed 100 characters'));
    });

    it('rejects invalid email formats', () => {
      const invalidEmails = ['plainaddress', '@missingusername.com', 'user@domain', 'user@.com'];
      for (const email of invalidEmails) {
        const result = validateContactInput({ name: 'Valid User', email });
        assert.strictEqual(result.valid, false, `Expected ${email} to fail validation`);
      }
    });

    it('rejects email exceeding 100 characters', () => {
      const longEmail = `${'a'.repeat(95)}@pxl.be`;
      const result = validateContactInput({ name: 'Valid User', email: longEmail });
      assert.strictEqual(result.valid, false);
      assert.ok(result.error.includes('cannot exceed 100 characters'));
    });
  });

  describe('Contact ID Parameter Validation', () => {
    it('accepts valid positive integer IDs', () => {
      const result = validateId('42');
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.id, 42);
    });

    it('rejects zero or negative IDs', () => {
      assert.strictEqual(validateId('0').valid, false);
      assert.strictEqual(validateId('-5').valid, false);
    });

    it('rejects non-numeric string values', () => {
      assert.strictEqual(validateId('abc').valid, false);
      assert.strictEqual(validateId('').valid, false);
    });
  });
});
