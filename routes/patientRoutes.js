/* =============================================
   ROUTES: PATIENT ROUTES
   Rutas de pacientes
   ============================================= */

const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');

// Obtener pacientes disponibles
router.get('/available', patientController.getAvailablePatients);

// Obtener todos los pacientes (admin)
router.get('/all', patientController.getAllPatients);

// Obtener perfil de paciente
router.get('/:id', patientController.getPatientProfile);

// Actualizar paciente
router.put('/:id', patientController.updatePatient);

module.exports = router;
