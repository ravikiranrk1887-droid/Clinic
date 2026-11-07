const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  updateAppointmentStatus,
  appointmentValidation,
} = require('../controllers/appointmentController');

router.get('/', authenticate, getAppointments);
router.get('/:id', authenticate, getAppointmentById);
router.post('/', authenticate, appointmentValidation, createAppointment);
router.put('/:id', authenticate, appointmentValidation, updateAppointment);
router.patch('/:id/status', authenticate, updateAppointmentStatus);

module.exports = router;
