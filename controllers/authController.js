/* =============================================
   CONTROLLER: AUTH CONTROLLER
   Controlador de autenticación
   
   Maneja la lógica de login, registro,
   verificación de sesión y logout.
   ============================================= */

const UsersModel = require('../models/users');

/**
 * Validar año académico permitido
 * Solo se permiten estudiantes de 3er, 4to y 5to año
 * @param {string} academicYear - Año académico seleccionado
 * @returns {boolean} True si el año es válido
 */
function isValidAcademicYear(academicYear) {
  const allowedYears = ['3er año', '4to año', '5to año'];
  return allowedYears.includes(academicYear);
}

/**
 * Validar datos de registro de estudiante
 * @param {object} req - Request de Express
 * @param {object} res - Response de Express
 */
async function validateStudentRegistration(req, res) {
  const { fullName, email, cedula, academicYear, password } = req.body;

  // Validar campos obligatorios
  if (!fullName || !email || !cedula || !password) {
    return res.status(400).json({
      success: false,
      message: 'Todos los campos obligatorios deben ser completados'
    });
  }

  // Validar año académico
  if (academicYear && !isValidAcademicYear(academicYear)) {
    return res.status(400).json({
      success: false,
      message: 'Solo se permiten estudiantes de 3er, 4to o 5to año'
    });
  }

  // Validar cédula (7-8 dígitos)
  if (!/^\d{7,8}$/.test(cedula)) {
    return res.status(400).json({
      success: false,
      message: 'La cédula debe tener entre 7 y 8 dígitos'
    });
  }

  // Validar contraseña (mínimo 6 caracteres)
  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'La contraseña debe tener al menos 6 caracteres'
    });
  }

  return res.status(200).json({ success: true, message: 'Datos válidos' });
}

/**
 * Validar datos de registro de paciente
 * @param {object} req - Request de Express
 * @param {object} res - Response de Express
 */
async function validatePatientRegistration(req, res) {
  const { fullName, email, cedula, password } = req.body;

  if (!fullName || !email || !cedula || !password) {
    return res.status(400).json({
      success: false,
      message: 'Todos los campos obligatorios deben ser completados'
    });
  }

  if (!/^\d{7,8}$/.test(cedula)) {
    return res.status(400).json({
      success: false,
      message: 'La cédula debe tener entre 7 y 8 dígitos'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'La contraseña debe tener al menos 6 caracteres'
    });
  }

  return res.status(200).json({ success: true, message: 'Datos válidos' });
}

/**
 * Obtener perfil del usuario actual
 * @param {object} req - Request de Express
 * @param {object} res - Response de Express
 */
async function getProfile(req, res) {
  const { userId } = req.params;
  const db = require('../config/database');

  const profile = await UsersModel.getProfileById(userId);
  if (!profile) {
    return res.status(404).json({
      success: false,
      message: 'Perfil no encontrado'
    });
  }

  let roleData = null;
  if (profile.role === 'student') {
    roleData = await db.getSQLite('SELECT * FROM students WHERE user_id = ?', [userId]);
  } else if (profile.role === 'patient') {
    roleData = await db.getSQLite('SELECT * FROM patients WHERE user_id = ?', [userId]);
  }

  return res.json({ success: true, data: { ...profile, roleData } });
}

/**
 * Login Offline (usando SQLite)
 */
async function loginOffline(req, res) {
  const { email, password } = req.body;
  const db = require('../config/database');
  
  try {
    const user = await db.getSQLite('SELECT * FROM profiles WHERE LOWER(email) = LOWER(?)', [email]);
    if (user) {
      // In a real app we would check password_hash. For offline fallback, we allow if user exists locally
      // This is a simplified offline auth for the defense.
      return res.json({ success: true, user: { id: user.id, role: user.role, email: user.email, full_name: user.full_name } });
    }
    return res.status(401).json({ success: false, message: 'Usuario no encontrado en modo offline' });
  } catch(e) {
    return res.status(500).json({ success: false, message: 'Error de BD local' });
  }
}

/**
 * Sincronizar perfil para modo offline
 */
async function syncProfileOffline(req, res) {
  const { id, email, full_name, role, phone, disponibilidad } = req.body;
  const db = require('../config/database');
  try {
    const updated_at = new Date().toISOString();
    
    // Check if user exists
    const existing = await db.getSQLite('SELECT * FROM profiles WHERE id = ?', [id]);
    if (existing) {
      await db.runSQLite(
        'UPDATE profiles SET full_name = ?, email = ?, role = ?, phone = ?, disponibilidad = ?, updated_at = ? WHERE id = ?',
        [full_name, email, role, phone, disponibilidad, updated_at, id]
      );
    } else {
      await db.runSQLite(
        'INSERT INTO profiles (id, full_name, email, role, phone, disponibilidad, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, full_name, email, role, phone, disponibilidad, updated_at, updated_at]
      );
    }
    return res.json({ success: true, message: 'Perfil sincronizado localmente' });
  } catch(e) {
    console.error('Error syncing profile offline:', e);
    return res.status(500).json({ success: false, message: 'Error al sincronizar' });
  }
}

/**
 * Registro Offline (usando SQLite)
 */
async function registerOffline(req, res) {
  const { id: providedId, fullName, email, password, role, cedula, academicYear, section, treatments, age, phone, direccion, medical_history, consultation_reason, gender } = req.body;
  const db = require('../config/database');
  try {
    // Verificar si el email ya existe
    const existing = await db.getSQLite('SELECT * FROM profiles WHERE LOWER(email) = LOWER(?)', [email]);
    if (existing) {
      return res.status(400).json({ success: false, message: 'El correo electrónico ya está registrado' });
    }

    const id = providedId || Date.now().toString(); // Usar ID provisto (ej. de Supabase) o generar uno
    const created_at = new Date().toISOString();

    // 1. Insertar perfil
    await db.runSQLite(
      'INSERT INTO profiles (id, full_name, email, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, fullName, email, role, created_at, created_at]
    );

    // 2. Si es estudiante, insertar datos
    if (role === 'student') {
      await db.runSQLite(
        'INSERT INTO students (id, user_id, academic_year, section, student_id_card, treatments_needed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, id, academicYear || null, section || null, cedula, JSON.stringify(treatments || []), created_at]
      );
    } else if (role === 'patient') {
      await db.runSQLite(
        'INSERT INTO patients (id, user_id, full_name, dni, phone, address, age, gender, medical_history, consultation_reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, id, fullName, cedula, phone || null, direccion || null, age || null, gender || null, medical_history || null, consultation_reason || null, created_at]
      );
    }

    return res.json({ success: true, message: 'Registro exitoso en modo local', user: { id, email, full_name: fullName, role } });
  } catch(e) {
    console.error('Error en registerOffline:', e);
    return res.status(500).json({ success: false, message: 'Error al registrar en BD local' });
  }
}

// Exportar controladores
module.exports = {
  validateStudentRegistration,
  validatePatientRegistration,
  getProfile,
  isValidAcademicYear,
  loginOffline,
  syncProfileOffline,
  registerOffline
};
