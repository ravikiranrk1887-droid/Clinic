const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
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
} = require('../controllers/queueController');

router.get('/', authenticate, getQueue);
router.get('/:id', authenticate, getQueueEntry);
router.post('/walk-in', authenticate, walkInValidation, registerWalkIn);
router.post('/check-in', authenticate, checkInAppointment);
router.post('/:id/call', authenticate, callNext);
router.post('/:id/complete', authenticate, completeConsultation);
router.post('/:id/skip', authenticate, skipPatient);
router.post('/:id/return', authenticate, returnToQueue);
router.post('/:id/cancel', authenticate, cancelEntry);

module.exports = router;
