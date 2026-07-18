/* =============================================
   CONTROLLER: ADMIN CONTROLLER
   ============================================= */

const UsersModel = require('../models/users');
const PatientsModel = require('../models/patients');
const RequestsModel = require('../models/requests');
const AppointmentsModel = require('../models/appointments');
const DashboardController = require('./dashboardController');
const db = require('../config/database');

async function getAllUsers(req, res) {
  try {
    const data = await UsersModel.getAllProfiles();
    return res.json({ success: true, data });
  } catch(e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function getStudents(req, res) {
  try {
    const { data, error } = await db.supabase
      .from('profiles')
      .select('*, students(student_id_card, section, academic_year)')
      .eq('role', 'student')
      .order('created_at', { ascending: false });
    if (error) throw error;
    
    // Add stats
    const { data: reqs } = await db.supabase
      .from('requests')
      .select('student_id, status')
      .in('status', ['completed', 'abandoned']);
      
    const statsMap = {};
    if (reqs) {
      reqs.forEach(r => {
        if (!statsMap[r.student_id]) statsMap[r.student_id] = { completed: 0, abandoned: 0 };
        if (r.status === 'completed') statsMap[r.student_id].completed++;
        if (r.status === 'abandoned') statsMap[r.student_id].abandoned++;
      });
    }

    const formatted = (data || []).map(d => {
      const std = Array.isArray(d.students) ? d.students[0] || {} : d.students || {};
      return { 
        ...d, 
        students: { student_id_card: std.student_id_card, section: std.section, academic_year: std.academic_year },
        stats: statsMap[d.id] || { completed: 0, abandoned: 0 }
      };
    });
    return res.json({ success: true, data: formatted });
  } catch(e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function getPatients(req, res) {
  try {
    const data = await PatientsModel.getAllPatients();
    return res.json({ success: true, data });
  } catch(e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function getAllRequests(req, res) {
  try {
    const data = await RequestsModel.getAllRequests();
    return res.json({ success: true, data });
  } catch(e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function getAllAppointments(req, res) {
  try {
    const data = await AppointmentsModel.getAllAppointments();
    return res.json({ success: true, data });
  } catch(e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function suspendUser(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    // Evitar suspender a otro administrador
    const { data: userProfile, error: profileErr } = await db.supabase
      .from('profiles')
      .select('role')
      .eq('id', id)
      .single();
      
    if (profileErr) throw new Error('No se pudo verificar el rol del usuario');
    if (userProfile.role === 'admin') {
      return res.status(403).json({ success: false, message: 'No se puede suspender a otro administrador' });
    }

    const success = await UsersModel.suspendProfile(id, reason || 'Suspensión administrativa');
    if (!success) throw new Error('Failed to suspend user');
    return res.json({ success: true });
  } catch(e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function reactivateUser(req, res) {
  try {
    const { id } = req.params;
    const success = await UsersModel.reactivateProfile(id);
    if (!success) throw new Error('Failed to reactivate user');
    return res.json({ success: true });
  } catch(e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

// Métricas académicas completas
async function getMetrics(req, res) {
  return DashboardController.getAdminMetrics(req, res);
}

// Reportes para defensa
async function getReportData(req, res) {
  return DashboardController.getAdminReports(req, res);
}

// Log de actividad
async function getActivityLog(req, res) {
  try {
    const { limit = 100, dateFilter = 'todos' } = req.query;
    let query = db.supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false });

    // Filtros de fecha
    if (dateFilter !== 'todos') {
      const now = new Date();
      if (dateFilter === 'hoy') {
        now.setHours(0, 0, 0, 0);
        query = query.gte('created_at', now.toISOString());
      } else if (dateFilter === '7dias') {
        now.setDate(now.getDate() - 7);
        query = query.gte('created_at', now.toISOString());
      } else if (dateFilter === '30dias') {
        now.setDate(now.getDate() - 30);
        query = query.gte('created_at', now.toISOString());
      } else if (dateFilter === 'mes') {
        now.setDate(1);
        now.setHours(0, 0, 0, 0);
        query = query.gte('created_at', now.toISOString());
      }
    }

    query = query.limit(parseInt(limit));
    const { data: logs, error } = await query;
    if (error) throw error;

    // Obtener perfiles para el reemplazo visual de UUIDs
    const { data: profiles } = await db.supabase.from('profiles').select('id, full_name');
    const profileMap = {};
    if (profiles) {
      profiles.forEach(p => {
        profileMap[p.id] = p.full_name || 'Usuario desconocido';
      });
    }

    const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;
    
    const formattedLogs = (logs || []).map(log => {
      let accion = log.accion || '';
      let detalle = log.detalle || '';
      
      accion = accion.replace(uuidRegex, match => profileMap[match] || match);
      detalle = detalle.replace(uuidRegex, match => profileMap[match] || match);
      
      return { ...log, accion, detalle };
    });

    return res.json({ success: true, data: formattedLogs });
  } catch(e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

// Todos los tratamientos (admin)
async function getAllTreatments(req, res) {
  try {
    const { data, error } = await db.supabase
      .from('treatments')
      .select(`
        *,
        patient:patient_id(full_name),
        student:student_id(full_name)
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const formatted = (data || []).map(t => ({
      ...t,
      patient_name: Array.isArray(t.patient) ? t.patient[0]?.full_name : t.patient?.full_name,
      student_name: Array.isArray(t.student) ? t.student[0]?.full_name : t.student?.full_name
    }));
    return res.json({ success: true, data: formatted });
  } catch(e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

module.exports = {
  getAllUsers, getStudents, getPatients,
  getAllRequests, getAllAppointments,
  suspendUser, reactivateUser, getMetrics, getReportData, getActivityLog, getAllTreatments
};
