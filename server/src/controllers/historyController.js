const QueueEntry = require('../models/QueueEntry');
const queueService = require('../services/queueService');

const getHistory = async (req, res, next) => {
  try {
    const { date, queueNumber, page = 1, limit = 20 } = req.query;

    const filter = {
      status: { $in: ['completed', 'skipped', 'cancelled'] },
    };

    if (date) filter.clinicDate = date;
    if (queueNumber) filter.queueNumber = parseInt(queueNumber);

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [entries, total] = await Promise.all([
      QueueEntry.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('appointmentId', 'appointmentDate appointmentTime notes'),
      QueueEntry.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: entries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getHistory };
