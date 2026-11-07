const QueueEntry = require('../models/QueueEntry');
const Appointment = require('../models/Appointment');
const queueService = require('../services/queueService');

const getDashboard = async (req, res, next) => {
  try {
    const today = queueService.todayStr();
    const settings = await queueService.getSettings();

    const [totalToday, waiting, inConsultation, completed, appointments, recentActivity] = await Promise.all([
      QueueEntry.countDocuments({ clinicDate: today }),
      QueueEntry.countDocuments({ clinicDate: today, status: 'waiting' }),
      QueueEntry.find({ clinicDate: today, status: 'in-consultation' }).sort({ consultationStartTime: 1 }),
      QueueEntry.countDocuments({ clinicDate: today, status: 'completed' }),
      Appointment.find({ appointmentDate: today, status: { $ne: 'cancelled' } })
        .sort({ appointmentTime: 1 })
        .limit(10),
      QueueEntry.find({ clinicDate: today })
        .sort({ updatedAt: -1 })
        .limit(8),
    ]);

    const waitingEntries = await QueueEntry.find({ clinicDate: today, status: 'waiting' });
    const sortedWaiting = queueService.sortQueueByPolicy(waitingEntries, settings.queuePolicy);
    const nextPatient = sortedWaiting[0] || null;

    // Calculate avg service duration from completed consultations today
    const completedEntries = await QueueEntry.find({
      clinicDate: today,
      status: 'completed',
      consultationStartTime: { $ne: null },
      consultationEndTime: { $ne: null },
    });

    let avgDuration = settings.averageServiceDurationMinutes;
    if (completedEntries.length > 0) {
      const totalDuration = completedEntries.reduce((sum, e) => {
        return sum + (new Date(e.consultationEndTime) - new Date(e.consultationStartTime)) / 60000;
      }, 0);
      avgDuration = Math.round(totalDuration / completedEntries.length);
    }

    res.json({
      success: true,
      data: {
        today,
        clinicName: settings.clinicName,
        summary: {
          totalToday,
          waiting,
          inConsultation: inConsultation.length,
          completed,
        },
        nextPatient: nextPatient
          ? { id: nextPatient._id, queueNumber: nextPatient.queueNumber, patientName: nextPatient.patientName, entryType: nextPatient.entryType }
          : null,
        inConsultationList: inConsultation.map((e) => ({
          id: e._id,
          queueNumber: e.queueNumber,
          patientName: e.patientName,
          consultationStartTime: e.consultationStartTime,
        })),
        averageServiceDurationMinutes: avgDuration,
        upcomingAppointments: appointments,
        recentActivity,
        settings: {
          queuePolicy: settings.queuePolicy,
          consultationRooms: settings.consultationRooms,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboard };
