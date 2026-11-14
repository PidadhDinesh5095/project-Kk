import express from 'express';
const router = express.Router();
import address from '../controllers/addressController.js';
import validate from '../middleware/validate.middleware.js';
import schemas from '../utils/validation.js';
import __cjsModule574 from '../middleware/auth.middleware.js';
const { requireAuth } = __cjsModule574;

router.use(requireAuth);
router.post('/', validate(schemas.createAddress), address.createAddress);
router.get('/', address.listAddresses);
router.patch('/:id', validate(schemas.updateAddress), address.updateAddress);
router.delete('/:id', address.deleteAddress);
router.patch('/:id/set-default', address.setDefaultAddress);

export default router;
