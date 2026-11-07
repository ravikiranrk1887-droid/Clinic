const { body } = require('express-validator');
const ClinicSettings = require('../models/ClinicSettings');
const queueService = require('../services/queueService');
const { validate } = require('../middleware/validate');

const settingsValidation = [
  body('clinicName').optional().trim().notEmpty().isLength({ max: 100 }),
  body('averageServiceDurationMinutes').optional().isInt({ min: 1, max: 120 }),
  body('queuePolicy').optional().isIn(['appointment-first', 'walk-in-first', 'fifo', 'mixed']),
  body('consultationRooms').optional().isInt({ min: 1, max: 10 }),
  body('maxDisplayWaitingMinutes').optional().isInt({ min: 10, max: 480 }),
  body('openingHours.open').optional().matches(/^([01]\d|2[0-3]):[0-5]\d$/),
  body('openingHours.close').optional().matches(/^([01]\d|2[0-3]):[0-5]\d$/),
  validate,
];

const getSettings = async (req, res, next) => {
  try {
    const settings = await queueService.getSettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    const settings = await queueService.getSettings();
    const allowed = ['clinicName', 'averageServiceDurationMinutes', 'openingHours', 'queuePolicy', 'consultationRooms', 'maxDisplayWaitingMinutes'];
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) settings[key] = req.body[key];
    });
    await settings.save();

    // Recalculate waiting times with new settings
    const today = queueService.todayStr();
    await queueService.recalculateAndSave(today);

    const io = req.app.get('io');
    if (io) {
      io.to('staff').emit('queue:updated', { date: today });
      io.to('public').emit('queue:updated', { date: today });
    }

    res.json({ success: true, message: 'Settings updated', data: settings });
  } catch (err) {
    next(err);
  }
};

module.exports = { getSettings, updateSettings, settingsValidation };
