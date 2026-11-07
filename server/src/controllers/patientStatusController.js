const QueueEntry = require('../models/QueueEntry');
const queueService = require('../services/queueService');
const crypto = require('crypto');

const getPatientStatus = async (req, res, next) => {
  try {
    const { queueNumber } = req.params;
    const { date, code } = req.query;

    const num = parseInt(queueNumber);
    if (isNaN(num) || num < 1) {
      return res.status(400).json({ success: false, message: 'Invalid queue number' });
    }

    const clinicDate = date || queueService.todayStr();

    const entry = await QueueEntry.findOne({ queueNumber: num, clinicDate });
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Queue number not found for today' });
    }

    // Verify access code
    if (!code) {
      return res.status(401).json({ success: false, message: 'Access code required' });
    }

    const providedHash = crypto.createHash('sha256').update(code.toUpperCase()).digest('hex');
    if (providedHash !== entry.accessCodeHash) {
      return res.status(401).json({ success: false, message: 'Invalid access code' });
    }

    // Count patients ahead (waiting only, before this patient's queue position)
    const settings = await queueService.getSettings();
    const waitingEntries = await QueueEntry.find({ clinicDate, status: 'waiting' });
    const sortedWaiting = queueService.sortQueueByPolicy(waitingEntries, settings.queuePolicy);
    const myIndex = sortedWaiting.findIndex((e) => e._id.toString() === entry._id.toString());
    const patientsAhead = myIndex >= 0 ? myIndex : 0;

    // Find currently serving
    const inConsultation = await QueueEntry.find({ clinicDate, status: 'in-consultation' })
      .select('queueNumber patientName')
      .lean();

    const servingNumbers = inConsultation.map((e) => e.queueNumber);

    // Return only safe, non-private information
    res.json({
      success: true,
      data: {
        queueNumber: entry.queueNumber,
        status: entry.status,
        entryType: entry.entryType,
        patientsAhead,
        estimatedWaitingMinutes: entry.estimatedWaitingMinutes,
        currentlyServing: servingNumbers,
        clinicDate,
        note: 'Waiting times are estimates and may change based on consultation duration and clinic activity.',
      },
    });
  } catch (err) {
    next(err);
  }
};

const getQueueOverview = async (req, res, next) => {
  try {
    const clinicDate = queueService.todayStr();
    const settings = await queueService.getSettings();

    const [waiting, inConsultation, completed] = await Promise.all([
      QueueEntry.countDocuments({ clinicDate, status: 'waiting' }),
      QueueEntry.find({ clinicDate, status: 'in-consultation' }).select('queueNumber').lean(),
      QueueEntry.countDocuments({ clinicDate, status: 'completed' }),
    ]);

    res.json({
      success: true,
      data: {
        clinicName: settings.clinicName,
        clinicDate,
        waitingCount: waiting,
        currentlyServing: inConsultation.map((e) => e.queueNumber),
        completedCount: completed,
        isOpen: true,
        note: 'Waiting times are estimates only.',
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getPatientStatus, getQueueOverview };
