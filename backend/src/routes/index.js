/**
 * routes/index.js — Central router: mounts all sub-routers.
 * RULES: Thin. No middleware here. No logic.
 */

import { Router } from 'express';

import authRoutes from './auth.routes.js';
import projectRoutes from './project.routes.js';
import emissionReportRoutes from './emissionReport.routes.js';
import portfolioRoutes from './portfolio.routes.js';
import analyticsRoutes from './analytics.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/reports', emissionReportRoutes);
router.use('/portfolio', portfolioRoutes);
router.use('/analytics', analyticsRoutes);

export default router;
