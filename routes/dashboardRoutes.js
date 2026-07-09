const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const isAuthenticated = require('../middleware/auth');

router.use(isAuthenticated);

router.get('/', dashboardController.dashboard);

module.exports = router;
