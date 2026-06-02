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

// Tratamientos e historiales
router.get('/treatments/:role/:userId', dashboardController.getTreatments);
router.post('/treatments', dashboardController.createTreatment);

module.exports = router;
