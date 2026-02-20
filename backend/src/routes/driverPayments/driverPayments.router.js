import express from 'express';
import { verifyToken } from '../../middlewares/login/auth.middlewares.js';
import {
  addDriverPaymentAdjustment,
  deleteDriverPaymentAdjustment,
  getAllDriverPayments,
  upsertDriverPaymentConfig,
} from '../../controllers/driverPayments/driverPayments.controllers.js';

const router = express.Router();

router.get('/', verifyToken, getAllDriverPayments);
router.put('/:travelId/config', verifyToken, upsertDriverPaymentConfig);
router.post('/:travelId/adjustments', verifyToken, addDriverPaymentAdjustment);
router.delete('/adjustments/:id', verifyToken, deleteDriverPaymentAdjustment);

export default router;

