const mongoose = require('mongoose');
const crypto = require('crypto');

const queueEntrySchema = new mongoose.Schema(
  {
    queueNumber: {
      type: Number,
      required: true,
    },
    clinicDate: {
      type: String, // YYYY-MM-DD
      required: true,
    },
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
    entryType: {
      type: String,
      enum: ['appointment', 'walk-in'],
      required: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
    status: {
      type: String,
      enum: ['waiting', 'in-consultation', 'completed', 'skipped', 'cancelled'],
      default: 'waiting',
    },
    registrationTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    scheduledTime: {
      type: String, // HH:mm for appointment entries
      default: null,
    },
    consultationStartTime: {
      type: Date,
      default: null,
    },
    consultationEndTime: {
      type: Date,
      default: null,
    },
    estimatedWaitingMinutes: {
      type: Number,
      default: 0,
    },
    accessCodeHash: {
      type: String,
      required: true,
    },
    accessCodePlain: {
      // Only exposed at creation, never stored permanently in plain
      type: String,
      select: false,
    },
    position: {
      type: Number,
      default: null,
    },
    skippedAt: {
      type: Date,
      default: null,
    },
    returnedFromSkip: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Compound unique index: one active queue number per clinic date
queueEntrySchema.index(
  { queueNumber: 1, clinicDate: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['waiting', 'in-consultation', 'skipped'] },
    },
  }
);

queueEntrySchema.index({ clinicDate: 1, status: 1 });
queueEntrySchema.index({ clinicDate: 1, queueNumber: 1 });

queueEntrySchema.statics.generateAccessCode = function () {
  return crypto.randomBytes(3).toString('hex').toUpperCase(); // 6-char hex
};

queueEntrySchema.statics.hashAccessCode = function (code) {
  return crypto.createHash('sha256').update(code).digest('hex');
};

module.exports = mongoose.model('QueueEntry', queueEntrySchema);
