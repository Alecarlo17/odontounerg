/* =============================================
   ROUTES: ADMIN ROUTES
   ============================================= */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/users', adminController.getAllUsers);
router.get('/students', adminController.getStudents);
router.get('/patients', adminController.getPatients);
router.get('/requests', adminController.getAllRequests);
router.get('/appointments', adminController.getAllAppointments);
router.put('/users/:id/suspend', adminController.suspendUser);
router.put('/users/:id/reactivate', adminController.reactivateUser);

// Métricas académicas y reportes
router.get('/metrics', adminController.getMetrics);
router.get('/reports', adminController.getReportData);
router.get('/activity-log', adminController.getActivityLog);
router.get('/treatments', adminController.getAllTreatments);


module.exports = router;
