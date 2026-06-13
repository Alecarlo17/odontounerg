/* =============================================
   CONTROLLER: APPOINTMENT CONTROLLER
   ============================================= */

const AppointmentsModel = require('../models/appointments');
const { sendNotification, logActivity } = require('../services/notificationService');
const db = require('../config/database');

/**
 * Crear nueva cita
 */
async function createAppointment(req, res) {
  const { requestId, proposedBy, date, duration, location, notes } = req.body;

  if (!requestId || !proposedBy || !date) {
    return res.status(400).json({ success: false, message: 'Datos incompletos para crear cita' });
  }

  try {
    // Obtener datos del request para conseguir student_id y patient_id
    const { data: requestRow } = await db.supabase
      .from('requests')
      .select('student_id, patient_id, student:student_id(full_name), patient:patient_id(full_name)')
      .eq('id', requestId)
      .maybeSingle();

    if (!requestRow) {
      return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
    }

    const studentId = requestRow.student_id;
    const patientId = requestRow.patient_id;
    const studentName = Array.isArray(requestRow.student) ? requestRow.student[0]?.full_name : requestRow.student?.full_name;

    // Validar cita duplicada
    const { conflict, message: conflictMsg } = await AppointmentsModel.checkDuplicateAppointment(
      studentId, patientId, date, duration || 60
    );

    if (conflict) {
      return res.status(409).json({ success: false, message: conflictMsg });
    }

    const appointment = await AppointmentsModel.createAppointment({ requestId, proposedBy, date, duration, location, notes });
    if (!appointment) {
      return res.status(500).json({ success: false, message: 'Error al crear cita' });
    }

    // Determinar destinatario de la notificación (el que NO propuso)
    const recipientId = proposedBy === studentId ? patientId : studentId;
    const proposerName = proposedBy === studentId ? (studentName || 'El estudiante') : 'El paciente';
    const apptDate = new Date(date).toLocaleDateString('es-VE');

    await sendNotification(
      recipientId,
      'cita',
      'Nueva cita propuesta',
      `${proposerName} ha propuesto una cita para el ${apptDate}.`
    );

    await logActivity(proposedBy, studentName || 'Usuario', 'Cita creada', 'Citas', `Cita propuesta para ${apptDate}`);

    return res.json({ success: true, data: appointment });
  } catch (e) {
    console.error('Error en createAppointment:', e);
    return res.status(500).json({ success: false, message: 'Error interno al crear cita' });
  }
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
  const { id } = req.params;

  try {
    const appt = await AppointmentsModel.getAppointmentById(id);
    const success = await AppointmentsModel.updateAppointmentStatus(id, 'confirmed');

    if (!success) {
      return res.status(500).json({ success: false, message: 'Error al confirmar' });
    }

    if (appt?.request) {
      const req_data = appt.request;
      const studentName = Array.isArray(req_data.student) ? req_data.student[0]?.full_name : req_data.student?.full_name;
      const apptDate = new Date(appt.date).toLocaleDateString('es-VE');

      await sendNotification(
        req_data.student_id,
        'cita',
        'Cita confirmada',
        `Tu cita del ${apptDate} ha sido confirmada por el paciente.`
      );

      await logActivity(req_data.patient_id, 'Paciente', 'Cita confirmada', 'Citas', `Cita confirmada para ${apptDate}`);
    }

    return res.json({ success: true, message: 'Cita confirmada' });
  } catch (e) {
    console.error('Error en confirmAppointment:', e);
    return res.status(500).json({ success: false, message: 'Error al confirmar cita' });
  }
}

/**
 * Cancelar cita
 */
async function cancelAppointment(req, res) {
  const { id } = req.params;
  const { cancelledBy } = req.body || {};

  try {
    const appt = await AppointmentsModel.getAppointmentById(id);
    const success = await AppointmentsModel.updateAppointmentStatus(id, 'cancelled');

    if (!success) {
      return res.status(500).json({ success: false, message: 'Error al cancelar' });
    }

    if (appt?.request) {
      const req_data = appt.request;
      const isStudent = cancelledBy === req_data.student_id;
      const recipientId = isStudent ? req_data.patient_id : req_data.student_id;
      const apptDate = new Date(appt.date).toLocaleDateString('es-VE');

      await sendNotification(
        recipientId,
        'cita',
        'Cita cancelada',
        `La cita del ${apptDate} ha sido cancelada.`
      );

      await logActivity(cancelledBy || req_data.student_id, 'Usuario', 'Cita cancelada', 'Citas', `Cita del ${apptDate} cancelada`);
    }

    return res.json({ success: true, message: 'Cita cancelada' });
  } catch (e) {
    console.error('Error en cancelAppointment:', e);
    return res.status(500).json({ success: false, message: 'Error al cancelar cita' });
  }
}

/**
 * Finalizar cita
 */
async function completeAppointment(req, res) {
  const { id } = req.params;

  try {
    const appt = await AppointmentsModel.getAppointmentById(id);
    const success = await AppointmentsModel.updateAppointmentStatus(id, 'completed');

    if (!success) {
      return res.status(500).json({ success: false, message: 'Error al finalizar' });
    }

    if (appt?.request) {
      await logActivity(appt.request.student_id, 'Estudiante', 'Cita completada', 'Citas',
        `Cita del ${new Date(appt.date).toLocaleDateString('es-VE')} marcada como completada`);
    }

    return res.json({ success: true, message: 'Cita finalizada' });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Error al finalizar cita' });
  }
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
