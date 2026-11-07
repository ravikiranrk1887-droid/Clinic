const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getHistory } = require('../controllers/historyController');

router.get('/', authenticate, getHistory);

module.exports = router;
