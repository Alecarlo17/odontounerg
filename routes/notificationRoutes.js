/* =============================================
   ROUTES: NOTIFICATIONS ROUTES
   ============================================= */

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

router.get('/:userId', notificationController.loadNotifications);
router.get('/:userId/count', notificationController.countUnread);
router.put('/:id/read', notificationController.markRead);
router.put('/:userId/read-all', notificationController.markAllRead);
router.post('/', notificationController.createNotification);

module.exports = router;
