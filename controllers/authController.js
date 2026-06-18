/* =============================================
   CONTROLLER: AUTH CONTROLLER
   Controlador de autenticación
   
   Maneja la lógica de login, registro,
   verificación de sesión y logout.
   ============================================= */

const UsersModel = require('../models/users');
const db = require('../config/database');

/**
 * Validar año académico permitido
 * Solo se permiten estudiantes de 3er y 4to año
 * @param {string} academicYear - Año académico seleccionado
 * @returns {boolean} True si el año es válido
 */
function isValidAcademicYear(academicYear) {
  const allowedYears = ['3er año', '4to año'];
  return allowedYears.includes(academicYear);
}

const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
const cedulaRegex = /^\d{6,10}$/;
const phoneRegex = /^\d{11}$/;

/**
 * Validar y registrar datos de estudiante
 * @param {object} req - Request de Express
 * @param {object} res - Response de Express
 */
async function registerStudent(req, res) {
  const { fullName, email, cedula, academicYear, password, phone, section, age, gender, treatments } = req.body;

  // Validar campos obligatorios
  if (!fullName || !email || !cedula || !password) {
    return res.status(400).json({ success: false, message: 'Todos los campos obligatorios deben ser completados' });
  }

  // Validar formato del nombre
  if (!nameRegex.test(fullName)) {
    return res.status(400).json({ success: false, message: 'El nombre solo debe contener letras, espacios, tildes y la letra ñ' });
  }

  // Validar año académico
  if (academicYear && !isValidAcademicYear(academicYear)) {
    return res.status(400).json({ success: false, message: 'Solo se permiten estudiantes de 3er o 4to año' });
  }

  // Validar cédula (6-10 dígitos)
  if (!cedulaRegex.test(cedula)) {
    return res.status(400).json({ success: false, message: 'La cédula debe tener entre 6 y 10 dígitos y contener solo números' });
  }

  // Validar teléfono si fue proporcionado
  if (phone && !phoneRegex.test(phone)) {
    return res.status(400).json({ success: false, message: 'El teléfono debe tener exactamente 11 dígitos y contener solo números' });
  }

  // Validar contraseña (mínimo 6 caracteres)
  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 8 caracteres' });
  }

  try {
    // 1. Crear el usuario en Auth
    const { data: authData, error: authError } = await db.supabase.auth.admin.createUser({
      email: email.trim(),
      password: password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: 'student' }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        return res.status(400).json({ success: false, message: 'El correo ya está en uso. Intente iniciar sesión o use otro correo.' });
      }
      return res.status(400).json({ success: false, message: authError.message });
    }

    const userId = authData.user.id;

    // 2. Crear el perfil en profiles
    const { error: profileError } = await db.supabase.from('profiles').insert({
      id: userId,
      full_name: fullName,
      email: email.trim(),
      phone: phone || null,
      role: 'student',
      disponibilidad: 'disponible',
      updated_at: new Date().toISOString()
    });

    if (profileError) {
      await db.supabase.auth.admin.deleteUser(userId); // rollback
      return res.status(500).json({ success: false, message: 'Error al crear perfil de usuario' });
    }

    // 3. Crear el registro en students
    const { error: studentError } = await db.supabase.from('students').insert({
      id: userId,
      student_id_card: cedula,
      academic_year: academicYear || null,
      section: section || null,
      age: age || null,
      gender: gender || null,
      treatments_needed: treatments || []
    });

    if (studentError) {
      return res.status(500).json({ success: false, message: 'Perfil creado, pero hubo un error al guardar datos de estudiante' });
    }

    return res.status(200).json({ success: true, message: 'Registro exitoso' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

/**
 * Validar y registrar datos de paciente
 * @param {object} req - Request de Express
 * @param {object} res - Response de Express
 */
async function registerPatient(req, res) {
  const { 
    fullName, email, cedula, password, phone, 
    direccion, birthDate, gender, altContactName, 
    altContactPhone, medicalHistory, consultationReason, 
    descripcionProblema, intensidadDolor 
  } = req.body;

  if (!fullName || !email || !cedula || !password) {
    return res.status(400).json({ success: false, message: 'Todos los campos obligatorios deben ser completados' });
  }

  if (!nameRegex.test(fullName)) {
    return res.status(400).json({ success: false, message: 'El nombre solo debe contener letras, espacios, tildes y la letra ñ' });
  }

  if (!cedulaRegex.test(cedula)) {
    return res.status(400).json({ success: false, message: 'La cédula debe tener entre 6 y 10 dígitos y contener solo números' });
  }

  if (phone && !phoneRegex.test(phone)) {
    return res.status(400).json({ success: false, message: 'El teléfono debe tener exactamente 11 dígitos y contener solo números' });
  }

  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 8 caracteres' });
  }

  try {
    const { data: authData, error: authError } = await db.supabase.auth.admin.createUser({
      email: email.trim(),
      password: password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: 'patient' }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        return res.status(400).json({ success: false, message: 'El correo ya está en uso. Intente iniciar sesión o use otro correo.' });
      }
      return res.status(400).json({ success: false, message: authError.message });
    }

    const userId = authData.user.id;

    const { error: profileError } = await db.supabase.from('profiles').insert({
      id: userId,
      full_name: fullName,
      email: email.trim(),
      role: 'patient',
      disponibilidad: 'disponible',
      phone: phone || null,
      updated_at: new Date().toISOString()
    });

    if (profileError) {
      await db.supabase.auth.admin.deleteUser(userId);
      return res.status(500).json({ success: false, message: 'Error al crear perfil de usuario' });
    }

    const { error: patientError } = await db.supabase.from('patients').insert({
      id: userId,
      cedula: cedula,
      phone: phone || null,
      direccion: direccion || null,
      birth_date: birthDate || null,
      gender: gender || null,
      alt_contact_name: altContactName || null,
      alt_contact_phone: altContactPhone || null,
      medical_history: medicalHistory || null,
      consultation_reason: consultationReason || null,
      descripcion_problema: descripcionProblema || null,
      intensidad_dolor: intensidadDolor || null,
      accepts_requests: true
    });

    if (patientError) {
      return res.status(500).json({ success: false, message: 'Perfil creado, pero hubo un error al guardar datos de paciente' });
    }

    return res.status(200).json({ success: true, message: 'Registro exitoso' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

/**
 * Obtener perfil del usuario actual
 * @param {object} req - Request de Express
 * @param {object} res - Response de Express
 */
async function getProfile(req, res) {
  const { userId } = req.params;

  try {
    const profile = await UsersModel.getProfileById(userId);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Perfil no encontrado'
      });
    }

    let roleData = null;
    if (profile.role === 'student') {
      const { data } = await db.supabase.from('students').select('*').eq('user_id', userId).maybeSingle();
      if (!data) {
        const { data: fallbackData } = await db.supabase.from('students').select('*').eq('id', userId).maybeSingle();
        roleData = fallbackData;
      } else {
        roleData = data;
      }
    } else if (profile.role === 'patient') {
      const { data } = await db.supabase.from('patients').select('*').or(`user_id.eq.${userId},id.eq.${userId}`).maybeSingle();
      roleData = data;
    }

    return res.json({ success: true, data: { ...profile, roleData } });
  } catch (e) {
    console.error('Error en getProfile:', e);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

// Exportar controladores
module.exports = {
  registerStudent,
  registerPatient,
  getProfile,
  isValidAcademicYear
};
