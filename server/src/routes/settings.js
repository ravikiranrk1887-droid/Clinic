const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getSettings, updateSettings, settingsValidation } = require('../controllers/settingsController');

router.get('/', authenticate, getSettings);
router.put('/', authenticate, requireAdmin, settingsValidation, updateSettings);

module.exports = router;
