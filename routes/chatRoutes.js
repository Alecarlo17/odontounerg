/* =============================================
   ROUTES: CHAT ROUTES
   Rutas del chat en tiempo real
   ============================================= */

const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// Obtener conversaciones del usuario
router.get('/conversations/:userId', chatController.getConversations);

// Obtener mensajes de una conversación
router.get('/messages/:conversationId', chatController.getMessages);

// Enviar mensaje
router.post('/messages', chatController.sendMessage);

// Reportar usuario
router.post('/report', chatController.reportUser);

// Obtener todos los reportes (admin)
router.get('/reports', chatController.getAllReports);

module.exports = router;
