import express from 'express';
import { getAllCompanies, getCompanyById, createCompany, updateCompany, deleteCompany } from '../../controllers/company/company.controllers.js';
import { verifyToken } from '../../middlewares/login/auth.middlewares.js';
import { validateCreateCompany, validateUpdateCompany } from '../../middlewares/company/company.validator.js';

const router = express.Router();

/**
 * GET /company - Obtener todas las empresas
 */
router.get('/', verifyToken, getAllCompanies);

/**
 * GET /company/:id - Obtener empresa por ID
 */
router.get('/:id', verifyToken, getCompanyById);

/**
 * POST /company - Crear nueva empresa
 */
router.post('/create', verifyToken, validateCreateCompany, createCompany);

/**
 * PATCH /company/:id - Actualizar empresa
 */
router.put('/update/:id', verifyToken, validateUpdateCompany, updateCompany);

/**
 * DELETE /company/:id - Eliminar empresa
 */
router.delete('/:id', verifyToken, deleteCompany);

export default router;