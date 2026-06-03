/* =============================================
   PERFIL.JS - Gestión de Perfiles (MVC)
   ============================================= */

/**
 * Actualizar perfil del usuario
 */
async function updateProfile(userId, profileData) {
  try {
    const res = await fetch(`/api/profiles/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData)
    });
    const json = await res.json();
    if (!json.success) throw new Error();
    showToast('Perfil actualizado correctamente', 'success');
    return true;
  } catch (e) {
    showToast('Error al actualizar perfil', 'error');
    return false;
  }
}

/**
 * Actualizar datos específicos del estudiante
 */
async function updateStudentData(userId, data) {
  try {
    const res = await fetch(`/api/profiles/${userId}/student`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    return json.success;
  } catch (e) {
    return false;
  }
}

/**
 * Actualizar datos específicos del paciente
 */
async function updatePatientData(userId, data) {
  try {
    const res = await fetch(`/api/profiles/${userId}/patient`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    return json.success;
  } catch (e) {
    return false;
  }
}

/**
 * Subir foto de perfil
 */
async function uploadProfilePhoto(userId, file) {
  if (!file) return null;
  
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/avatar.${fileExt}`;
  const client = window.supabaseClient || supabase;

  const { error: uploadError } = await client.storage
    .from('avatars')
    .upload(fileName, file, { upsert: true });

  if (uploadError) {
    showToast('Error al subir foto', 'error');
    return null;
  }

  const { data: urlData } = client.storage
    .from('avatars')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

/**
 * Obtener perfil público de un estudiante
 */
async function getStudentPublicProfile(studentId) {
  try {
    const res = await fetch(`/api/profiles/${studentId}/public-student`);
    const json = await res.json();
    return json.data || { profile: null, student: null, ratings: [], avgRating: 0 };
  } catch (e) {
    return { profile: null, student: null, ratings: [], avgRating: 0 };
  }
}

/**
 * Obtener perfil de un paciente
 */
async function getPatientProfile(patientId) {
  try {
    const res = await fetch(`/api/profiles/${patientId}/public-patient`);
    const json = await res.json();
    return json.data || { profile: null, patient: null };
  } catch (e) {
    return { profile: null, patient: null };
  }
}

/**
 * Calificar a un estudiante
 */
async function rateStudent(studentId, patientId, requestId, score, comment = '') {
  try {
    // Si la calificación se guarda localmente, deberíamos crear un endpoint /api/ratings
    // Por simplicidad para el demo offline:
    showToast('Calificación enviada localmente', 'success');
    return true;
  } catch (e) {
    return false;
  }
}
