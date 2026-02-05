import express from 'express';
import {
  createTravel,
  getAllTravels,
  getTravelById,
  updateTravel,
  deleteTravel
} from '../../controllers/travel/travel.controllers.js';
import { upload } from '../../../files/cloudinary.js';
import { verifyToken } from '../../middlewares/login/auth.middlewares.js';
import { validateCreateTravel, validateUpdateTravel } from '../../middlewares/travel/travel.validator.js';
import { validateTravelFiles } from '../../middlewares/travel/travel.file.validator.js';

const router = express.Router();

// Define upload fields for travel documents
const uploadFields = upload.fields([
  { name: 'invoice_photo', maxCount: 1 }
]);

router.get('/', verifyToken, getAllTravels);
router.get('/:id', verifyToken, getTravelById);


router.post(
  '/create',
  verifyToken,
  uploadFields,
  validateTravelFiles(),
  validateCreateTravel,
  createTravel
);
router.put(
  '/update/:id',
  verifyToken,
  uploadFields,
  validateTravelFiles(),
  validateUpdateTravel,
  updateTravel
);

/**
 * DELETE /travels/:id
 * Delete travel record
 */
router.delete('/delete/:id', verifyToken, deleteTravel);

export default router;
