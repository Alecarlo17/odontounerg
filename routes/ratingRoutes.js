/* =============================================
   ROUTES: RATING ROUTES
   ============================================= */

const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController');

router.post('/student', ratingController.rateStudent);
router.post('/patient', ratingController.ratePatient);
router.get('/student/:studentId', ratingController.getRatings);
router.get('/students/averages', ratingController.getStudentsAverages);
router.get('/patient/:patientId/responsibility', ratingController.getPatientResponsibilityStatus);

module.exports = router;
