/* =============================================
   CONTROLLER: DASHBOARD CONTROLLER
   Provee estadísticas y datos consolidados
   para los dashboards.
   ============================================= */

const db = require('../config/database');

async function getPatientDashboard(req, res) {
  const { userId } = req.params;
  try {
    // pendingReqs
    const pending = await db.querySQLite("SELECT count(id) as c FROM requests WHERE patient_id = ? AND status = 'pending'", [userId]);
    // acceptedReqs
    const accepted = await db.querySQLite("SELECT count(id) as c FROM requests WHERE patient_id = ? AND status IN ('accepted', 'active')", [userId]);
    
    // appointments count
    const appointments = await db.querySQLite(`
      SELECT count(a.id) as c FROM appointments a 
      INNER JOIN requests r ON a.request_id = r.id 
      WHERE r.patient_id = ? AND a.status IN ('proposed', 'confirmed')
    `, [userId]);

    return res.json({
      success: true,
      data: {
        pendingRequests: pending[0]?.c || 0,
        acceptedRequests: accepted[0]?.c || 0,
        activeAppointments: appointments[0]?.c || 0
      }
    });
  } catch(e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function getStudentDashboard(req, res) {
  const { userId } = req.params;
  try {
    const pending = await db.querySQLite("SELECT count(id) as c FROM requests WHERE student_id = ? AND status = 'pending'", [userId]);
    const accepted = await db.querySQLite("SELECT count(id) as c FROM requests WHERE student_id = ? AND status IN ('accepted', 'active')", [userId]);
    
    const appointments = await db.querySQLite(`
      SELECT count(a.id) as c FROM appointments a 
      INNER JOIN requests r ON a.request_id = r.id 
      WHERE r.student_id = ? AND a.status IN ('proposed', 'confirmed')
    `, [userId]);

    return res.json({
      success: true,
      data: {
        pendingRequests: pending[0]?.c || 0,
        acceptedRequests: accepted[0]?.c || 0,
        activeAppointments: appointments[0]?.c || 0
      }
    });
  } catch(e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function getAdminDashboard(req, res) {
  try {
    const users = await db.querySQLite("SELECT count(id) as c FROM profiles");
    const students = await db.querySQLite("SELECT count(id) as c FROM profiles WHERE role = 'student'");
    const patients = await db.querySQLite("SELECT count(id) as c FROM profiles WHERE role = 'patient'");
    const requests = await db.querySQLite("SELECT count(id) as c FROM requests");
    const appointments = await db.querySQLite("SELECT count(id) as c FROM appointments");
    const pendingReqs = await db.querySQLite("SELECT count(id) as c FROM requests WHERE status = 'pending'");

    // Data for charts
    const reqStatus = await db.querySQLite("SELECT status, count(id) as count FROM requests GROUP BY status");
    const appStatus = await db.querySQLite("SELECT status, count(id) as count FROM appointments GROUP BY status");
    
    return res.json({
      success: true,
      data: {
        totalUsers: users[0]?.c || 0,
        totalStudents: students[0]?.c || 0,
        totalPatients: patients[0]?.c || 0,
        totalRequests: requests[0]?.c || 0,
        totalAppointments: appointments[0]?.c || 0,
        pendingRequests: pendingReqs[0]?.c || 0,
        chartRequests: reqStatus,
        chartAppointments: appStatus
      }
    });
  } catch(e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function getTreatments(req, res) {
  const { userId, role } = req.params; // role is 'student' or 'patient'
  try {
    const col = role === 'student' ? 'student_id' : 'patient_id';
    const joinCol = role === 'student' ? 'patient_id' : 'student_id';
    const joinTable = 'profiles';
    
    const query = `
      SELECT t.*, p.full_name as other_name 
      FROM treatments t 
      LEFT JOIN profiles p ON t.${joinCol} = p.id 
      WHERE t.${col} = ? 
      ORDER BY t.created_at DESC
    `;
    const data = await db.querySQLite(query, [userId]);
    return res.json({ success: true, data });
  } catch(e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function createTreatment(req, res) {
  const { studentId, patientId, tratamiento, estado, observaciones } = req.body;
  if (!studentId || !patientId || !tratamiento) {
    return res.status(400).json({ success: false, message: 'Faltan datos obligatorios' });
  }
  try {
    const id = 't-' + Date.now();
    const now = new Date().toISOString();
    const query = `
      INSERT INTO treatments (id, patient_id, student_id, tratamiento, fecha, estado, created_at, observaciones)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await db.runSQLite(query, [id, patientId, studentId, tratamiento, now, estado || 'en_proceso', now, observaciones || '']);
    
    // Opcional: sync to Supabase if needed
    if (await db.getStatus()) {
      db.supabase.from('treatments').insert({
        id, patient_id: patientId, student_id: studentId, tratamiento, fecha: now, estado: estado || 'en_proceso', created_at: now, observaciones: observaciones || ''
      }).then(()=>{}).catch(()=>{});
    }

    return res.json({ success: true, message: 'Tratamiento registrado' });
  } catch(e) {
    return res.status(500).json({ success: false, message: 'Error al registrar tratamiento' });
  }
}

module.exports = {
  getPatientDashboard,
  getStudentDashboard,
  getAdminDashboard,
  getTreatments,
  createTreatment
};
