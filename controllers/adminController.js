/* =============================================
   CONTROLLER: ADMIN CONTROLLER
   ============================================= */

const UsersModel = require('../models/users');
const PatientsModel = require('../models/patients');
const RequestsModel = require('../models/requests');
const AppointmentsModel = require('../models/appointments');
const db = require('../config/database');

async function getAllUsers(req, res) {
  try {
    const data = await UsersModel.getAllProfiles();
    return res.json({ success: true, data });
  } catch(e) { 
    return res.status(500).json({ success: false }); 
  }
}

async function getStudents(req, res) {
  try {
    const { data, error } = await db.supabase
      .from('profiles')
      .select(`
        *,
        students(student_id_card, section, academic_year)
      `)
      .eq('role', 'student')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formatted = (data || []).map(d => {
      const std = Array.isArray(d.students) ? d.students[0] || {} : d.students || {};
      return {
        ...d,
        students: { 
          student_id_card: std.student_id_card, 
          section: std.section, 
          academic_year: std.academic_year 
        }
      };
    });
    return res.json({ success: true, data: formatted });
  } catch(e) { 
    return res.status(500).json({ success: false }); 
  }
}

async function getPatients(req, res) {
  try {
    const data = await PatientsModel.getAllPatients();
    return res.json({ success: true, data });
  } catch(e) { 
    return res.status(500).json({ success: false }); 
  }
}

async function getAllRequests(req, res) {
  try {
    const data = await RequestsModel.getAllRequests();
    return res.json({ success: true, data });
  } catch(e) { 
    return res.status(500).json({ success: false }); 
  }
}

async function getAllAppointments(req, res) {
  try {
    const data = await AppointmentsModel.getAllAppointments();
    return res.json({ success: true, data });
  } catch(e) { 
    return res.status(500).json({ success: false }); 
  }
}

async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    const success = await UsersModel.deleteProfile(id);
    if (!success) throw new Error('Failed to delete user');
    return res.json({ success: true });
  } catch(e) { 
    return res.status(500).json({ success: false }); 
  }
}

module.exports = { getAllUsers, getStudents, getPatients, getAllRequests, getAllAppointments, deleteUser };
