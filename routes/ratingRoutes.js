/* =============================================
   ROUTES: RATING ROUTES
   ============================================= */

const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController');

router.post('/', ratingController.createRating);
router.get('/student/:studentId', ratingController.getStudentRatings);

module.exports = router;
