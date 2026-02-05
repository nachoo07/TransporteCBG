import express from 'express';
import { getDrivers, getInactiveDrivers, getDriverById, createDriver, updateDriver, deleteDriver, reactivateDriver } from '../../controllers/drivers/drivers.controllers.js';
import { upload } from '../../../files/cloudinary.js';
import { verifyToken } from '../../middlewares/login/auth.middlewares.js';
import { validateCreateDriver, validateUpdateDriver } from '../../middlewares/driver/driver.validator.js';
import validateDriverFiles from '../../middlewares/driver/file.validator.js';

const router = express.Router();

// Definimos qué campos aceptan archivos
const uploadFields = upload.fields([
    { name: 'archivo_dni', maxCount: 1 },
    { name: 'archivo_licencia', maxCount: 1 },
    { name: 'archivo_psicofisico', maxCount: 1 },
    { name: 'archivo_curso_carga_normal', maxCount: 1 },
    { name: 'archivo_curso_carga_peligrosa', maxCount: 1 }
]);

router.get('/', verifyToken, getDrivers);
router.get('/inactive', verifyToken, getInactiveDrivers);
router.get('/:id', verifyToken, getDriverById);
// NOTE: multer `uploadFields` must run BEFORE validation so `req.body` is populated
router.post('/create', verifyToken, uploadFields, validateDriverFiles(), validateCreateDriver, createDriver);
router.put('/update/:id', verifyToken, uploadFields, validateDriverFiles(), validateUpdateDriver, updateDriver);
router.delete('/delete/:id', verifyToken, deleteDriver);
router.put('/reactivate/:id', verifyToken, reactivateDriver);
export default router;