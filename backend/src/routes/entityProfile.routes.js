/**
 * backend/src/routes/entityProfile.routes.js
 *
 * Routes for business identity profiles.
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/entityProfile.controller');

// GET /entity/profile/:accountId
router.get('/profile/:accountId', controller.getProfile);

// POST /entity/profile
router.post('/profile', controller.upsertProfile);

module.exports = router;
