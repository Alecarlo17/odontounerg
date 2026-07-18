/* =============================================
   CONTROLLER: CERTIFICATE CONTROLLER
   Generación de certificado PDF y guardado en Supabase Storage
   ============================================= */
const db = require('../config/database');
const PDFDocument = require('pdfkit');
const { logActivity } = require('../services/notificationService');
const path = require('path');
const fs = require('fs');

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
      .select('id, pdf_url')
      .eq('request_id', requestId)
      .maybeSingle();

    // Generar SIEMPRE el PDF para aplicar el nuevo diseño
    const pdfUrl = await generateAndStorePDF(requestId, requestRow, existingCert?.id);

    const studentName = Array.isArray(requestRow.student) ? requestRow.student[0]?.full_name : requestRow.student?.full_name;
    
    if (!existingCert) {
      await logActivity(requestRow.student_id, studentName || 'Estudiante', 'Certificado generado', 'Certificados', pdfUrl);
    }

    return res.json({ success: true, url: pdfUrl, message: 'Certificado generado exitosamente.' });
  } catch (e) {
    console.error('Error generando certificado:', e);
    return res.status(500).json({ success: false, message: 'Error interno al generar el certificado.' });
  }
}

/**
 * Genera el PDF y lo sube a Supabase Storage.
 */
async function generateAndStorePDF(requestId, requestRow, existingCertId = null) {
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
    db.supabase.from('patients').select('age, gender, cedula').eq('id', patientId).maybeSingle(),
    db.supabase.from('profiles').select('full_name').eq('id', patientId).maybeSingle(),
    db.supabase.from('initial_diagnosis').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    db.supabase.from('students').select('academic_year, section, student_id_card').eq('id', studentId).maybeSingle(),
    db.supabase.from('profiles').select('full_name').eq('id', studentId).maybeSingle(),
    db.supabase.from('treatments').select('id, tratamiento, estado, fecha, sesiones_count').eq('patient_id', patientId).eq('student_id', studentId)
  ]);

  // Obtener sesiones de cada tratamiento
  let allSessions = [];
  if (treatments && treatments.length > 0) {
    const treatmentIds = treatments.map(t => t.id);
    if (treatmentIds.length > 0) {
      const { data: sessions } = await db.supabase
        .from('treatment_sessions')
        .select('treatment_id, numero_sesion, fecha, procedimiento, estado')
        .in('treatment_id', treatmentIds)
        .order('fecha', { ascending: true });
      allSessions = sessions || [];
    }
  }

  const doc = new PDFDocument({ margin: 55, size: 'A4' });
  const buffers = [];
  doc.on('data', chunk => buffers.push(chunk));

  // ── ENCABEZADO Y LOGOS ──────────────────────────────────────────
  const logoUnergPath = path.join(__dirname, '../assets/Unerg-1.png');
  const logoOdontoPath = path.join(__dirname, '../assets/logo 2.png');
  
  if (fs.existsSync(logoUnergPath)) {
    // Ajustado tamaño y posición del logo UNERG
    doc.image(logoUnergPath, 50, 25, { width: 70 });
  }
  if (fs.existsSync(logoOdontoPath)) {
    doc.image(logoOdontoPath, doc.page.width - 50 - 60, 25, { width: 60 });
  }

  // Bajamos el texto para que no se superponga con los logos
  doc.fillColor('#1e3a8a')
    .fontSize(20).font('Helvetica-Bold')
    .text('CERTIFICADO DE ALTA MÉDICA', 55, 90, { align: 'center' });
    
  doc.fillColor('#475569')
    .fontSize(10).font('Helvetica')
    .text('Universidad Nacional Experimental Rómulo Gallegos (UNERG)', { align: 'center' })
    .text('Facultad de Ciencias de la Salud – Área de Odontología', { align: 'center' });

  // Línea separadora azul ajustada
  doc.moveTo(55, 140).lineTo(doc.page.width - 55, 140).lineWidth(2).stroke('#1e3a8a');
  doc.y = 155; // Posicionamos el cursor explícitamente debajo de la línea

  // ── DATOS DEL PACIENTE ──────────────────────────────────
  _section(doc, 'DATOS DEL PACIENTE');
  _row(doc, 'Nombre completo', patientUser?.full_name);
  _row(doc, 'Cédula de identidad', patient?.cedula); // Cédula desde tabla patients
  _row(doc, 'Edad', patient?.age ? `${patient.age} años` : null);
  _row(doc, 'Género', patient?.gender);
  doc.moveDown(0.5);

  // ── DATOS DEL ESTUDIANTE ────────────────────────────────
  _section(doc, 'ESTUDIANTE TRATANTE');
  _row(doc, 'Nombre completo', studentUser?.full_name);
  _row(doc, 'Cédula de identidad', student?.student_id_card); // Cédula desde tabla students
  _row(doc, 'Año académico', student?.academic_year);
  _row(doc, 'Sección', student?.section);
  doc.moveDown(0.5);

  // ── DIAGNÓSTICO INICIAL ─────────────────────────────────
  if (diagnosis) {
    _section(doc, 'DIAGNÓSTICO INICIAL');
    _row(doc, 'Problema principal', diagnosis.problema_principal);
    _row(doc, 'Especialidad requerida', diagnosis.especialidad_requerida);
    _row(doc, 'Síntomas', diagnosis.sintomas);
    doc.moveDown(0.5);
  }

  // ── TRATAMIENTOS Y PROCEDIMIENTOS REALIZADOS ────────────────
  if (treatments && treatments.length > 0) {
    _section(doc, 'TRATAMIENTOS Y PROCEDIMIENTOS');
    treatments.forEach((t, i) => {
      doc.fillColor('#1e3a8a').fontSize(11).font('Helvetica-Bold')
        .text(`${i + 1}. ${t.tratamiento} (Estado: ${t.estado === 'finalizado' ? 'Finalizado ✓' : t.estado})`);
      
      const sessionesTratamiento = allSessions.filter(s => s.treatment_id === t.id);
      
      if (sessionesTratamiento.length > 0) {
        sessionesTratamiento.forEach(s => {
          doc.fillColor('#475569').fontSize(10).font('Helvetica')
            .text(`    • Sesión #${s.numero_sesion} (${new Date(s.fecha).toLocaleDateString('es-VE')}): `, { continued: true, lineGap: 3 })
            .fillColor('#334155').font('Helvetica-Bold')
            .text(s.procedimiento || 'Procedimiento no especificado');
        });
      } else {
        doc.fillColor('#94a3b8').fontSize(10).font('Helvetica')
          .text(`    (No hay sesiones registradas)`);
      }
      doc.moveDown(0.3);
    });
    doc.moveDown(0.5);
  }

  // ── PIE DEL DOCUMENTO Y FIRMA ───────────────────────────────────
  doc.moveDown(3);
  
  // Línea de firma
  const signatureWidth = 200;
  const signatureX = (doc.page.width - signatureWidth) / 2;
  doc.moveTo(signatureX, doc.y).lineTo(signatureX + signatureWidth, doc.y).lineWidth(1).stroke('#94a3b8');
  doc.moveDown(0.5);
  
  doc.fillColor('#334155').fontSize(10).font('Helvetica-Bold')
    .text('Control de Estudios de Odontología', { align: 'center' });
  doc.moveDown(1);
  
  const dischargedAt = requestRow.discharged_at ? new Date(requestRow.discharged_at).toLocaleDateString('es-VE') : new Date().toLocaleDateString('es-VE');
  doc.fillColor('#1e3a8a').fontSize(10).font('Helvetica-Bold')
    .text(`Fecha de Emisión: ${dischargedAt}`, { align: 'center' });
    
  doc.moveDown(0.5);
  doc.fillColor('#94a3b8').fontSize(9).font('Helvetica-Oblique')
    .text('Este documento solo tiene validez con la firma y sello de control de estudio de odontología.', { align: 'center' });

  doc.end();

  const pdfBuffer = await new Promise(resolve => doc.on('end', () => resolve(Buffer.concat(buffers))));

  // Nombre de archivo con el nombre del paciente
  const patientSafeName = (patientUser?.full_name || 'Paciente').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const fileName = `certificado_${patientSafeName}_${Date.now()}.pdf`;
  
  try { await db.supabase.storage.createBucket('certificates', { public: true }); } catch(_) {}

  const { error: uploadError } = await db.supabase.storage
    .from('certificates')
    .upload(fileName, pdfBuffer, { contentType: 'application/pdf', upsert: true });

  if (uploadError) throw uploadError;

  const { data: publicUrlData } = db.supabase.storage.from('certificates').getPublicUrl(fileName);
  const pdfUrl = publicUrlData.publicUrl;

  // Guardar o actualizar registro en discharge_certificates
  if (existingCertId) {
    await db.supabase.from('discharge_certificates').update({
      pdf_url: pdfUrl,
      generated_at: new Date().toISOString()
    }).eq('id', existingCertId);
  } else {
    await db.supabase.from('discharge_certificates').insert({
      request_id: requestId,
      patient_id: patientId,
      student_id: studentId,
      pdf_url: pdfUrl,
      generated_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    });
  }

  return pdfUrl;
}

// Helper para secciones
function _section(doc, title) {
  doc.moveDown(0.5);
  const startY = doc.y;
  // Dibujamos el rectángulo de fondo
  doc.rect(55, startY, doc.page.width - 110, 22).fill('#e8f0fe');
  
  // Escribimos el título centrado verticalmente en el rectángulo
  doc.fillColor('#1e3a8a').fontSize(11).font('Helvetica-Bold')
    .text(title, 65, startY + 6);
    
  // Añadimos un pequeño espacio después de la sección
  doc.moveDown(0.5);
}

// Helper para filas
function _row(doc, label, value) {
  if (!value && value !== 0 && value !== '') return;
  doc.fillColor('#334155').fontSize(10).font('Helvetica-Bold')
    .text(`${label}: `, { continued: true, lineGap: 4 })
    .font('Helvetica').fillColor('#475569')
    .text(String(value));
}

module.exports = { createCertificatePDF, generateAndStorePDF };
