/* =============================================
   CONTROLLER: APPOINTMENT CONTROLLER
   Controlador de citas odontológicas
   
   Maneja la lógica de creación, confirmación,
   cancelación y finalización de citas.
   ============================================= */

const AppointmentsModel = require('../models/appointments');

/**
 * Crear nueva cita
 */
async function createAppointment(req, res) {
  const appointment = await AppointmentsModel.createAppointment(req.body);
  if (!appointment) {
    return res.status(500).json({ success: false, message: 'Error al crear cita' });
  }
  return res.json({ success: true, data: appointment });
}

/**
 * Obtener citas del usuario
 */
async function getUserAppointments(req, res) {
  const { userId } = req.params;
  const status = req.query.status || null;
  const appointments = await AppointmentsModel.getAppointmentsByUser(userId, status);
  return res.json({ success: true, data: appointments });
}

/**
 * Confirmar cita
 */
async function confirmAppointment(req, res) {
  const success = await AppointmentsModel.updateAppointmentStatus(req.params.id, 'confirmed');
  if (!success) {
    return res.status(500).json({ success: false, message: 'Error al confirmar' });
  }
  return res.json({ success: true, message: 'Cita confirmada' });
}

/**
 * Cancelar cita
 */
async function cancelAppointment(req, res) {
  const success = await AppointmentsModel.updateAppointmentStatus(req.params.id, 'cancelled');
  if (!success) {
    return res.status(500).json({ success: false, message: 'Error al cancelar' });
  }
  return res.json({ success: true, message: 'Cita cancelada' });
}

/**
 * Finalizar cita
 */
async function completeAppointment(req, res) {
  const success = await AppointmentsModel.updateAppointmentStatus(req.params.id, 'completed');
  if (!success) {
    return res.status(500).json({ success: false, message: 'Error al finalizar' });
  }
  return res.json({ success: true, message: 'Cita finalizada' });
}

/**
 * Obtener todas las citas (admin)
 */
async function getAllAppointments(req, res) {
  const appointments = await AppointmentsModel.getAllAppointments();
  return res.json({ success: true, data: appointments });
}

module.exports = {
  createAppointment,
  getUserAppointments,
  confirmAppointment,
  cancelAppointment,
  completeAppointment,
  getAllAppointments
};
