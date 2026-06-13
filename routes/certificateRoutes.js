const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificateController');

// Generar certificado PDF
router.post('/generate/:requestId', certificateController.createCertificatePDF);

module.exports = router;
