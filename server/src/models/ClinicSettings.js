const mongoose = require('mongoose');

const clinicSettingsSchema = new mongoose.Schema(
  {
    clinicName: {
      type: String,
      required: true,
      trim: true,
      default: 'ClinicQueue Lite',
    },
    averageServiceDurationMinutes: {
      type: Number,
      required: true,
      min: 1,
      max: 120,
      default: 10,
    },
    openingHours: {
      open: { type: String, default: '08:00' },
      close: { type: String, default: '17:00' },
    },
    queuePolicy: {
      type: String,
      enum: ['appointment-first', 'walk-in-first', 'fifo', 'mixed'],
      default: 'mixed',
    },
    consultationRooms: {
      type: Number,
      min: 1,
      max: 10,
      default: 1,
    },
    maxDisplayWaitingMinutes: {
      type: Number,
      default: 120,
      min: 10,
      max: 480,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ClinicSettings', clinicSettingsSchema);
