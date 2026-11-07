const QueueEntry = require('../models/QueueEntry');
const Appointment = require('../models/Appointment');
const queueService = require('../services/queueService');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { isValidObjectId } = require('mongoose');

const walkInValidation = [
  body('patientName').trim().notEmpty().withMessage('Patient name is required').isLength({ max: 100 }),
  body('patientPhone')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^[+]?[\d\s\-().]{7,20}$/)
    .withMessage('Invalid phone number format'),
  validate,
];

const getQueue = async (req, res, next) => {
  try {
    const date = req.query.date || queueService.todayStr();
    const queue = await queueService.getOrderedQueue(date);
    res.json({ success: true, data: queue });
  } catch (err) {
    next(err);
  }
};

const getQueueEntry = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }
    const entry = await QueueEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ success: false, message: 'Queue entry not found' });
    res.json({ success: true, data: entry });
  } catch (err) {
    next(err);
  }
};

const registerWalkIn = async (req, res, next) => {
  try {
    const { patientName, patientPhone } = req.body;
    const clinicDate = queueService.todayStr();

    const queueNumber = await queueService.getNextQueueNumber(clinicDate);
    const accessCode = QueueEntry.generateAccessCode();
    const accessCodeHash = QueueEntry.hashAccessCode(accessCode);

    const entry = await QueueEntry.create({
      queueNumber,
      clinicDate,
      patientName,
      patientPhone: patientPhone || null,
      entryType: 'walk-in',
      accessCodeHash,
    });

    await queueService.recalculateAndSave(clinicDate);

    // Emit socket event
    const io = req.app.get('io');
    if (io) io.to('staff').emit('queue:updated', { date: clinicDate });

    res.status(201).json({
      success: true,
      message: 'Walk-in patient registered',
      data: { ...entry.toObject(), accessCode }, // Return plain code only at creation
    });
  } catch (err) {
    next(err);
  }
};

const checkInAppointment = async (req, res, next) => {
  try {
    const { appointmentId } = req.body;
    if (!isValidObjectId(appointmentId)) {
      return res.status(400).json({ success: false, message: 'Invalid appointment ID' });
    }

    const appt = await Appointment.findById(appointmentId);
    if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' });
    if (appt.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot check in a cancelled appointment' });
    }
    if (appt.queueEntryId) {
      return res.status(409).json({ success: false, message: 'Appointment already checked in' });
    }

    const clinicDate = queueService.todayStr();
    const queueNumber = await queueService.getNextQueueNumber(clinicDate);
    const accessCode = QueueEntry.generateAccessCode();
    const accessCodeHash = QueueEntry.hashAccessCode(accessCode);

    const entry = await QueueEntry.create({
      queueNumber,
      clinicDate,
      patientName: appt.patientName,
      patientPhone: appt.patientPhone,
      entryType: 'appointment',
      appointmentId: appt._id,
      scheduledTime: appt.appointmentTime,
      accessCodeHash,
    });

    appt.status = 'checked-in';
    appt.queueEntryId = entry._id;
    await appt.save();

    await queueService.recalculateAndSave(clinicDate);

    const io = req.app.get('io');
    if (io) io.to('staff').emit('queue:updated', { date: clinicDate });

    res.status(201).json({
      success: true,
      message: 'Appointment checked in',
      data: { ...entry.toObject(), accessCode },
    });
  } catch (err) {
    next(err);
  }
};

const callNext = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    const entry = await QueueEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ success: false, message: 'Queue entry not found' });
    if (entry.status !== 'waiting') {
      return res.status(400).json({ success: false, message: `Cannot call patient with status: ${entry.status}` });
    }

    const settings = await queueService.getSettings();
    const rooms = settings.consultationRooms || 1;

    const activeConsultations = await QueueEntry.countDocuments({
      clinicDate: entry.clinicDate,
      status: 'in-consultation',
    });

    if (activeConsultations >= rooms) {
      return res.status(409).json({
        success: false,
        message: `All ${rooms} consultation room(s) are currently occupied`,
      });
    }

    entry.status = 'in-consultation';
    entry.consultationStartTime = new Date();
    await entry.save();

    await queueService.recalculateAndSave(entry.clinicDate);

    const io = req.app.get('io');
    if (io) {
      io.to('staff').emit('queue:updated', { date: entry.clinicDate });
      io.to('public').emit('queue:updated', { date: entry.clinicDate });
    }

    res.json({ success: true, message: `Patient ${entry.patientName} called`, data: entry });
  } catch (err) {
    next(err);
  }
};

const completeConsultation = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    const entry = await QueueEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ success: false, message: 'Queue entry not found' });
    if (entry.status !== 'in-consultation') {
      return res.status(400).json({ success: false, message: 'Patient is not currently in consultation' });
    }

    entry.status = 'completed';
    entry.consultationEndTime = new Date();
    await entry.save();

    // Update appointment status if linked
    if (entry.appointmentId) {
      await Appointment.findByIdAndUpdate(entry.appointmentId, { status: 'completed' });
    }

    await queueService.recalculateAndSave(entry.clinicDate);

    const io = req.app.get('io');
    if (io) {
      io.to('staff').emit('queue:updated', { date: entry.clinicDate });
      io.to('public').emit('queue:updated', { date: entry.clinicDate });
    }

    res.json({ success: true, message: 'Consultation completed', data: entry });
  } catch (err) {
    next(err);
  }
};

const skipPatient = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    const entry = await QueueEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ success: false, message: 'Queue entry not found' });
    if (!queueService.isValidTransition(entry.status, 'skipped')) {
      return res.status(400).json({
        success: false,
        message: `Cannot skip patient with status: ${entry.status}`,
      });
    }

    entry.status = 'skipped';
    entry.skippedAt = new Date();
    await entry.save();

    await queueService.recalculateAndSave(entry.clinicDate);

    const io = req.app.get('io');
    if (io) {
      io.to('staff').emit('queue:updated', { date: entry.clinicDate });
      io.to('public').emit('queue:updated', { date: entry.clinicDate });
    }

    res.json({ success: true, message: 'Patient skipped', data: entry });
  } catch (err) {
    next(err);
  }
};

const returnToQueue = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    const entry = await QueueEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ success: false, message: 'Queue entry not found' });
    if (!queueService.isValidTransition(entry.status, 'waiting')) {
      return res.status(400).json({
        success: false,
        message: `Cannot return patient from status: ${entry.status}`,
      });
    }

    entry.status = 'waiting';
    entry.returnedFromSkip = true;
    entry.skippedAt = null;
    await entry.save();

    await queueService.recalculateAndSave(entry.clinicDate);

    const io = req.app.get('io');
    if (io) io.to('staff').emit('queue:updated', { date: entry.clinicDate });

    res.json({ success: true, message: 'Patient returned to queue', data: entry });
  } catch (err) {
    next(err);
  }
};

const cancelEntry = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    const entry = await QueueEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ success: false, message: 'Queue entry not found' });
    if (!queueService.isValidTransition(entry.status, 'cancelled')) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel patient with status: ${entry.status}`,
      });
    }

    entry.status = 'cancelled';
    await entry.save();

    await queueService.recalculateAndSave(entry.clinicDate);

    const io = req.app.get('io');
    if (io) io.to('staff').emit('queue:updated', { date: entry.clinicDate });

    res.json({ success: true, message: 'Queue entry cancelled', data: entry });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getQueue,
  getQueueEntry,
  registerWalkIn,
  checkInAppointment,
  callNext,
  completeConsultation,
  skipPatient,
  returnToQueue,
  cancelEntry,
  walkInValidation,
};
