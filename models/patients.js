/* =============================================
   MODEL: PATIENTS.JS
   Modelo de datos para pacientes
   ============================================= */

const db = require('../config/database');

/**
 * Obtener datos de un paciente por ID
 */
async function getPatientById(patientId) {
  try {
    const { data, error } = await db.supabase
      .from('profiles')
      .select(`
        *,
        patients(*),
        initial_diagnosis(*)
      `)
      .eq('id', patientId)
      .single();

    if (error) throw error;
    
    if (data && data.patients) {
      const pat = Array.isArray(data.patients) ? data.patients[0] : data.patients;
      const activeDiagnosis = Array.isArray(data.initial_diagnosis) 
        ? data.initial_diagnosis.find(d => d.activo) || data.initial_diagnosis[0]
        : data.initial_diagnosis;
      if (pat) {
        return {
          ...data,
          age: pat.age,
          p_phone: pat.phone,
          direccion: pat.direccion,
          medical_history: pat.medical_history,
          consultation_reason: pat.consultation_reason,
          accepts_requests: pat.accepts_requests,
          gender: pat.gender,
          initial_diagnosis: activeDiagnosis || null
        };
      }
    }
    
    return data || null;
  } catch (e) {
    console.error('Error en getPatientById:', e);
    return null;
  }
}

/**
 * Obtener pacientes disponibles con sus perfiles
 */
async function getAvailablePatients(treatment = null) {
  try {
    // Buscar pacientes que tengan solicitudes activas
    const { data: busyRequests } = await db.supabase
      .from('requests')
      .select('patient_id')
      .in('status', ['accepted', 'active']);

    const busyPatientIds = (busyRequests || []).map(r => r.patient_id);

    let query = db.supabase
      .from('profiles')
      .select(`
        id, full_name, email, phone, disponibilidad, role, avatar_url,
        patients!inner(age, consultation_reason, medical_history, gender, accepts_requests),
        initial_diagnosis(especialidad_requerida, prioridad, nivel_dolor, tiempo_evolucion, problema_principal, created_at, activo)
      `)
      .eq('role', 'patient')
      .eq('patients.accepts_requests', true);

    if (busyPatientIds.length > 0) {
      // Excluir pacientes ocupados
      query = query.not('id', 'in', `(${busyPatientIds.join(',')})`);
    }

    if (treatment && treatment !== 'all') {
      query = query.eq('patients.consultation_reason', treatment);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    return (data || []).map(row => {
      const pat = Array.isArray(row.patients) ? row.patients[0] : row.patients;
      const activeDiagnosis = Array.isArray(row.initial_diagnosis) 
        ? row.initial_diagnosis.find(d => d.activo) || row.initial_diagnosis[0]
        : row.initial_diagnosis;

      return {
        id: row.id,
        full_name: row.full_name,
        email: row.email,
        phone: row.phone,
        avatar_url: row.avatar_url,
        disponibilidad: row.disponibilidad,
        role: row.role,
        patients: {
          age: pat.age,
          consultation_reason: pat.consultation_reason,
          medical_history: pat.medical_history,
          gender: pat.gender
        },
        initial_diagnosis: activeDiagnosis || null
      };
    });
  } catch (e) {
    console.error('Error en getAvailablePatients:', e);
    return [];
  }
}

/**
 * Actualizar datos del paciente
 */
async function updatePatient(patientId, patientData) {
  try {
    const { error } = await db.supabase
      .from('patients')
      .update({
        phone: patientData.phone,
        age: patientData.age,
        direccion: patientData.address || patientData.direccion,
        medical_history: patientData.medicalHistory,
        consultation_reason: patientData.consultationReason,
        accepts_requests: patientData.acceptsRequests !== false
      })
      .eq('id', patientId);

    if (error) throw error;
    return true;
  } catch (e) {
    console.error('Error en updatePatient:', e);
    return false;
  }
}

/**
 * Obtener todos los pacientes (para administración)
 */
async function getAllPatients() {
  try {
    const { data, error } = await db.supabase
      .from('profiles')
      .select(`
        *,
        patients(age, consultation_reason, medical_history, phone)
      `)
      .eq('role', 'patient')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return (data || []).map(row => {
      const pat = Array.isArray(row.patients) ? row.patients[0] || {} : row.patients || {};
      return {
        id: row.id,
        full_name: row.full_name,
        role: row.role,
        created_at: row.created_at,
        patients: {
          age: pat.age,
          consultation_reason: pat.consultation_reason,
          medical_history: pat.medical_history,
          phone: pat.phone || row.phone
        }
      };
    });
  } catch (e) {
    console.error('Error en getAllPatients:', e);
    return [];
  }
}

module.exports = {
  getPatientById,
  getAvailablePatients,
  updatePatient,
  getAllPatients
};
