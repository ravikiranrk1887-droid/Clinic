const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patientName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    patientPhone: {
      type: String,
      trim: true,
      default: null,
    },
    appointmentDate: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    appointmentTime: {
      type: String, // HH:mm
      required: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'checked-in', 'completed', 'cancelled', 'no-show'],
      default: 'scheduled',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    queueEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QueueEntry',
      default: null,
    },
  },
  { timestamps: true }
);

appointmentSchema.index({ appointmentDate: 1, status: 1 });
appointmentSchema.index({ patientName: 'text' });

module.exports = mongoose.model('Appointment', appointmentSchema);
