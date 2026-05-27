/* =============================================
   ROUTES: REPORT ROUTES
   Rutas de reportes y estadísticas
   ============================================= */

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

// Obtener estadísticas del sistema
router.get('/stats', reportController.getSystemStats);

// Obtener tratamientos de un estudiante
router.get('/treatments/student/:studentId', reportController.getStudentTreatments);

// Obtener tratamientos de un paciente
router.get('/treatments/patient/:patientId', reportController.getPatientTreatments);

// Obtener distribución de tratamientos
router.get('/treatments/distribution', reportController.getTreatmentDistribution);

module.exports = router;
