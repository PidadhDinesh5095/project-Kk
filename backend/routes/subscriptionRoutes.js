import express from 'express';
const router = express.Router();
import subscription from '../controllers/subscriptionController.js';
import validate from '../middleware/validate.middleware.js';
import schemas from '../utils/validation.js';
import __cjsModule583 from '../middleware/auth.middleware.js';
const { requireAuth } = __cjsModule583;

router.use(requireAuth);
router.post('/', validate(schemas.createSubscription), subscription.createSubscription);
router.get('/counts', subscription.getSubscriptionCounts);
router.get('/', subscription.listSubscriptions);
router.get('/:id', subscription.getSubscriptionById);
router.patch('/:id/pause', validate(schemas.pauseSubscription), subscription.pauseSubscription);
router.patch('/:id/resume', subscription.resumeSubscription);
router.patch('/:id/skip', validate(schemas.skipDates), subscription.skipDates);
router.delete('/:id', subscription.cancelSubscription);

export default router;
