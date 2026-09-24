const express = require('express');
const healthController = require('../controllers/healthController');

const router = express.Router();

// Primary health & observability routes
router.get('/health', healthController.getHealth);
router.get('/live', healthController.getLiveness);
router.get('/livez', healthController.getLiveness);
router.get('/ready', healthController.getReadiness);
router.get('/readyz', healthController.getReadiness);
router.get('/api/info', healthController.getInfo);
router.get('/api/diagnostics', healthController.getDiagnostics);
router.post('/api/diagnostics/ping', healthController.postDiagnosticsPing);

module.exports = router;
