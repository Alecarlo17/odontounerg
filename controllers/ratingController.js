/* =============================================
   CONTROLLER: RATING CONTROLLER
   ============================================= */

const RatingsModel = require('../models/ratings');

async function createRating(req, res) {
  const { studentId, patientId, rating, comment } = req.body;
  if (!studentId || !patientId || !rating) {
    return res.status(400).json({ success: false, message: 'Faltan datos obligatorios' });
  }

  const result = await RatingsModel.createRating(studentId, patientId, rating, comment);
  if (!result.success) {
    return res.status(500).json(result);
  }
  return res.json(result);
}

async function getStudentRatings(req, res) {
  const { studentId } = req.params;
  const ratings = await RatingsModel.getStudentRatings(studentId);
  const avgData = await RatingsModel.getStudentAverage(studentId);
  return res.json({ success: true, data: { ratings, stats: avgData } });
}

module.exports = {
  createRating,
  getStudentRatings
};
