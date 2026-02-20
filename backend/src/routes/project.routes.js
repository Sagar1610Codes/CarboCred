/**
 * routes/project.routes.js — Project management routes.
 * RULES: Thin routes, validation before controller, role-based access.
 */

import { Router } from 'express';

import * as projectController from '../controllers/project.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';
import validate from '../middleware/validate.middleware.js';
import {
    createProjectSchema,
    updateProjectStatusSchema,
    listProjectsQuerySchema,
} from '../validators/project.validator.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

// All project routes require authentication
router.use(authenticate);

// Any authenticated user can list/view projects
router.get('/', validate(listProjectsQuerySchema, 'query'), projectController.listProjects);
router.get('/:id', projectController.getProject);

// Only authenticated users (USER role) can submit projects
router.post('/', validate(createProjectSchema), projectController.createProject);

// Only VERIFIER or ADMIN can update project status
router.patch(
    '/:id/status',
    authorize(ROLES.VERIFIER, ROLES.ADMIN),
    validate(updateProjectStatusSchema),
    projectController.updateProjectStatus,
);

export default router;
