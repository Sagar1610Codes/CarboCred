/**
 * backend/src/routes/entityProfile.routes.js
 *
 * Routes for business identity profiles.
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/entityProfile.controller');

// GET /entity/profiles  (all registered businesses — for Government Authority)
router.get('/profiles', controller.listProfiles);

// GET /entity/profile/:accountId
router.get('/profile/:accountId', controller.getProfile);

// POST /entity/profile
router.post('/profile', controller.upsertProfile);

module.exports = router;
