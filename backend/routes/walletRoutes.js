import express from 'express';
const router = express.Router();
import wallet from '../controllers/walletController.js';
import validate from '../middleware/validate.middleware.js';
import schemas from '../utils/validation.js';
import __cjsModule584 from '../middleware/auth.middleware.js';
const { requireAuth } = __cjsModule584;

router.use(requireAuth);
router.get('/', wallet.getWallet);
router.post('/topup', validate(schemas.topup), wallet.initiateTopup);
router.post('/topup/verify', validate(schemas.verifyTopup), wallet.verifyTopup);
router.post('/withdraw', validate(schemas.withdraw), wallet.withdraw);
router.get('/transactions', wallet.getTransactions);

export default router;
