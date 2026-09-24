const express = require('express');
const healthController = require('../controllers/healthController');

const router = express.Router();

router.get('/health', healthController.getHealth);
router.get('/api/info', healthController.getInfo);
router.get('/api/diagnostics', healthController.getDiagnostics);
router.post('/api/diagnostics/ping', healthController.postDiagnosticsPing);

module.exports = router;
