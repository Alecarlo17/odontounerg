/* =============================================
   ROUTES: REQUEST ROUTES
   Rutas de solicitudes
   ============================================= */

const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');

// Enviar solicitud
router.post('/', requestController.sendRequest);

// Obtener todas las solicitudes (admin)
router.get('/all', requestController.getAllRequests);

// Obtener solicitudes del estudiante
router.get('/student/:userId', requestController.getStudentRequests);

// Obtener solicitudes del paciente
router.get('/patient/:userId', requestController.getPatientRequests);

// Aceptar solicitud
router.put('/:id/accept', requestController.acceptRequest);

// Rechazar solicitud
router.put('/:id/reject', requestController.rejectRequest);

module.exports = router;
