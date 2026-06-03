/* =============================================
   CONTROLLER: PROFILE CONTROLLER
   ============================================= */

const UsersModel = require('../models/users');
const PatientsModel = require('../models/patients');
const RequestsModel = require('../models/requests');
const RatingsModel = require('../models/ratings');
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
    const { error } = await db.supabase
      .from('students')
      .update({
        section: data.section, 
        academic_year: data.academicYear, 
        treatments_needed: data.treatments, 
        bio: data.bio
      })
      .eq('id', userId);

    if (error) throw error;
    return res.json({ success: true });
  } catch(e) {
    console.error('Error en updateStudentData:', e);
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

async function updatePatientStatus(req, res) {
  const { userId } = req.params;
  const { acceptsRequests, consultationReason, medicalHistory, gender, age } = req.body;

  // We are just updating the specific fields in the patients table
  try {
    const updatePayload = {
      accepts_requests: acceptsRequests
    };
    if (consultationReason !== undefined) updatePayload.consultation_reason = consultationReason;
    if (medicalHistory !== undefined) updatePayload.medical_history = medicalHistory;
    if (gender !== undefined) updatePayload.gender = gender;
    if (age !== undefined) updatePayload.age = age;

    const { error } = await db.supabase
      .from('patients')
      .update(updatePayload)
      .eq('id', userId);

    if (error) throw error;
    return res.json({ success: true, message: 'Estado del paciente actualizado' });
  } catch (e) {
    console.error('Error en updatePatientStatus:', e);
    return res.status(500).json({ success: false, message: 'Error al actualizar el estado' });
  }
}

async function getStudentPublicProfile(req, res) {
  const { studentId } = req.params;
  try {
    const { data: profile } = await db.supabase.from('profiles').select('*').eq('id', studentId).maybeSingle();
    const { data: student } = await db.supabase.from('students').select('*').eq('id', studentId).maybeSingle();
    
    // Obtener promedio de calificaciones
    const avgData = await RatingsModel.getStudentAverage(studentId);
    
    // Obtener pacientes activos
    const activeCount = await RequestsModel.getActivePatientsCount(studentId);

    // Obtener lista de calificaciones
    const ratings = await RatingsModel.getStudentRatings(studentId);

    return res.json({ 
      success: true, 
      data: { 
        profile, 
        student, 
        ratings, 
        avgRating: avgData.avg, 
        ratingsCount: avgData.count,
        activePatients: activeCount 
      } 
    });
  } catch(e) {
    console.error('Error en getStudentPublicProfile:', e);
    return res.status(500).json({ success: false });
  }
}

async function getPatientProfile(req, res) {
  const { patientId } = req.params;
  try {
    const { data: profile } = await db.supabase.from('profiles').select('*').eq('id', patientId).maybeSingle();
    const { data: patient } = await db.supabase.from('patients').select('*').eq('id', patientId).maybeSingle();
    return res.json({ success: true, data: { profile, patient } });
  } catch(e) {
    console.error('Error en getPatientProfile:', e);
    return res.status(500).json({ success: false });
  }
}

module.exports = {
  updateProfile, updateStudentData, updatePatientData, getStudentPublicProfile, getPatientProfile, updatePatientStatus
};
