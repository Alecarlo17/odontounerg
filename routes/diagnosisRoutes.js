const express = require('express');
const router = express.Router();
const diagnosisController = require('../controllers/diagnosisController');

// Obtener diagnóstico de un paciente
router.get('/:patientId', diagnosisController.getDiagnosis);

// Registrar nuevo diagnóstico
router.post('/', diagnosisController.createDiagnosis);

// Iniciar nuevo caso
router.post('/:patientId/new-case', diagnosisController.startNewCase);

// Cerrar caso
router.post('/:patientId/close', diagnosisController.closeCase);

module.exports = router;
