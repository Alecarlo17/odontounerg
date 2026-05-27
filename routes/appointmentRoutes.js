/* =============================================
   ROUTES: APPOINTMENT ROUTES
   Rutas de citas odontológicas
   ============================================= */

const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');

// Crear nueva cita
router.post('/', appointmentController.createAppointment);

// Obtener todas las citas (admin)
router.get('/all', appointmentController.getAllAppointments);

// Obtener citas del usuario
router.get('/user/:userId', appointmentController.getUserAppointments);

// Confirmar cita
router.put('/:id/confirm', appointmentController.confirmAppointment);

// Cancelar cita
router.put('/:id/cancel', appointmentController.cancelAppointment);

// Finalizar cita
router.put('/:id/complete', appointmentController.completeAppointment);

module.exports = router;
