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

  const profile = await UsersModel.getProfileById(userId);
  if (!profile) {
    return res.status(404).json({
      success: false,
      message: 'Perfil no encontrado'
    });
  }

  return res.json({ success: true, data: profile });
}

// Exportar controladores
module.exports = {
  validateStudentRegistration,
  validatePatientRegistration,
  getProfile,
  isValidAcademicYear
};
