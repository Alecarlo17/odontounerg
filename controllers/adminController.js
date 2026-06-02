/* =============================================
   CONTROLLER: ADMIN CONTROLLER
   ============================================= */

const db = require('../config/database');

async function getAllUsers(req, res) {
  try {
    const data = await db.querySQLite("SELECT * FROM profiles ORDER BY created_at DESC");
    return res.json({ success: true, data });
  } catch(e) { return res.status(500).json({ success: false }); }
}

async function getStudents(req, res) {
  try {
    const data = await db.querySQLite("SELECT p.*, s.student_id_card, s.section, s.academic_year FROM profiles p LEFT JOIN students s ON p.id = s.id WHERE p.role = 'student' ORDER BY p.created_at DESC");
    // format to match expected output
    const formatted = data.map(d => ({
      ...d,
      students: { student_id_card: d.student_id_card, section: d.section, academic_year: d.academic_year }
    }));
    return res.json({ success: true, data: formatted });
  } catch(e) { return res.status(500).json({ success: false }); }
}

async function getPatients(req, res) {
  try {
    const data = await db.querySQLite("SELECT p.*, pa.age, pa.phone as p_phone, pa.consultation_reason, pa.medical_history FROM profiles p LEFT JOIN patients pa ON p.id = pa.id WHERE p.role = 'patient' ORDER BY p.created_at DESC");
    const formatted = data.map(d => ({
      ...d,
      patients: { age: d.age, phone: d.p_phone, consultation_reason: d.consultation_reason, medical_history: d.medical_history }
    }));
    return res.json({ success: true, data: formatted });
  } catch(e) { return res.status(500).json({ success: false }); }
}

async function getAllRequests(req, res) {
  try {
    const data = await db.querySQLite("SELECT r.*, s.full_name as student_name, p.full_name as patient_name FROM requests r LEFT JOIN profiles s ON r.student_id = s.id LEFT JOIN profiles p ON r.patient_id = p.id ORDER BY r.created_at DESC");
    const formatted = data.map(d => ({
      ...d,
      student: { full_name: d.student_name },
      patient: { full_name: d.patient_name }
    }));
    return res.json({ success: true, data: formatted });
  } catch(e) { return res.status(500).json({ success: false }); }
}

async function getAllAppointments(req, res) {
  try {
    const data = await db.querySQLite(`
      SELECT a.*, s.full_name as student_name, p.full_name as patient_name 
      FROM appointments a 
      LEFT JOIN requests r ON a.request_id = r.id 
      LEFT JOIN profiles s ON r.student_id = s.id 
      LEFT JOIN profiles p ON r.patient_id = p.id 
      ORDER BY a.date DESC
    `);
    const formatted = data.map(d => ({
      ...d,
      request: { student: { full_name: d.student_name }, patient: { full_name: d.patient_name } }
    }));
    return res.json({ success: true, data: formatted });
  } catch(e) { return res.status(500).json({ success: false }); }
}

async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    await db.querySQLite("DELETE FROM profiles WHERE id = ?", [id]);
    return res.json({ success: true });
  } catch(e) { return res.status(500).json({ success: false }); }
}

module.exports = { getAllUsers, getStudents, getPatients, getAllRequests, getAllAppointments, deleteUser };
