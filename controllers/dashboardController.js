/* =============================================
   CONTROLLER: DASHBOARD CONTROLLER
   Provee estadísticas y datos consolidados
   para los dashboards.
   ============================================= */

const RatingsModel = require('../models/ratings');
const db = require('../config/database');

async function getPatientDashboard(req, res) {
  const { userId } = req.params;
  try {
    const { count: pending } = await db.supabase
      .from('requests')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', userId)
      .eq('status', 'pending');

    const { count: accepted } = await db.supabase
      .from('requests')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', userId)
      .in('status', ['accepted', 'active']);
    
    // For appointments, we need to join requests and filter by patient_id
    const { count: appointments } = await db.supabase
      .from('appointments')
      .select('*, requests!inner(*)', { count: 'exact', head: true })
      .eq('requests.patient_id', userId)
      .in('status', ['proposed', 'confirmed']);

    return res.json({
      success: true,
      data: {
        pendingRequests: pending || 0,
        acceptedRequests: accepted || 0,
        activeAppointments: appointments || 0
      }
    });
  } catch(e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function getStudentDashboard(req, res) {
  const { userId } = req.params;
  try {
    const { count: pending } = await db.supabase
      .from('requests')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', userId)
      .eq('status', 'pending');

    const { count: accepted } = await db.supabase
      .from('requests')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', userId)
      .in('status', ['accepted', 'active']);
    
    const { count: appointments } = await db.supabase
      .from('appointments')
      .select('*, requests!inner(*)', { count: 'exact', head: true })
      .eq('requests.student_id', userId)
      .in('status', ['proposed', 'confirmed']);

    return res.json({
      success: true,
      data: {
        pendingRequests: pending || 0,
        acceptedRequests: accepted || 0,
        activeAppointments: appointments || 0
      }
    });
  } catch(e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function getAdminDashboard(req, res) {
  try {
    const { count: users } = await db.supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { count: students } = await db.supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student');
    const { count: patients } = await db.supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'patient');
    const { count: requests } = await db.supabase.from('requests').select('*', { count: 'exact', head: true });
    const { count: appointments } = await db.supabase.from('appointments').select('*', { count: 'exact', head: true });
    const { count: pendingReqs } = await db.supabase.from('requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');

    // Supabase JS doesn't have a direct GROUP BY count API yet, so we fetch and reduce for chart data
    const { data: requestsData } = await db.supabase.from('requests').select('status');
    const reqStatus = (requestsData || []).reduce((acc, curr) => {
      const existing = acc.find(item => item.status === curr.status);
      if (existing) existing.count++;
      else acc.push({ status: curr.status, count: 1 });
      return acc;
    }, []);

    const { data: apptData } = await db.supabase.from('appointments').select('status');
    const appStatus = (apptData || []).reduce((acc, curr) => {
      const existing = acc.find(item => item.status === curr.status);
      if (existing) existing.count++;
      else acc.push({ status: curr.status, count: 1 });
      return acc;
    }, []);
    
    return res.json({
      success: true,
      data: {
        totalUsers: users || 0,
        totalStudents: students || 0,
        totalPatients: patients || 0,
        totalRequests: requests || 0,
        totalAppointments: appointments || 0,
        pendingRequests: pendingReqs || 0,
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
    // Relation names in Supabase are based on the foreign key names. 
    // Usually it would be `student:profiles!treatments_student_id_fkey(full_name)` or similar.
    // For simplicity we will query treatments then fetch the other profile's name manually, 
    // or just fetch `profiles` normally if we don't know the exact foreign key name.
    
    const { data: treatmentsData, error } = await db.supabase
      .from('treatments')
      .select('*')
      .eq(col, userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const data = await Promise.all((treatmentsData || []).map(async (t) => {
      const otherId = role === 'student' ? t.patient_id : t.student_id;
      if (otherId) {
        const { data: profile } = await db.supabase.from('profiles').select('full_name').eq('id', otherId).maybeSingle();
        t.other_name = profile ? profile.full_name : 'Desconocido';
      }
      return t;
    }));

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
    const now = new Date().toISOString();
    
    const { error } = await db.supabase
      .from('treatments')
      .insert({
        patient_id: patientId, 
        student_id: studentId, 
        tratamiento, 
        fecha: now, 
        estado: estado || 'en_proceso', 
        created_at: now, 
        observaciones: observaciones || ''
      });

    if (error) throw error;
    return res.json({ success: true, message: 'Tratamiento registrado' });
  } catch(e) {
    return res.status(500).json({ success: false, message: 'Error al registrar tratamiento' });
  }
}

async function createRating(req, res) {
  const { studentId, patientId, rating, comment } = req.body;
  if (!studentId || !patientId || !rating) {
    return res.status(400).json({ success: false, message: 'Faltan datos para la calificación' });
  }
  const result = await RatingsModel.createRating(studentId, patientId, rating, comment);
  return res.json(result);
}

module.exports = {
  getPatientDashboard,
  getStudentDashboard,
  getAdminDashboard,
  getTreatments,
  createTreatment,
  createRating
};
