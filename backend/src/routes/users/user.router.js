import express from 'express';
import { getUsers, createUser, updateUser, deleteUser, getProfile } from '../../controllers/users/user.controllers.js';
import { validateCreateUser, validateUpdateUser } from '../../middlewares/user/user.validator.js';
import { verifyToken } from '../../middlewares/login/auth.middlewares.js';

const router = express.Router();


router.get('/', verifyToken, getUsers);
router.get('/perfil', verifyToken, getProfile);
router.post('/create', verifyToken, validateCreateUser, createUser);
router.put('/update/:id', verifyToken, validateUpdateUser, updateUser);
router.delete('/delete/:id', verifyToken, deleteUser);


export default router;