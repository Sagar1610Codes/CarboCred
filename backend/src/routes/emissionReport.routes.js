/**
 * routes/emissionReport.routes.js — Emission report routes.
 * RULES: Thin routes, validation before controller, role-based access for verification.
 */

import { Router } from 'express';

import * as reportController from '../controllers/emissionReport.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';
import validate from '../middleware/validate.middleware.js';
import { submitReportSchema, verifyReportSchema } from '../validators/report.validator.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

router.use(authenticate);

// Any authenticated user can submit reports and view them
router.post('/', validate(submitReportSchema), reportController.submitReport);
router.get('/', reportController.listReports);

// Only VERIFIER or ADMIN can approve/reject reports
// 🚨 This is the gateway that leads to on-chain minting
router.patch(
    '/:id/verify',
    authorize(ROLES.VERIFIER, ROLES.ADMIN),
    validate(verifyReportSchema),
    reportController.verifyReport,
);

export default router;
