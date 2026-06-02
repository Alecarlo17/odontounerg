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
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;
