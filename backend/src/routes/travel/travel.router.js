import express from 'express';
import {
  createTravel,
  getAllTravels,
  getTravelById,
  updateTravel,
  bulkDocsUpdate,
  deleteTravel,
  cancelTravel,
  restoreCanceledTravel
} from '../../controllers/travel/travel.controllers.js';
import { upload } from '../../../files/cloudinary.js';
import { verifyToken } from '../../middlewares/login/auth.middlewares.js';
import { validateBulkDocs, validateCreateTravel, validateUpdateTravel } from '../../middlewares/travel/travel.validator.js';
import { validateTravelFiles } from '../../middlewares/travel/travel.file.validator.js';

const router = express.Router();

// Define upload fields for travel documents
const uploadFields = upload.fields([
  { name: 'invoice_photo', maxCount: 1 },
  { name: 'archivo_factura_liquidado', maxCount: 1 },
  { name: 'foto_km_inicio', maxCount: 1 },
  { name: 'foto_km_fin', maxCount: 1 },
  { name: 'foto_factura_combustible', maxCount: 1 },
]);

router.get('/', verifyToken, getAllTravels);
router.get('/:id', verifyToken, getTravelById);

router.put('/cancel/:id', verifyToken, cancelTravel);
router.put('/restore/:id', verifyToken, restoreCanceledTravel);

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

router.put(
  '/bulk-docs',
  verifyToken,
  uploadFields,
  validateTravelFiles(),
  validateBulkDocs,
  bulkDocsUpdate
);

/**
 * DELETE /travels/:id
 * Delete travel record
 */
router.delete('/delete/:id', verifyToken, deleteTravel);

export default router;
