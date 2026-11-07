const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const Staff = require('../models/Staff');
const { validate } = require('../middleware/validate');

const loginValidation = [
  body('username').trim().notEmpty().withMessage('Username is required').toLowerCase(),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
];

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const staff = await Staff.findOne({ username: username.toLowerCase() });
    if (!staff) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (staff.isLocked) {
      const minutesLeft = Math.ceil((staff.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account temporarily locked. Try again in ${minutesLeft} minute(s).`,
      });
    }

    if (!staff.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated' });
    }

    const isMatch = await staff.comparePassword(password);
    if (!isMatch) {
      await staff.incLoginAttempts();
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Reset login attempts on success
    await staff.updateOne({ $set: { loginAttempts: 0, lastLogin: new Date() }, $unset: { lockUntil: 1 } });

    const token = jwt.sign(
      { id: staff._id, username: staff.username, role: staff.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        staff: {
          id: staff._id,
          username: staff.username,
          displayName: staff.displayName,
          role: staff.role,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

const createStaff = async (req, res, next) => {
  try {
    const { username, password, displayName, role } = req.body;

    const existing = await Staff.findOne({ username: username.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Username already exists' });
    }

    const passwordHash = await Staff.hashPassword(password);
    const staff = await Staff.create({
      username: username.toLowerCase(),
      passwordHash,
      displayName,
      role: role || 'staff',
    });

    res.status(201).json({ success: true, message: 'Staff account created', data: staff });
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res) => {
  res.json({ success: true, data: req.staff });
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const staff = await Staff.findById(req.staff._id);

    const isMatch = await staff.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
    }

    staff.passwordHash = await Staff.hashPassword(newPassword);
    await staff.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, loginValidation, createStaff, getMe, changePassword };
