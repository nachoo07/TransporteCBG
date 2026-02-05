import express from 'express';
import {
  getActiveAssignments,
  createAssignment,
  finishAssignment
} from '../../controllers/assignment/assignments.controller.js';
import { verifyToken } from '../../middlewares/login/auth.middlewares.js';
import { validateCreateAssignment, validateFinishAssignment } from '../../middlewares/assignment/assignment.validator.js';

const router = express.Router();

router.get('/', verifyToken, getActiveAssignments);
router.post('/create', verifyToken, validateCreateAssignment, createAssignment);
router.put('/finish/:id', verifyToken, validateFinishAssignment, finishAssignment);

export default router;