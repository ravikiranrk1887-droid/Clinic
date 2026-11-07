const QueueEntry = require('../models/QueueEntry');
const ClinicSettings = require('../models/ClinicSettings');
const Appointment = require('../models/Appointment');

/**
 * Get or create clinic settings
 */
const getSettings = async () => {
  let settings = await ClinicSettings.findOne();
  if (!settings) {
    settings = await ClinicSettings.create({});
  }
  return settings;
};

/**
 * Get today's date string YYYY-MM-DD
 */
const todayStr = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

/**
 * Generate the next available queue number for a clinic date.
 * Uses findOneAndUpdate with atomic increment pattern.
 */
const getNextQueueNumber = async (clinicDate) => {
  // Find the highest existing queue number for this date
  const last = await QueueEntry.findOne({ clinicDate }).sort({ queueNumber: -1 }).select('queueNumber');
  return last ? last.queueNumber + 1 : 1;
};

/**
 * Sort waiting queue entries according to policy
 */
const sortQueueByPolicy = (entries, policy) => {
  return entries.sort((a, b) => {
    if (policy === 'appointment-first') {
      if (a.entryType === 'appointment' && b.entryType !== 'appointment') return -1;
      if (b.entryType === 'appointment' && a.entryType !== 'appointment') return 1;
    } else if (policy === 'walk-in-first') {
      if (a.entryType === 'walk-in' && b.entryType !== 'walk-in') return -1;
      if (b.entryType === 'walk-in' && a.entryType !== 'walk-in') return 1;
    }
    // Mixed/FIFO: appointments sorted by scheduled time, walk-ins by registration
    const aTime = a.scheduledTime
      ? new Date(`${a.clinicDate}T${a.scheduledTime}`)
      : a.registrationTime;
    const bTime = b.scheduledTime
      ? new Date(`${b.clinicDate}T${b.scheduledTime}`)
      : b.registrationTime;
    return aTime - bTime;
  });
};

/**
 * Calculate estimated waiting times for all waiting queue entries.
 * Returns array of { entryId, estimatedWaitingMinutes }
 */
const calculateWaitingTimes = async (clinicDate) => {
  const settings = await getSettings();
  const avgDuration = settings.averageServiceDurationMinutes;
  const rooms = settings.consultationRooms || 1;
  const policy = settings.queuePolicy;

  const inConsultation = await QueueEntry.find({
    clinicDate,
    status: 'in-consultation',
  }).sort({ consultationStartTime: 1 });

  const waiting = await QueueEntry.find({
    clinicDate,
    status: 'waiting',
  });

  const sortedWaiting = sortQueueByPolicy(waiting, policy);

  // Calculate remaining times for active consultations
  const now = Date.now();
  const roomRemainingTimes = [];

  for (let i = 0; i < rooms; i++) {
    if (inConsultation[i]) {
      const elapsed = (now - new Date(inConsultation[i].consultationStartTime).getTime()) / 60000;
      const remaining = Math.max(0, avgDuration - elapsed);
      roomRemainingTimes.push(remaining);
    } else {
      roomRemainingTimes.push(0);
    }
  }

  // If no rooms in use, first patient waits 0 (they'll be called next)
  if (roomRemainingTimes.length === 0) {
    for (let i = 0; i < rooms; i++) roomRemainingTimes.push(0);
  }

  const results = [];

  sortedWaiting.forEach((entry, index) => {
    // Find the room that will finish soonest
    roomRemainingTimes.sort((a, b) => a - b);
    const waitTime = Math.round(roomRemainingTimes[0]);
    results.push({ entryId: entry._id, estimatedWaitingMinutes: waitTime, position: index + 1 });
    // Advance that room's time
    roomRemainingTimes[0] += avgDuration;
  });

  return results;
};

/**
 * Persist recalculated waiting times to the database
 */
const recalculateAndSave = async (clinicDate) => {
  const times = await calculateWaitingTimes(clinicDate);
  const ops = times.map(({ entryId, estimatedWaitingMinutes, position }) => ({
    updateOne: {
      filter: { _id: entryId },
      update: { $set: { estimatedWaitingMinutes, position } },
    },
  }));
  if (ops.length > 0) {
    await QueueEntry.bulkWrite(ops);
  }
  return times;
};

/**
 * Valid status transitions
 */
const VALID_TRANSITIONS = {
  waiting: ['in-consultation', 'skipped', 'cancelled'],
  'in-consultation': ['completed', 'waiting'],
  skipped: ['waiting', 'cancelled'],
  completed: [],
  cancelled: [],
};

const isValidTransition = (from, to) => {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
};

/**
 * Get the next waiting patient (ordered by policy)
 */
const getNextPatient = async (clinicDate) => {
  const settings = await getSettings();
  const waiting = await QueueEntry.find({ clinicDate, status: 'waiting' });
  const sorted = sortQueueByPolicy(waiting, settings.queuePolicy);
  return sorted[0] || null;
};

/**
 * Get ordered queue for a date
 */
const getOrderedQueue = async (clinicDate) => {
  const settings = await getSettings();

  const [inConsultation, waiting, skipped, completed, cancelled] = await Promise.all([
    QueueEntry.find({ clinicDate, status: 'in-consultation' }).sort({ consultationStartTime: 1 }),
    QueueEntry.find({ clinicDate, status: 'waiting' }),
    QueueEntry.find({ clinicDate, status: 'skipped' }).sort({ skippedAt: 1 }),
    QueueEntry.find({ clinicDate, status: 'completed' }).sort({ consultationEndTime: -1 }),
    QueueEntry.find({ clinicDate, status: 'cancelled' }).sort({ updatedAt: -1 }),
  ]);

  const sortedWaiting = sortQueueByPolicy(waiting, settings.queuePolicy);

  return {
    inConsultation,
    waiting: sortedWaiting,
    skipped,
    completed,
    cancelled,
    settings,
  };
};

module.exports = {
  getSettings,
  todayStr,
  getNextQueueNumber,
  calculateWaitingTimes,
  recalculateAndSave,
  isValidTransition,
  getNextPatient,
  getOrderedQueue,
  sortQueueByPolicy,
};
