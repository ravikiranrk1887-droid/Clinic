const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { getPatientStatus, getQueueOverview } = require('../controllers/patientStatusController');

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/overview', publicLimiter, getQueueOverview);
router.get('/:queueNumber', publicLimiter, getPatientStatus);

module.exports = router;
