/* =============================================
   CONTROLLER: REQUEST CONTROLLER
   ============================================= */

const RequestsModel = require('../models/requests');
const { sendNotification, logActivity } = require('../services/notificationService');
const db = require('../config/database');

/**
 * Enviar solicitud
 */
async function sendRequest(req, res) {
  const { studentId, patientId, message, senderRole } = req.body;

  if (senderRole === 'patient') {
    return res.status(403).json({ success: false, message: 'Los pacientes no pueden enviar solicitudes a los estudiantes.' });
  }

  // Validar límite de pacientes activos (accepted + active)
  const activeCount = await RequestsModel.getActivePatientsCount(studentId);
  if (activeCount >= 3) {
    return res.status(400).json({
      success: false,
      message: 'Ha alcanzado el límite máximo de 3 pacientes activos. Debe finalizar o cancelar un tratamiento antes de enviar nuevas solicitudes.'
    });
  }

  const result = await RequestsModel.createRequest(studentId, patientId, message);
  if (!result.success) return res.status(400).json(result);

  // Obtener nombre del estudiante para la notificación
  const { data: studentProfile } = await db.supabase.from('profiles').select('full_name').eq('id', studentId).maybeSingle();
  const studentName = studentProfile?.full_name || 'Un estudiante';

  await sendNotification(patientId, 'solicitud', 'Nueva Solicitud', `${studentName} te ha enviado una solicitud de atención.`, studentId);
  await logActivity(studentId, studentName, 'Solicitud enviada', 'Solicitudes', `Solicitud enviada al paciente ${patientId}`);

  return res.json(result);
}

/**
 * Obtener solicitudes del estudiante
 */
async function getStudentRequests(req, res) {
  const { userId } = req.params;
  const status = req.query.status || null;
  const requests = await RequestsModel.getStudentRequests(userId, status);
  return res.json({ success: true, data: requests });
}

/**
 * Obtener solicitudes del paciente
 */
async function getPatientRequests(req, res) {
  const { userId } = req.params;
  const status = req.query.status || null;
  const requests = await RequestsModel.getPatientRequests(userId, status);
  return res.json({ success: true, data: requests });
}

/**
 * Aceptar solicitud
 */
async function acceptRequest(req, res) {
  const { id } = req.params;

  const { data: requestRow } = await db.supabase
    .from('requests')
    .select('student_id, patient_id, status')
    .eq('id', id)
    .maybeSingle();

  if (!requestRow) {
    return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
  }

  if (requestRow.status !== 'pending') {
    return res.status(400).json({ success: false, message: 'Solo se pueden aceptar solicitudes pendientes' });
  }

  // Validar si el paciente ya tiene un estudiante asignado
  const { data: activePatientReqs } = await db.supabase
    .from('requests')
    .select('id')
    .eq('patient_id', requestRow.patient_id)
    .in('status', ['accepted', 'active']);

  if (activePatientReqs && activePatientReqs.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Ya tienes un tratamiento activo con un estudiante. No puedes aceptar más solicitudes hasta finalizar tu caso actual.'
    });
  }

  // Validar límite del estudiante
  const activeCount = await RequestsModel.getActivePatientsCount(requestRow.student_id);
  if (activeCount >= 3) {
    return res.status(400).json({
      success: false,
      message: 'El estudiante ya ha alcanzado el límite máximo de 3 pacientes activos.'
    });
  }

  const result = await RequestsModel.updateRequestStatus(id, 'accepted');
  if (result === true || result.success) {
    // Rechazar automáticamente las demás solicitudes pendientes del paciente
    await db.supabase
      .from('requests')
      .update({ status: 'rejected' })
      .eq('patient_id', requestRow.patient_id)
      .eq('status', 'pending')
      .neq('id', id);

    // Desactivar paciente de la búsqueda
    await db.supabase
      .from('patients')
      .update({ accepts_requests: false })
      .eq('id', requestRow.patient_id);

    const { data: patientProfile } = await db.supabase.from('profiles').select('full_name').eq('id', requestRow.patient_id).maybeSingle();
    const patientName = patientProfile?.full_name || 'El paciente';

    await sendNotification(requestRow.student_id, 'aceptada', 'Solicitud Aceptada', `${patientName} ha aceptado tu solicitud. Ya puedes coordinar tu primera cita.`, requestRow.patient_id);
    await logActivity(requestRow.patient_id, patientName, 'Solicitud aceptada', 'Solicitudes', `Solicitud del estudiante ${requestRow.student_id} aceptada`);
  }

  return res.json(result === true ? { success: true } : result);
}

/**
 * Rechazar solicitud
 */
async function rejectRequest(req, res) {
  const { id } = req.params;

  const { data: requestRow } = await db.supabase
    .from('requests')
    .select('student_id, patient_id, status')
    .eq('id', id)
    .maybeSingle();

  if (!requestRow) {
    return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
  }

  if (requestRow.status !== 'pending') {
    return res.status(400).json({ success: false, message: 'Solo se pueden rechazar solicitudes pendientes' });
  }

  const result = await RequestsModel.updateRequestStatus(id, 'rejected');

  if (result === true || result.success) {
    await sendNotification(requestRow.student_id, 'rechazada', 'Solicitud Rechazada', 'Un paciente ha rechazado tu solicitud.', requestRow.patient_id);
    await logActivity(requestRow.patient_id, 'Paciente', 'Solicitud rechazada', 'Solicitudes', `Solicitud del estudiante ${requestRow.student_id} rechazada`);
  }

  return res.json(result === true ? { success: true } : result);
}

/**
 * Obtener todas las solicitudes (admin)
 */
async function getAllRequests(req, res) {
  const requests = await RequestsModel.getAllRequests();
  return res.json({ success: true, data: requests });
}

/**
 * Dar de alta al paciente
 */
async function dischargePatient(req, res) {
  const { id } = req.params;

  const { data: requestRow } = await db.supabase
    .from('requests')
    .select('student_id, patient_id, status')
    .eq('id', id)
    .maybeSingle();

  if (!requestRow) {
    return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
  }

  if (!['accepted', 'active'].includes(requestRow.status)) {
    return res.status(400).json({ success: false, message: 'La solicitud no está activa' });
  }

  // Validar que existan tratamientos registrados
  const { data: treatments } = await db.supabase
    .from('treatments')
    .select('id, estado')
    .eq('student_id', requestRow.student_id)
    .eq('patient_id', requestRow.patient_id);

  if (!treatments || treatments.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No se puede dar de alta sin haber registrado al menos un tratamiento en el historial clínico.'
    });
  }

  // Validar que TODOS los tratamientos estén finalizados
  const pendingTreatments = treatments.filter(t => t.estado !== 'finalizado');
  if (pendingTreatments.length > 0) {
    return res.status(400).json({
      success: false,
      message: `No se puede dar de alta: existen ${pendingTreatments.length} tratamiento(s) aún en proceso o pendientes. Finalice todos los tratamientos antes de dar el alta.`
    });
  }

  // Cambiar estado a completed con discharged_at
  const { error: updateError } = await db.supabase
    .from('requests')
    .update({
      status: 'completed',
      discharged_at: new Date().toISOString()
    })
    .eq('id', id);

  if (updateError) {
    return res.status(500).json({ success: false, message: 'Error al registrar el alta' });
  }

  // Desactivar paciente de la búsqueda
  await db.supabase
    .from('patients')
    .update({ accepts_requests: false })
    .eq('id', requestRow.patient_id);

  // Obtener nombres para notificaciones y logs
  const { data: studentProfile } = await db.supabase.from('profiles').select('full_name').eq('id', requestRow.student_id).maybeSingle();
  const studentName = studentProfile?.full_name || 'El estudiante';

  // Notificar al PACIENTE (destinatario correcto)
  await sendNotification(
    requestRow.patient_id,
    'alta_medica',
    '¡Alta Médica Recibida!',
    `${studentName} ha finalizado tu tratamiento y te ha dado el alta médica. Por favor, responde a la pregunta de seguimiento en tu panel.`,
    id
  );

  await logActivity(requestRow.student_id, studentName, 'Alta médica registrada', 'Alta Médica', `Paciente ${requestRow.patient_id} dado de alta`);

  // Generar certificado PDF automáticamente
  try {
    await generateCertificateInternal(id, requestRow.student_id, requestRow.patient_id);
  } catch (certErr) {
    console.error('Advertencia: No se pudo generar el certificado automáticamente:', certErr);
    // No fallar el alta si el certificado falla
  }

  return res.json({ success: true, message: 'Alta médica registrada correctamente' });
}

/**
 * Marcar paciente como abandonado
 */
async function abandonPatient(req, res) {
  const { id } = req.params;
  const { reason } = req.body;

  const { data: requestRow } = await db.supabase
    .from('requests')
    .select('student_id, patient_id, status')
    .eq('id', id)
    .maybeSingle();

  if (!requestRow) {
    return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
  }

  if (!['accepted', 'active'].includes(requestRow.status)) {
    return res.status(400).json({ success: false, message: 'Solo se puede marcar abandono en solicitudes activas' });
  }

  const success = await RequestsModel.markAbandoned(id, reason || 'El paciente dejó de asistir a las citas');
  if (!success) {
    return res.status(500).json({ success: false, message: 'Error al registrar el abandono' });
  }

  // Reactivar paciente: vuelve a ser visible para nuevos estudiantes
  await db.supabase
    .from('patients')
    .update({ accepts_requests: true })
    .eq('id', requestRow.patient_id);

  const { data: studentProfile } = await db.supabase.from('profiles').select('full_name').eq('id', requestRow.student_id).maybeSingle();
  const studentName = studentProfile?.full_name || 'El estudiante';

  await sendNotification(
    requestRow.patient_id,
    'sistema',
    'Caso marcado como abandonado',
    `${studentName} ha registrado que abandonaste el tratamiento. Tu perfil ha sido reactivado para que puedas buscar un nuevo estudiante.`
  );

  await logActivity(requestRow.student_id, studentName, 'Abandono registrado', 'Solicitudes', `Motivo: ${reason || 'Sin especificar'}`);

  return res.json({ success: true, message: 'Caso marcado como abandonado. El paciente puede buscar un nuevo estudiante.' });
}

/**
 * Función interna para generar certificado
 */
async function generateCertificateInternal(requestId, studentId, patientId) {
  const PDFDocument = require('pdfkit');
  const buffers = [];

  const [
    { data: patientUser },
    { data: patient },
    { data: studentUser },
    { data: student },
    { data: diagnosis },
    { data: treatments }
  ] = await Promise.all([
    db.supabase.from('profiles').select('full_name, cedula').eq('id', patientId).maybeSingle(),
    db.supabase.from('patients').select('age, gender').eq('id', patientId).maybeSingle(),
    db.supabase.from('profiles').select('full_name, cedula').eq('id', studentId).maybeSingle(),
    db.supabase.from('students').select('academic_year, section').eq('id', studentId).maybeSingle(),
    db.supabase.from('initial_diagnosis').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    db.supabase.from('treatments').select('tratamiento, estado, fecha').eq('patient_id', patientId).eq('student_id', studentId)
  ]);

  const doc = new PDFDocument({ margin: 50 });
  doc.on('data', chunk => buffers.push(chunk));

  // Encabezado
  doc.fontSize(18).font('Helvetica-Bold').text('CERTIFICADO DE ALTA MÉDICA', { align: 'center' });
  doc.fontSize(11).font('Helvetica').text('Universidad Nacional Experimental Rómulo Gallegos (UNERG)', { align: 'center' });
  doc.text('Facultad de Ciencias de la Salud – Área de Odontología', { align: 'center' });
  doc.moveDown(2);

  doc.fontSize(13).font('Helvetica-Bold').text('DATOS DEL PACIENTE', { underline: true });
  doc.fontSize(11).font('Helvetica')
    .text(`Nombre: ${patientUser?.full_name || 'No especificado'}`)
    .text(`Cédula: ${patientUser?.cedula || 'No especificada'}`)
    .text(`Edad: ${patient?.age || 'No especificada'}`)
    .text(`Género: ${patient?.gender || 'No especificado'}`);
  doc.moveDown();

  doc.fontSize(13).font('Helvetica-Bold').text('DATOS DEL ESTUDIANTE TRATANTE', { underline: true });
  doc.fontSize(11).font('Helvetica')
    .text(`Nombre: ${studentUser?.full_name || 'No especificado'}`)
    .text(`Cédula: ${studentUser?.cedula || 'No especificada'}`)
    .text(`Año Académico: ${student?.academic_year || 'No especificado'}`)
    .text(`Sección: ${student?.section || 'No especificada'}`);
  doc.moveDown();

  if (diagnosis) {
    doc.fontSize(13).font('Helvetica-Bold').text('DIAGNÓSTICO INICIAL', { underline: true });
    doc.fontSize(11).font('Helvetica')
      .text(`Problema principal: ${diagnosis.problema_principal || '-'}`)
      .text(`Especialidad: ${diagnosis.especialidad_requerida || '-'}`)
      .text(`Síntomas: ${diagnosis.sintomas || '-'}`);
    doc.moveDown();
  }

  if (treatments && treatments.length > 0) {
    doc.fontSize(13).font('Helvetica-Bold').text('TRATAMIENTOS REALIZADOS', { underline: true });
    doc.fontSize(11).font('Helvetica');
    treatments.forEach((t, i) => {
      doc.text(`${i + 1}. ${t.tratamiento} – ${t.estado === 'finalizado' ? 'Finalizado' : 'En proceso'} (${new Date(t.fecha).toLocaleDateString('es-VE')})`);
    });
    doc.moveDown();
  }

  doc.fontSize(11).font('Helvetica')
    .text(`Fecha de Alta: ${new Date().toLocaleDateString('es-VE')}`, { align: 'right' });

  doc.end();

  const pdfBuffer = await new Promise(resolve => doc.on('end', () => resolve(Buffer.concat(buffers))));

  const fileName = `certificado_${requestId}_${Date.now()}.pdf`;
  try { await db.supabase.storage.createBucket('certificates', { public: true }); } catch(e) {}

  const { error: uploadErr } = await db.supabase.storage
    .from('certificates')
    .upload(fileName, pdfBuffer, { contentType: 'application/pdf', upsert: true });

  if (uploadErr) throw uploadErr;

  const { data: publicUrlData } = db.supabase.storage.from('certificates').getPublicUrl(fileName);
  const pdfUrl = publicUrlData.publicUrl;

  await db.supabase.from('discharge_certificates').insert({
    request_id: requestId,
    patient_id: patientId,
    student_id: studentId,
    pdf_url: pdfUrl,
    generated_at: new Date().toISOString()
  });

  return pdfUrl;
}

/**
 * Descartar paciente por no cumplir requisitos (sin penalización)
 */
async function discardPatient(req, res) {
  const { id } = req.params;

  try {
    const { data: requestRow } = await db.supabase
      .from('requests')
      .select('student_id, patient_id, status')
      .eq('id', id)
      .maybeSingle();

    if (!requestRow) {
      return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
    }

    if (!['accepted', 'active'].includes(requestRow.status)) {
      return res.status(400).json({ success: false, message: 'Solo se puede descartar solicitudes activas' });
    }

    // Verificar que NO tenga citas
    const { count: apptCount } = await db.supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('request_id', id);

    if (apptCount > 0) {
      return res.status(400).json({ success: false, message: 'No se puede descartar porque ya existen citas registradas. Debes usar la opción de Abandono.' });
    }

    // Verificar que NO tenga tratamientos (por si acaso los registró manual sin citas)
    const { count: treatmentCount } = await db.supabase
      .from('treatments')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', requestRow.patient_id)
      .eq('student_id', requestRow.student_id);

    if (treatmentCount > 0) {
      return res.status(400).json({ success: false, message: 'No se puede descartar porque ya existen tratamientos registrados. Debes usar la opción de Abandono.' });
    }

    const RequestsModel = require('../models/requests');
    const success = await RequestsModel.markDiscarded(id, 'No cumple requisitos académicos');
    if (!success) {
      return res.status(500).json({ success: false, message: 'Error al descartar el caso' });
    }

    // Reactivar paciente: vuelve a ser visible para nuevos estudiantes
    await db.supabase
      .from('patients')
      .update({ accepts_requests: true })
      .eq('id', requestRow.patient_id);

    const { data: studentProfile } = await db.supabase.from('profiles').select('full_name').eq('id', requestRow.student_id).maybeSingle();
    const studentName = studentProfile?.full_name || 'El estudiante';
    
    const { sendNotification, logActivity } = require('../services/notificationService');

    await sendNotification(
      requestRow.patient_id,
      'sistema',
      'Caso descartado (Requisitos)',
      `Tu caso ha sido descartado amistosamente porque no cumple con los requisitos académicos actuales de ${studentName}. Tu perfil sigue activo para que otros estudiantes te contacten.`
    );

    await logActivity(requestRow.student_id, studentName, 'Caso descartado', 'Solicitudes', 'Motivo: No cumple requisitos académicos');

    return res.json({ success: true, message: 'Caso descartado exitosamente. El paciente no fue penalizado.' });
  } catch(e) {
    console.error('Error descartando paciente:', e);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
}

module.exports = {
  sendRequest,
  getStudentRequests,
  getPatientRequests,
  acceptRequest,
  rejectRequest,
  getAllRequests,
  dischargePatient,
  abandonPatient,
  discardPatient
};
