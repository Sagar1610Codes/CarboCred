/**
 * routes/portfolio.routes.js — Portfolio and credit transfer routes.
 * RULES: All routes authenticated. Balance always from chain.
 */

import { Router } from 'express';

import * as portfolioController from '../controllers/portfolio.controller.js';
import authenticate from '../middleware/auth.middleware.js';


const router = Router();

router.use(authenticate);

// Live portfolio from blockchain
router.get('/', portfolioController.getMyPortfolio);
router.get('/transactions', portfolioController.getTransactionHistory);
router.get('/supply/:projectId', portfolioController.getProjectSupply);

export default router;
