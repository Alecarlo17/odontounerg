/* =============================================
   CONTROLLER: PROFILE CONTROLLER
   ============================================= */

const UsersModel = require('../models/users');
const PatientsModel = require('../models/patients');
const db = require('../config/database');

async function updateProfile(req, res) {
  const { userId } = req.params;
  const { fullName, phone, disponibilidad } = req.body;
  const success = await UsersModel.updateUserProfile(userId, { fullName, phone, disponibilidad });
  if (success) return res.json({ success: true });
  return res.status(500).json({ success: false });
}

async function updateStudentData(req, res) {
  const { userId } = req.params;
  const data = req.body;
  try {
    await db.runSQLite(
      'UPDATE students SET section = ?, academic_year = ?, treatments_needed = ? WHERE id = ?',
      [data.section, data.academicYear, JSON.stringify(data.treatments), userId]
    );
    if (await db.getStatus()) {
      db.supabase.from('students').update({
        section: data.section, academic_year: data.academicYear, treatments_needed: data.treatments, bio: data.bio
      }).eq('id', userId).then(()=>{}).catch(()=>{});
    }
    return res.json({ success: true });
  } catch(e) {
    return res.status(500).json({ success: false });
  }
}

async function updatePatientData(req, res) {
  const { userId } = req.params;
  const data = req.body;
  const success = await PatientsModel.updatePatient(userId, data);
  if (success) return res.json({ success: true });
  return res.status(500).json({ success: false });
}

async function getStudentPublicProfile(req, res) {
  const { studentId } = req.params;
  try {
    const profile = await db.getSQLite('SELECT * FROM profiles WHERE id = ?', [studentId]);
    const student = await db.getSQLite('SELECT * FROM students WHERE id = ?', [studentId]);
    const ratings = []; // Si implementamos ratings locales
    return res.json({ success: true, data: { profile, student, ratings, avgRating: 0 } });
  } catch(e) {
    return res.status(500).json({ success: false });
  }
}

async function getPatientProfile(req, res) {
  const { patientId } = req.params;
  try {
    const profile = await db.getSQLite('SELECT * FROM profiles WHERE id = ?', [patientId]);
    const patient = await db.getSQLite('SELECT * FROM patients WHERE id = ?', [patientId]);
    return res.json({ success: true, data: { profile, patient } });
  } catch(e) {
    return res.status(500).json({ success: false });
  }
}

module.exports = {
  updateProfile, updateStudentData, updatePatientData, getStudentPublicProfile, getPatientProfile
};
