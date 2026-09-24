const contactService = require('../services/contactService');
const logger = require('../utils/logger');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function getContacts(req, res) {
  try {
    const contacts = await contactService.getAllContacts();
    res.json(contacts);
  } catch (err) {
    const dbState = contactService.getDatabaseState();
    if (!dbState.isConnected) {
      return res
        .status(503)
        .json({ error: 'Database service unavailable', details: dbState.lastError });
    }
    logger.error('Error fetching contacts:', err.message);
    res.status(500).json({ error: 'Internal server error while fetching contacts' });
  }
}

async function addContact(req, res) {
  const { name, email, department } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res
      .status(400)
      .json({ error: 'Field "name" is required and must be a non-empty string' });
  }
  if (name.trim().length > 100) {
    return res.status(400).json({ error: 'Field "name" cannot exceed 100 characters' });
  }

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return res
      .status(400)
      .json({ error: 'Field "email" is required and must be a valid email address' });
  }
  if (email.trim().length > 100) {
    return res.status(400).json({ error: 'Field "email" cannot exceed 100 characters' });
  }

  const cleanDept = department && typeof department === 'string' ? department.trim() : 'General';
  if (cleanDept.length > 100) {
    return res.status(400).json({ error: 'Field "department" cannot exceed 100 characters' });
  }

  try {
    const created = await contactService.createContact({
      name: name.trim(),
      email: email.trim(),
      department: cleanDept
    });
    res.status(201).json(created);
  } catch (err) {
    const dbState = contactService.getDatabaseState();
    if (!dbState.isConnected) {
      return res
        .status(503)
        .json({ error: 'Database service unavailable', details: dbState.lastError });
    }
    logger.error('Error creating contact:', err.message);
    res.status(500).json({ error: 'Internal server error while creating contact' });
  }
}

async function removeContact(req, res) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Parameter "id" must be a positive integer' });
  }

  try {
    const deleted = await contactService.deleteContact(id);
    if (!deleted) {
      return res.status(404).json({ error: `Contact with ID ${id} not found` });
    }
    res.json({ message: `Contact with ID ${id} successfully deleted` });
  } catch (err) {
    const dbState = contactService.getDatabaseState();
    if (!dbState.isConnected) {
      return res
        .status(503)
        .json({ error: 'Database service unavailable', details: dbState.lastError });
    }
    logger.error('Error deleting contact:', err.message);
    res.status(500).json({ error: 'Internal server error while deleting contact' });
  }
}

module.exports = {
  getContacts,
  addContact,
  removeContact
};
