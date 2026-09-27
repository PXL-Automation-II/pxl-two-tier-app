const express = require('express');
const contactController = require('../controllers/contactController');

const router = express.Router();

router.get('/contacts', contactController.getContacts);
router.post('/contacts', contactController.addContact);
router.delete('/contacts/:id', contactController.removeContact);

module.exports = router;
