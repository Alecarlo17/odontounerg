/* =============================================
   CONTROLLER: CERTIFICATE CONTROLLER
   Generación de certificado PDF y guardado en Supabase Storage
   ============================================= */
const db = require('../config/database');
const PDFDocument = require('pdfkit');
const { logActivity } = require('../services/notificationService');

async function createCertificatePDF(req, res) {
  const { requestId } = req.params;

  try {
    // Verificar que la solicitud está completada
    const { data: requestRow } = await db.supabase
      .from('requests')
      .select('*, student:profiles!requests_student_id_fkey(full_name), patient:profiles!requests_patient_id_fkey(full_name)')
      .eq('id', requestId)
      .eq('status', 'completed')
      .maybeSingle();

    if (!requestRow) {
      return res.status(403).json({
        success: false,
        message: 'El certificado solo puede generarse después del alta médica.'
      });
    }

    // Comprobar si ya existe el certificado (por request_id)
    const { data: existingCert } = await db.supabase
      .from('discharge_certificates')
      .select('pdf_url')
      .eq('request_id', requestId)
      .maybeSingle();

    if (existingCert?.pdf_url) {
      return res.json({ success: true, url: existingCert.pdf_url, message: 'Certificado ya existe.' });
    }

    const pdfUrl = await generateAndStorePDF(requestId, requestRow);

    const studentName = Array.isArray(requestRow.student) ? requestRow.student[0]?.full_name : requestRow.student?.full_name;
    await logActivity(requestRow.student_id, studentName || 'Estudiante', 'Certificado generado', 'Certificados', pdfUrl);

    return res.json({ success: true, url: pdfUrl, message: 'Certificado generado exitosamente.' });
  } catch (e) {
    console.error('Error generando certificado:', e);
    return res.status(500).json({ success: false, message: 'Error interno al generar el certificado.' });
  }
}

/**
 * Genera el PDF y lo sube a Supabase Storage. Reutilizable internamente.
 */
async function generateAndStorePDF(requestId, requestRow) {
  const patientId = requestRow.patient_id;
  const studentId = requestRow.student_id;

  const [
    { data: patient },
    { data: patientUser },
    { data: diagnosis },
    { data: student },
    { data: studentUser },
    { data: treatments }
  ] = await Promise.all([
    db.supabase.from('patients').select('age, gender').eq('id', patientId).maybeSingle(),
    db.supabase.from('profiles').select('full_name, cedula').eq('id', patientId).maybeSingle(),
    db.supabase.from('initial_diagnosis').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    db.supabase.from('students').select('academic_year, section').eq('id', studentId).maybeSingle(),
    db.supabase.from('profiles').select('full_name, cedula').eq('id', studentId).maybeSingle(),
    db.supabase.from('treatments').select('tratamiento, estado, fecha, sesiones_count').eq('patient_id', patientId).eq('student_id', studentId)
  ]);

  // Obtener sesiones de cada tratamiento
  let allSessions = [];
  if (treatments && treatments.length > 0) {
    const { data: treatmentIds } = await db.supabase
      .from('treatments')
      .select('id')
      .eq('patient_id', patientId)
      .eq('student_id', studentId);

    if (treatmentIds?.length > 0) {
      const { data: sessions } = await db.supabase
        .from('treatment_sessions')
        .select('numero_sesion, fecha, procedimiento, estado')
        .in('treatment_id', treatmentIds.map(t => t.id))
        .order('fecha', { ascending: true });
      allSessions = sessions || [];
    }
  }

  const doc = new PDFDocument({ margin: 55, size: 'A4' });
  const buffers = [];
  doc.on('data', chunk => buffers.push(chunk));

  // ── ENCABEZADO ──────────────────────────────────────────
  doc.rect(0, 0, doc.page.width, 120).fill('#1e3a8a');
  doc.fillColor('white')
    .fontSize(22).font('Helvetica-Bold')
    .text('CERTIFICADO DE ALTA MÉDICA', 55, 30, { align: 'center' });
  doc.fontSize(11).font('Helvetica')
    .text('Universidad Nacional Experimental Rómulo Gallegos (UNERG)', { align: 'center' })
    .text('Facultad de Ciencias de la Salud – Área de Odontología', { align: 'center' });

  doc.fillColor('#1e3a8a').moveDown(3);

  // ── DATOS DEL PACIENTE ──────────────────────────────────
  _section(doc, 'DATOS DEL PACIENTE');
  _row(doc, 'Nombre completo', patientUser?.full_name);
  _row(doc, 'Cédula de identidad', patientUser?.cedula);
  _row(doc, 'Edad', patient?.age ? `${patient.age} años` : null);
  _row(doc, 'Género', patient?.gender);
  doc.moveDown(0.5);

  // ── DATOS DEL ESTUDIANTE ────────────────────────────────
  _section(doc, 'ESTUDIANTE TRATANTE');
  _row(doc, 'Nombre completo', studentUser?.full_name);
  _row(doc, 'Cédula de identidad', studentUser?.cedula);
  _row(doc, 'Año académico', student?.academic_year);
  _row(doc, 'Sección', student?.section);
  doc.moveDown(0.5);

  // ── DIAGNÓSTICO INICIAL ─────────────────────────────────
  if (diagnosis) {
    _section(doc, 'DIAGNÓSTICO INICIAL');
    _row(doc, 'Problema principal', diagnosis.problema_principal);
    _row(doc, 'Especialidad requerida', diagnosis.especialidad_requerida);
    _row(doc, 'Síntomas', diagnosis.sintomas);
    _row(doc, 'Nivel de dolor', diagnosis.nivel_dolor != null ? `${diagnosis.nivel_dolor}/10` : null);
    doc.moveDown(0.5);
  }

  // ── TRATAMIENTOS REALIZADOS ─────────────────────────────
  if (treatments && treatments.length > 0) {
    _section(doc, 'TRATAMIENTOS REALIZADOS');
    treatments.forEach((t, i) => {
      doc.fillColor('#333').fontSize(11).font('Helvetica-Bold')
        .text(`${i + 1}. ${t.tratamiento}`, { continued: false });
      doc.font('Helvetica').fontSize(10).fillColor('#555')
        .text(`   Fecha inicio: ${new Date(t.fecha).toLocaleDateString('es-VE')}   |   Sesiones: ${t.sesiones_count || 0}   |   Estado: ${t.estado === 'finalizado' ? 'Finalizado ✓' : t.estado}`);
    });
    doc.moveDown(0.5);
  }

  // ── SESIONES REALIZADAS ─────────────────────────────────
  if (allSessions.length > 0) {
    _section(doc, `SESIONES CLÍNICAS (${allSessions.length} en total)`);
    allSessions.forEach(s => {
      doc.fillColor('#333').fontSize(10).font('Helvetica')
        .text(`  Sesión #${s.numero_sesion} – ${new Date(s.fecha).toLocaleDateString('es-VE')}: ${s.procedimiento}`);
    });
    doc.moveDown(0.5);
  }

  // ── PIE DEL DOCUMENTO ───────────────────────────────────
  doc.moveDown(2);
  const dischargedAt = requestRow.discharged_at ? new Date(requestRow.discharged_at).toLocaleDateString('es-VE') : new Date().toLocaleDateString('es-VE');
  doc.fillColor('#1e3a8a').fontSize(11).font('Helvetica-Bold')
    .text(`Fecha de Alta Médica: ${dischargedAt}`, { align: 'right' });
  doc.fillColor('#555').fontSize(9).font('Helvetica')
    .text('Este documento es emitido por el Sistema OdontoUNERG y tiene validez académica.', { align: 'center' });

  doc.end();

  const pdfBuffer = await new Promise(resolve => doc.on('end', () => resolve(Buffer.concat(buffers))));

  const fileName = `certificado_${requestId}_${Date.now()}.pdf`;
  try { await db.supabase.storage.createBucket('certificates', { public: true }); } catch(_) {}

  const { error: uploadError } = await db.supabase.storage
    .from('certificates')
    .upload(fileName, pdfBuffer, { contentType: 'application/pdf', upsert: true });

  if (uploadError) throw uploadError;

  const { data: publicUrlData } = db.supabase.storage.from('certificates').getPublicUrl(fileName);
  const pdfUrl = publicUrlData.publicUrl;

  // Guardar registro en discharge_certificates
  await db.supabase.from('discharge_certificates').insert({
    request_id: requestId,
    patient_id: patientId,
    student_id: studentId,
    pdf_url: pdfUrl,
    generated_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  });

  return pdfUrl;
}

// Helper para secciones
function _section(doc, title) {
  doc.rect(doc.x, doc.y, doc.page.width - 110, 18).fill('#e8f0fe');
  doc.fillColor('#1e3a8a').fontSize(11).font('Helvetica-Bold')
    .text(title, doc.x + 4, doc.y - 14);
  doc.moveDown(0.8);
}

// Helper para filas
function _row(doc, label, value) {
  if (!value && value !== 0) return;
  doc.fillColor('#333').fontSize(11).font('Helvetica-Bold')
    .text(`${label}: `, { continued: true })
    .font('Helvetica').fillColor('#555')
    .text(String(value));
}

module.exports = { createCertificatePDF, generateAndStorePDF };
