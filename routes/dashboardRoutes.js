/* =============================================
   ROUTES: DASHBOARD ROUTES
   ============================================= */

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// Estadísticas de dashboards
router.get('/patient/:userId', dashboardController.getPatientDashboard);
router.get('/student/:userId', dashboardController.getStudentDashboard);
router.get('/admin', dashboardController.getAdminDashboard);

// Métricas académicas y reportes (admin)
router.get('/admin/metrics', dashboardController.getAdminMetrics);
router.get('/admin/reports', dashboardController.getAdminReports);

// Estado del caso (timeline del paciente)
router.get('/case-status/:patientId', dashboardController.getCaseStatus);

// Sesiones clínicas
router.get('/treatments/:treatmentId/sessions', dashboardController.getSessionsByTreatment);
router.post('/treatments/:treatmentId/sessions', dashboardController.createSession);

// Tratamientos
router.get('/treatments/:role/:userId', dashboardController.getTreatments);
router.post('/treatments', dashboardController.createTreatment);
router.put('/treatments/:treatmentId/status', dashboardController.updateTreatmentStatus);

// Calificaciones
router.post('/ratings', dashboardController.createRating);

module.exports = router;
