/* =============================================
   CONTROLLER: RATING CONTROLLER
   ============================================= */

const RatingsModel = require('../models/ratings');

/**
 * Endpoint para que un paciente califique a un estudiante
 */
async function rateStudent(req, res) {
  const { studentId, patientId, rating, comment } = req.body;
  // patientId puede venir del body (sin auth middleware) o de req.user
  const finalPatientId = patientId || (req.user ? req.user.id : null);

  if (!studentId || !rating || !finalPatientId) {
    return res.status(400).json({ success: false, message: 'Datos incompletos: se requiere studentId, patientId y rating' });
  }

  const result = await RatingsModel.createRating(studentId, finalPatientId, parseInt(rating), comment || '');
  if (result.success) {
    res.json({ success: true, message: 'Calificación enviada' });
  } else {
    res.status(500).json(result);
  }
}

/**
 * Endpoint para que un estudiante califique a un paciente
 */
async function ratePatient(req, res) {
  const { studentId, patientId, rating, responsibility, comment } = req.body;
  const finalStudentId = studentId || (req.user ? req.user.id : null);

  if (!patientId || !rating || !responsibility || !finalStudentId) {
    return res.status(400).json({ success: false, message: 'Datos incompletos' });
  }

  // Prefix comment with [P_RATING][responsibility]
  const fullComment = `[P_RATING][${responsibility}] ${comment || ''}`;

  const result = await RatingsModel.createRating(finalStudentId, patientId, parseInt(rating), fullComment);
  if (result.success) {
    res.json({ success: true, message: 'Calificación enviada al paciente' });
  } else {
    res.status(500).json(result);
  }
}

/**
 * Obtener calificaciones del estudiante
 */
async function getRatings(req, res) {
  const { studentId } = req.params;
  const ratings = await RatingsModel.getStudentRatings(studentId);
  const { avg, count } = await RatingsModel.getStudentAverage(studentId);

  res.json({ success: true, data: { ratings, avgRating: avg.toFixed(1), totalCount: count } });
}

/**
 * Obtener todos los promedios de estudiantes en masa
 */
async function getStudentsAverages(req, res) {
  const averages = await RatingsModel.getAllStudentsAverages();
  res.json({ success: true, data: averages });
}

/**
 * Obtener estatus de responsabilidad de un paciente
 */
async function getPatientResponsibilityStatus(req, res) {
  const { patientId } = req.params;
  const status = await RatingsModel.getPatientResponsibility(patientId);
  res.json({ success: true, status });
}

module.exports = {
  rateStudent,
  ratePatient,
  getRatings,
  getStudentsAverages,
  getPatientResponsibilityStatus
};
