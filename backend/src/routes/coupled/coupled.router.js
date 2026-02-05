import express from 'express';
import { getAllCoupled, getCoupledById, createCoupled, updateCoupled, deleteCoupled, getInactiveCoupled, reactivateCoupled } from '../../controllers/coupled/coupled.controllers.js';
import { upload } from '../../../files/cloudinary.js';
import { verifyToken } from '../../middlewares/login/auth.middlewares.js';
import { validateCoupledFiles, validateCreateCoupled, validateUpdateCoupled } from '../../middlewares/coupled/coupled.validator.js';

const router = express.Router();

const uploadFields = upload.fields([
    { name: 'url_cedula_acoplado', maxCount: 1 },
    { name: 'url_tipificacion_carga_acoplado', maxCount: 1 },
    { name: 'url_senasa_acoplado', maxCount: 1 },
    { name: 'url_titulo_acoplado', maxCount: 1 },
    { name: 'url_vtv_acoplado', maxCount: 1 },
    { name: 'url_homologacion_acoplado', maxCount: 1 }
]);

router.get('/', verifyToken, getAllCoupled);
router.get('/inactive', verifyToken, getInactiveCoupled);
router.post('/create', verifyToken, uploadFields, validateCoupledFiles(), validateCreateCoupled, createCoupled);
router.get('/:id', verifyToken, getCoupledById);
router.put('/update/:id', verifyToken, uploadFields, validateCoupledFiles(), validateUpdateCoupled, updateCoupled);
router.delete('/delete/:id', verifyToken, deleteCoupled);
router.put('/reactivate/:id', verifyToken, reactivateCoupled);
export default router;