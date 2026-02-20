/**
 * routes/analytics.routes.js — Analytics route definitions.
 * RULES: Thin routes. Admin-level or public read for transparency data.
 */

import { Router } from 'express';

import * as analyticsController from '../controllers/analytics.controller.js';

const router = Router();

// Platform analytics — public for transparency
router.get('/summary', analyticsController.getPlatformSummary);
router.get('/trend', analyticsController.getCreditIssuanceTrend);
router.get('/top-projects', analyticsController.getTopProjects);
router.get('/retirements', analyticsController.getRetirementAnalytics);

export default router;
