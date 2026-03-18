import express from 'express';
import {
  createChassis,
  getChassisById,
  updateChassis,
  deleteChassis,
  getAllChassis,
  getInactiveChassis,
  reactivateChassis,
  registerChassisService,
} from '../../controllers/chassis/chassis.controllers.js';
import { upload } from '../../../files/cloudinary.js';
import { verifyToken } from '../../middlewares/login/auth.middlewares.js';
import { validateChassisFiles, validateCreateChassis, validateUpdateChassis } from '../../middlewares/chassis/chassis.validator.js';

const router = express.Router();

const uploadFields = upload.fields([
    { name: 'url_cedula_chasis', maxCount: 1 },
    { name: 'url_tipificacion_carga_chasis', maxCount: 1 },
    { name: 'url_senasa_chasis', maxCount: 1 },
    { name: 'url_titulo_chasis', maxCount: 1 },
    { name: 'url_vtv_chasis', maxCount: 1 },
    { name: 'url_homologacion_chasis', maxCount: 1 }
]);

router.get('/', verifyToken, getAllChassis);
router.get('/inactive', verifyToken, getInactiveChassis);
router.post('/create', verifyToken, uploadFields, validateChassisFiles(), validateCreateChassis, createChassis);
router.get('/:id', verifyToken, getChassisById);
router.put('/update/:id', verifyToken, uploadFields, validateChassisFiles(), validateUpdateChassis, updateChassis);
router.put('/service/:id', verifyToken, registerChassisService);
router.delete('/delete/:id', verifyToken, deleteChassis);
router.put('/reactivate/:id', verifyToken, reactivateChassis);
export default router;
