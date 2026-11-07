const { body, param, query } = require('express-validator');
const Appointment = require('../models/Appointment');
const QueueEntry = require('../models/QueueEntry');
const { validate } = require('../middleware/validate');
const { isValidObjectId } = require('mongoose');

const appointmentValidation = [
  body('patientName').trim().notEmpty().withMessage('Patient name is required').isLength({ max: 100 }),
  body('patientPhone')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^[+]?[\d\s\-().]{7,20}$/)
    .withMessage('Invalid phone number format'),
  body('appointmentDate')
    .notEmpty().withMessage('Appointment date is required')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Date must be in YYYY-MM-DD format'),
  body('appointmentTime')
    .notEmpty().withMessage('Appointment time is required')
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
    .withMessage('Time must be in HH:mm format'),
  body('notes').optional({ nullable: true, checkFalsy: true }).isLength({ max: 500 }),
  validate,
];

const getAppointments = async (req, res, next) => {
  try {
    const { date, status, search, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (date) filter.appointmentDate = date;
    if (status) filter.status = status;
    if (search) filter.patientName = { $regex: search, $options: 'i' };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [appointments, total] = await Promise.all([
      Appointment.find(filter)
        .sort({ appointmentDate: 1, appointmentTime: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Appointment.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: appointments,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

const getAppointmentById = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid appointment ID' });
    }
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' });
    res.json({ success: true, data: appt });
  } catch (err) {
    next(err);
  }
};

const createAppointment = async (req, res, next) => {
  try {
    const { patientName, patientPhone, appointmentDate, appointmentTime, notes } = req.body;

    // Validate date is not in the past
    const apptDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
    if (apptDateTime < new Date(Date.now() - 60000)) {
      return res.status(400).json({ success: false, message: 'Appointment date/time cannot be in the past' });
    }

    const appointment = await Appointment.create({
      patientName,
      patientPhone: patientPhone || null,
      appointmentDate,
      appointmentTime,
      notes: notes || null,
    });

    res.status(201).json({ success: true, message: 'Appointment created', data: appointment });
  } catch (err) {
    next(err);
  }
};

const updateAppointment = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid appointment ID' });
    }
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' });
    if (appt.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot edit a cancelled appointment' });
    }

    const { patientName, patientPhone, appointmentDate, appointmentTime, notes } = req.body;
    Object.assign(appt, {
      patientName: patientName || appt.patientName,
      patientPhone: patientPhone !== undefined ? patientPhone || null : appt.patientPhone,
      appointmentDate: appointmentDate || appt.appointmentDate,
      appointmentTime: appointmentTime || appt.appointmentTime,
      notes: notes !== undefined ? notes || null : appt.notes,
    });
    await appt.save();

    res.json({ success: true, message: 'Appointment updated', data: appt });
  } catch (err) {
    next(err);
  }
};

const updateAppointmentStatus = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid appointment ID' });
    }
    const { status } = req.body;
    const validStatuses = ['scheduled', 'checked-in', 'completed', 'cancelled', 'no-show'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const appt = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' });

    res.json({ success: true, message: 'Appointment status updated', data: appt });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  updateAppointmentStatus,
  appointmentValidation,
};
