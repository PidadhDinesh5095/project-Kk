import express from 'express';
const router = express.Router();
import notification from '../controllers/notificationController.js';
import validate from '../middleware/validate.middleware.js';
import schemas from '../utils/validation.js';
import __cjsModule578 from '../middleware/auth.middleware.js';
const { requireAuth } = __cjsModule578;

router.use(requireAuth);
router.get('/', notification.listNotifications);
router.patch('/mark-all-read', notification.markAllAsRead);
router.delete('/', notification.clearNotifications);
router.patch('/:id/read', notification.markAsRead);
router.post('/device-token', validate(schemas.deviceToken), notification.registerDeviceToken);

export default router;
