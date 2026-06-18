/* =============================================
   ROUTES: AUTH ROUTES
   Rutas de autenticación
   ============================================= */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Registrar estudiante
router.post('/register-student', authController.registerStudent);

// Registrar paciente
router.post('/register-patient', authController.registerPatient);

// Obtener perfil de usuario
router.get('/profile/:userId', authController.getProfile);

module.exports = router;
