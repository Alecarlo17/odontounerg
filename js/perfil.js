/* =============================================
   PERFIL.JS - Gestión de Perfiles
   ============================================= */

/**
 * Actualizar perfil del usuario
 * @param {string} userId
 * @param {object} profileData
 */
async function updateProfile(userId, profileData) {
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: profileData.fullName,
      phone: profileData.phone,
      disponibilidad: profileData.disponibilidad,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);

  if (error) {
    showToast('Error al actualizar perfil', 'error');
    return false;
  }
  showToast('Perfil actualizado correctamente', 'success');
  return true;
}

/**
 * Actualizar datos específicos del estudiante
 * @param {string} userId
 * @param {object} data
 */
async function updateStudentData(userId, data) {
  const { error } = await supabase
    .from('students')
    .update({
      section: data.section,
      academic_year: data.academicYear,
      treatments_needed: data.treatments,
      bio: data.bio
    })
    .eq('id', userId);

  return !error;
}

/**
 * Actualizar datos específicos del paciente
 * @param {string} userId
 * @param {object} data
 */
async function updatePatientData(userId, data) {
  const { error } = await supabase
    .from('patients')
    .update({
      age: data.age,
      phone: data.phone,
      direccion: data.direccion,
      medical_history: data.medicalHistory,
      consultation_reason: data.consultationReason,
      accepts_requests: data.acceptsRequests !== false
    })
    .eq('id', userId);

  return !error;
}

/**
 * Subir foto de perfil
 * @param {string} userId
 * @param {File} file
 */
async function uploadProfilePhoto(userId, file) {
  if (!file) return null;

  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/avatar.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, { upsert: true });

  if (uploadError) {
    showToast('Error al subir foto', 'error');
    return null;
  }

  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName);

  // Actualizar URL en el perfil
  await supabase
    .from('profiles')
    .update({ avatar_url: urlData.publicUrl })
    .eq('id', userId);

  return urlData.publicUrl;
}

/**
 * Obtener perfil público de un estudiante
 * @param {string} studentId
 */
async function getStudentPublicProfile(studentId) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', studentId)
    .single();

  const { data: student } = await supabase
    .from('students')
    .select('*')
    .eq('id', studentId)
    .single();

  // Obtener calificaciones
  const { data: ratings } = await supabase
    .from('ratings')
    .select('score, comment, created_at, patient:patient_id(full_name)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  // Calcular promedio
  let avgRating = 0;
  if (ratings && ratings.length > 0) {
    avgRating = ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length;
  }

  return { profile, student, ratings: ratings || [], avgRating };
}

/**
 * Obtener perfil de un paciente
 * @param {string} patientId
 */
async function getPatientProfile(patientId) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', patientId)
    .single();

  const { data: patient } = await supabase
    .from('patients')
    .select('*')
    .eq('id', patientId)
    .single();

  return { profile, patient };
}

/**
 * Calificar a un estudiante
 * @param {string} studentId
 * @param {string} patientId
 * @param {string} requestId
 * @param {number} score
 * @param {string} comment
 */
async function rateStudent(studentId, patientId, requestId, score, comment = '') {
  const { error } = await supabase.from('ratings').insert({
    student_id: studentId,
    patient_id: patientId,
    request_id: requestId,
    score,
    comment: comment || null
  });

  if (error) {
    showToast('Error al enviar calificación', 'error');
    return false;
  }

  await createNotification(
    studentId,
    'calificacion',
    'Nueva calificación recibida',
    `Has recibido una calificación de ${score} estrellas`
  );

  showToast('Calificación enviada', 'success');
  return true;
}
