const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { login, loginValidation, createStaff, getMe, changePassword } = require('../controllers/authController');
const { authenticate, requireAdmin } = require('../middleware/auth');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX) || 10,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, loginValidation, login);
router.get('/me', authenticate, getMe);
router.post('/change-password', authenticate, changePassword);
router.post('/create-staff', authenticate, requireAdmin, createStaff);

module.exports = router;
