/* =============================================
   ROUTES: AUTH ROUTES
   Rutas de autenticación
   ============================================= */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Validar registro de estudiante
router.post('/validate-student', authController.validateStudentRegistration);

// Validar registro de paciente
router.post('/validate-patient', authController.validatePatientRegistration);

// Obtener perfil de usuario
router.get('/profile/:userId', authController.getProfile);

module.exports = router;
