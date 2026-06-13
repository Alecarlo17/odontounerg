/* =============================================
   CONTROLLER: DASHBOARD CONTROLLER
   ============================================= */

const RatingsModel = require('../models/ratings');
const RequestsModel = require('../models/requests');
const { logActivity } = require('../services/notificationService');
const db = require('../config/database');

/* =========================================
   DASHBOARDS DE ESTADÍSTICAS
   ========================================= */

async function getPatientDashboard(req, res) {
  const { userId } = req.params;
  try {
    const [
      { count: pending },
      { count: accepted },
      { count: appointments },
      { count: completed }
    ] = await Promise.all([
      db.supabase.from('requests').select('*', { count: 'exact', head: true }).eq('patient_id', userId).eq('status', 'pending'),
      db.supabase.from('requests').select('*', { count: 'exact', head: true }).eq('patient_id', userId).in('status', ['accepted', 'active']),
      db.supabase.from('appointments').select('*, requests!inner(*)', { count: 'exact', head: true }).eq('requests.patient_id', userId).in('status', ['proposed', 'confirmed']),
      db.supabase.from('requests').select('*', { count: 'exact', head: true }).eq('patient_id', userId).eq('status', 'completed')
    ]);

    return res.json({
      success: true,
      data: {
        pendingRequests: pending || 0,
        acceptedRequests: accepted || 0,
        activeAppointments: appointments || 0,
        completedTreatments: completed || 0
      }
    });
  } catch(e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function getStudentDashboard(req, res) {
  const { userId } = req.params;
  try {
    const [
      { count: activePatients },
      { count: pending },
      { count: appointments },
      { count: completed },
      ratingStats
    ] = await Promise.all([
      db.supabase.from('requests').select('*', { count: 'exact', head: true }).eq('student_id', userId).in('status', ['accepted', 'active']),
      db.supabase.from('requests').select('*', { count: 'exact', head: true }).eq('student_id', userId).eq('status', 'pending'),
      db.supabase.from('appointments').select('*, requests!inner(*)', { count: 'exact', head: true }).eq('requests.student_id', userId).in('status', ['proposed', 'confirmed']),
      db.supabase.from('requests').select('*', { count: 'exact', head: true }).eq('student_id', userId).eq('status', 'completed'),
      RatingsModel.getStudentAverage(userId)
    ]);

    return res.json({
      success: true,
      data: {
        activePatients: activePatients || 0,
        pendingRequests: pending || 0,
        activeAppointments: appointments || 0,
        completedTreatments: completed || 0,
        avgRating: parseFloat((ratingStats.avg || 0).toFixed(1)),
        totalRatings: ratingStats.count || 0
      }
    });
  } catch(e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function getAdminDashboard(req, res) {
  try {
    const [
      { count: users },
      { count: students },
      { count: patients },
      { count: requests },
      { count: appointments },
      { count: pendingReqs },
      { count: suspendedUsers },
      { data: requestsData },
      { data: apptData }
    ] = await Promise.all([
      db.supabase.from('profiles').select('*', { count: 'exact', head: true }),
      db.supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      db.supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'patient'),
      db.supabase.from('requests').select('*', { count: 'exact', head: true }),
      db.supabase.from('appointments').select('*', { count: 'exact', head: true }),
      db.supabase.from('requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      db.supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('disponibilidad', 'suspendido'),
      db.supabase.from('requests').select('status'),
      db.supabase.from('appointments').select('status')
    ]);

    const reqStatus = (requestsData || []).reduce((acc, curr) => {
      const existing = acc.find(item => item.status === curr.status);
      if (existing) existing.count++;
      else acc.push({ status: curr.status, count: 1 });
      return acc;
    }, []);

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
        suspendedUsers: suspendedUsers || 0,
        chartRequests: reqStatus,
        chartAppointments: appStatus
      }
    });
  } catch(e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

/* =========================================
   MÉTRICAS ACADÉMICAS PARA ADMIN
   ========================================= */

async function getAdminMetrics(req, res) {
  try {
    const [
      { count: totalPatients },
      { count: activePatients },
      { count: dischargedPatients },
      { count: abandonedCases },
      { count: totalStudents },
      { data: activeStudentsData },
      { count: pendingRequests },
      { count: acceptedRequests }
    ] = await Promise.all([
      db.supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'patient'),
      db.supabase.from('requests').select('*', { count: 'exact', head: true }).in('status', ['accepted', 'active']),
      db.supabase.from('requests').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      db.supabase.from('requests').select('*', { count: 'exact', head: true }).eq('status', 'abandoned'),
      db.supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      db.supabase.from('requests').select('student_id').in('status', ['accepted', 'active']),
      db.supabase.from('requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      db.supabase.from('requests').select('*', { count: 'exact', head: true }).in('status', ['accepted', 'active'])
    ]);

    const activeStudents = new Set((activeStudentsData || []).map(r => r.student_id)).size;
    const { count: completedRequests } = await db.supabase.from('requests').select('*', { count: 'exact', head: true }).eq('status', 'completed');

    // Citas
    const { count: scheduledAppointments } = await db.supabase.from('appointments').select('*', { count: 'exact', head: true }).in('status', ['proposed', 'confirmed']);
    const { count: completedAppointments } = await db.supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('status', 'completed');

    // Tratamientos
    const { count: activeTreatments } = await db.supabase.from('treatments').select('*', { count: 'exact', head: true }).eq('estado', 'en_proceso');
    const { count: completedTreatments } = await db.supabase.from('treatments').select('*', { count: 'exact', head: true }).eq('estado', 'finalizado');

    // Calificación promedio del sistema
    const { data: allRatings } = await db.supabase.from('ratings').select('score').not('comment', 'like', '[P_RATING]%');
    const avgSystemRating = allRatings && allRatings.length > 0
      ? (allRatings.reduce((sum, r) => sum + r.score, 0) / allRatings.length).toFixed(1)
      : 0;

    return res.json({
      success: true,
      data: {
        patients: { total: totalPatients || 0, active: activePatients || 0, discharged: dischargedPatients || 0, abandoned: abandonedCases || 0 },
        students: { total: totalStudents || 0, active: activeStudents || 0 },
        requests: { pending: pendingRequests || 0, accepted: acceptedRequests || 0, completed: completedRequests || 0 },
        appointments: { scheduled: scheduledAppointments || 0, completed: completedAppointments || 0 },
        treatments: { active: activeTreatments || 0, completed: completedTreatments || 0 },
        avgSystemRating: parseFloat(avgSystemRating)
      }
    });
  } catch(e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

/* =========================================
   REPORTES PARA DEFENSA
   ========================================= */

async function getAdminReports(req, res) {
  try {
    // Top estudiantes con más casos completados
    const { data: completedReqs } = await db.supabase
      .from('requests')
      .select('student_id, student:student_id(full_name)')
      .eq('status', 'completed');

    const studentCounts = {};
    (completedReqs || []).forEach(r => {
      const id = r.student_id;
      const name = Array.isArray(r.student) ? r.student[0]?.full_name : r.student?.full_name;
      if (!studentCounts[id]) studentCounts[id] = { name: name || 'Desconocido', count: 0 };
      studentCounts[id].count++;
    });
    const topStudents = Object.values(studentCounts).sort((a, b) => b.count - a.count).slice(0, 5);

    // Tratamientos más frecuentes
    const { data: treatmentsData } = await db.supabase.from('treatments').select('tratamiento');
    const treatmentCounts = {};
    (treatmentsData || []).forEach(t => {
      const name = t.tratamiento?.trim().toLowerCase() || 'sin nombre';
      treatmentCounts[name] = (treatmentCounts[name] || 0) + 1;
    });
    const topTreatments = Object.entries(treatmentCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Tasa de éxito vs abandono
    const { count: totalClosed } = await db.supabase.from('requests').select('*', { count: 'exact', head: true }).in('status', ['completed', 'abandoned']);
    const { count: totalCompleted } = await db.supabase.from('requests').select('*', { count: 'exact', head: true }).eq('status', 'completed');
    const { count: totalAbandoned } = await db.supabase.from('requests').select('*', { count: 'exact', head: true }).eq('status', 'abandoned');

    const successRate = totalClosed > 0 ? ((totalCompleted / totalClosed) * 100).toFixed(1) : 0;
    const abandonRate = totalClosed > 0 ? ((totalAbandoned / totalClosed) * 100).toFixed(1) : 0;

    // Promedio de satisfacción
    const { data: allRatings } = await db.supabase.from('ratings').select('score').not('comment', 'like', '[P_RATING]%');
    const avgRating = allRatings && allRatings.length > 0
      ? (allRatings.reduce((sum, r) => sum + r.score, 0) / allRatings.length).toFixed(1)
      : 0;

    return res.json({
      success: true,
      data: {
        topStudents,
        topTreatments,
        rates: {
          total: totalClosed || 0,
          completed: totalCompleted || 0,
          abandoned: totalAbandoned || 0,
          successRate: parseFloat(successRate),
          abandonRate: parseFloat(abandonRate)
        },
        avgSatisfaction: parseFloat(avgRating),
        totalRatings: allRatings?.length || 0
      }
    });
  } catch(e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

/* =========================================
   TRATAMIENTOS
   ========================================= */

async function getTreatments(req, res) {
  const { userId, role } = req.params;
  try {
    const col = role === 'student' ? 'student_id' : 'patient_id';
    const joinCol = role === 'student' ? 'patient:patient_id(full_name)' : 'student:student_id(full_name)';

    const { data: treatmentsData, error } = await db.supabase
      .from('treatments')
      .select(`*, ${joinCol}`)
      .eq(col, userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Normalizar nombre del otro participante
    const data = (treatmentsData || []).map(t => {
      const other = role === 'student' ? t.patient : t.student;
      t.other_name = Array.isArray(other) ? other[0]?.full_name : (other?.full_name || 'Desconocido');
      return t;
    });

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

    const { data: inserted, error } = await db.supabase
      .from('treatments')
      .insert({
        patient_id: patientId,
        student_id: studentId,
        tratamiento,
        fecha: now,
        estado: estado || 'en_proceso',
        created_at: now,
        observaciones: observaciones || '',
        sesiones_count: 0
      })
      .select('id')
      .single();

    if (error) throw error;

    // Transicionar la solicitud a active automáticamente
    await RequestsModel.transitionToActive(studentId, patientId);

    const { data: studentProfile } = await db.supabase.from('profiles').select('full_name').eq('id', studentId).maybeSingle();
    await logActivity(studentId, studentProfile?.full_name || 'Estudiante', 'Tratamiento creado', 'Tratamientos', tratamiento);

    return res.json({ success: true, message: 'Tratamiento registrado', data: { id: inserted?.id } });
  } catch(e) {
    return res.status(500).json({ success: false, message: 'Error al registrar tratamiento' });
  }
}

async function updateTreatmentStatus(req, res) {
  const { treatmentId } = req.params;
  const { estado } = req.body;
  if (!estado) return res.status(400).json({ success: false, message: 'Falta estado' });
  try {
    const { error } = await db.supabase
      .from('treatments')
      .update({ estado })
      .eq('id', treatmentId);
    if (error) throw error;

    await logActivity(null, 'Estudiante', 'Estado de tratamiento actualizado', 'Tratamientos', `Nuevo estado: ${estado}`);
    return res.json({ success: true, message: 'Estado actualizado' });
  } catch(e) {
    return res.status(500).json({ success: false, message: 'Error al actualizar tratamiento' });
  }
}

/* =========================================
   SESIONES CLÍNICAS
   ========================================= */

async function getSessionsByTreatment(req, res) {
  const { treatmentId } = req.params;
  try {
    const { data, error } = await db.supabase
      .from('treatment_sessions')
      .select('*')
      .eq('treatment_id', treatmentId)
      .order('fecha', { ascending: true });

    if (error) throw error;
    return res.json({ success: true, data: data || [] });
  } catch(e) {
    return res.status(500).json({ success: false, message: 'Error al cargar sesiones' });
  }
}

async function createSession(req, res) {
  const { treatmentId } = req.params;
  const { procedimiento, observaciones, recomendaciones, estado, fecha, studentId } = req.body;

  if (!procedimiento) {
    return res.status(400).json({ success: false, message: 'El procedimiento es obligatorio' });
  }

  try {
    // Obtener número de sesión (contar existentes + 1)
    const { count: sessionCount } = await db.supabase
      .from('treatment_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('treatment_id', treatmentId);

    const numeroSesion = (sessionCount || 0) + 1;
    const sessionFecha = fecha || new Date().toISOString();

    const { data: inserted, error: insertError } = await db.supabase
      .from('treatment_sessions')
      .insert({
        treatment_id: treatmentId,
        numero_sesion: numeroSesion,
        fecha: sessionFecha,
        procedimiento,
        observaciones: observaciones || '',
        recomendaciones: recomendaciones || '',
        estado: estado || 'realizada',
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (insertError) throw insertError;

    // Actualizar treatments con última sesión y contador
    await db.supabase
      .from('treatments')
      .update({
        ultima_sesion: sessionFecha,
        sesiones_count: numeroSesion,
        estado: 'en_proceso'
      })
      .eq('id', treatmentId);

    if (studentId) {
      const { data: studentProfile } = await db.supabase.from('profiles').select('full_name').eq('id', studentId).maybeSingle();
      await logActivity(studentId, studentProfile?.full_name || 'Estudiante', 'Sesión clínica registrada', 'Sesiones', `Sesión #${numeroSesion}: ${procedimiento}`);
    }

    return res.json({ success: true, message: 'Sesión registrada exitosamente', data: { id: inserted?.id, numero_sesion: numeroSesion } });
  } catch(e) {
    console.error('Error en createSession:', e);
    return res.status(500).json({ success: false, message: 'Error al registrar sesión' });
  }
}

/* =========================================
   CALIFICACIONES
   ========================================= */

async function createRating(req, res) {
  const { studentId, patientId, rating, comment } = req.body;
  if (!studentId || !patientId || !rating) {
    return res.status(400).json({ success: false, message: 'Faltan datos para la calificación' });
  }
  const result = await RatingsModel.createRating(studentId, patientId, rating, comment);

  if (result.success) {
    await logActivity(patientId, 'Paciente', 'Calificación realizada', 'Calificaciones', `Calificación: ${rating}/5`);
  }

  return res.json(result);
}

/* =========================================
   ESTADO DEL CASO (para timeline del paciente)
   ========================================= */

async function getCaseStatus(req, res) {
  const { patientId } = req.params;
  try {
    // Obtener la solicitud más reciente activa o completada
    const { data: request } = await db.supabase
      .from('requests')
      .select('*, student:student_id(full_name, email)')
      .eq('patient_id', patientId)
      .in('status', ['accepted', 'active', 'completed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!request) {
      return res.json({ success: true, data: null });
    }

    const studentData = Array.isArray(request.student) ? request.student[0] : request.student;

    // Citas de esa solicitud
    const { data: appointments } = await db.supabase
      .from('appointments')
      .select('status, date')
      .eq('request_id', request.id)
      .order('date', { ascending: true });

    const confirmedAppt = (appointments || []).find(a => a.status === 'confirmed' || a.status === 'completed');

    // Tratamientos
    const { data: treatments } = await db.supabase
      .from('treatments')
      .select('id, tratamiento, estado, sesiones_count, ultima_sesion')
      .eq('patient_id', patientId)
      .eq('student_id', request.student_id)
      .order('created_at', { ascending: true });

    const totalSessions = (treatments || []).reduce((sum, t) => sum + (t.sesiones_count || 0), 0);

    return res.json({
      success: true,
      data: {
        request: {
          id: request.id,
          status: request.status,
          created_at: request.created_at,
          discharged_at: request.discharged_at
        },
        student: studentData || null,
        firstAppointment: confirmedAppt || null,
        treatments: treatments || [],
        totalSessions,
        hasTreatments: (treatments || []).length > 0
      }
    });
  } catch(e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

module.exports = {
  getPatientDashboard,
  getStudentDashboard,
  getAdminDashboard,
  getAdminMetrics,
  getAdminReports,
  getTreatments,
  createTreatment,
  createRating,
  updateTreatmentStatus,
  getSessionsByTreatment,
  createSession,
  getCaseStatus
};
