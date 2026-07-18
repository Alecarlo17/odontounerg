/* =============================================
   CONTROLLER: PROFILE CONTROLLER
   ============================================= */

const UsersModel = require('../models/users');
const PatientsModel = require('../models/patients');
const RequestsModel = require('../models/requests');
const RatingsModel = require('../models/ratings');
const db = require('../config/database');

const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
const phoneRegex = /^\d{11}$/;

async function updateProfile(req, res) {
  const { userId } = req.params;
  const { fullName, phone, disponibilidad } = req.body;

  if (fullName && !nameRegex.test(fullName)) {
    return res.status(400).json({ success: false, message: 'El nombre solo debe contener letras, espacios, tildes y la letra ñ' });
  }

  if (phone && !phoneRegex.test(phone)) {
    return res.status(400).json({ success: false, message: 'El teléfono debe tener exactamente 11 dígitos y contener solo números' });
  }

  const success = await UsersModel.updateUserProfile(userId, { fullName, phone, disponibilidad });
  if (success) return res.json({ success: true });
  return res.status(500).json({ success: false, message: 'Error interno del servidor al actualizar perfil' });
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
        bio: data.bio,
        gender: data.gender
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
    const [
      { data: profile },
      { data: student },
      avgData,
      activeCount,
      ratings
    ] = await Promise.all([
      db.supabase.from('profiles').select('*').eq('id', studentId).maybeSingle(),
      db.supabase.from('students').select('*').eq('id', studentId).maybeSingle(),
      RatingsModel.getStudentAverage(studentId),
      RequestsModel.getActivePatientsCount(studentId),
      RatingsModel.getStudentRatings(studentId)
    ]);

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
    const [
      { data: profile },
      { data: patient }
    ] = await Promise.all([
      db.supabase.from('profiles').select('*').eq('id', patientId).maybeSingle(),
      db.supabase.from('patients').select('*').eq('id', patientId).maybeSingle()
    ]);
    return res.json({ success: true, data: { profile, patient } });
  } catch(e) {
    console.error('Error en getPatientProfile:', e);
    return res.status(500).json({ success: false });
  }
}

module.exports = {
  updateProfile, updateStudentData, updatePatientData, getStudentPublicProfile, getPatientProfile, updatePatientStatus
};
