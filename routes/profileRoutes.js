/* =============================================
   ROUTES: PROFILE ROUTES
   ============================================= */

const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');

router.put('/:userId', profileController.updateProfile);
router.put('/:userId/student', profileController.updateStudentData);
router.put('/:userId/patient', profileController.updatePatientData);
router.put('/:userId/patient/status', profileController.updatePatientStatus);
router.get('/:studentId/public-student', profileController.getStudentPublicProfile);
router.get('/:patientId/public-patient', profileController.getPatientProfile);

module.exports = router;
