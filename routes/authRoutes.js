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

// Login (Soporte Offline)
router.post('/login', authController.loginOffline);

// Registro Offline
router.post('/register-offline', authController.registerOffline);

// Obtener perfil de usuario
router.get('/profile/:userId', authController.getProfile);

// Sincronizar perfil para offline
router.post('/sync', authController.syncProfileOffline);

module.exports = router;
