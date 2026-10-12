import express from 'express';
const router = express.Router();
import profile from '../controllers/profileController.js';
import validate from '../middleware/validate.middleware.js';
import schemas from '../utils/validation.js';
import __cjsModule582 from '../middleware/auth.middleware.js';
const { requireAuth } = __cjsModule582;

router.use(requireAuth);
router.post('/complete', validate(schemas.completeProfile), profile.completeProfile);
router.get('/me', profile.getMe);
router.patch('/me', validate(schemas.updateProfile), profile.updateProfile);
router.get('/pause-dates', profile.getPauseDates);
router.patch('/pause-dates', validate(schemas.pauseDates), profile.updatePauseDates);

export default router;
