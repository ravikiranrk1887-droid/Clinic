require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const Staff = require('../src/models/Staff');
const Appointment = require('../src/models/Appointment');
const QueueEntry = require('../src/models/QueueEntry');
const ClinicSettings = require('../src/models/ClinicSettings');

const shouldClean = process.argv.includes('--clean');

const todayStr = () => new Date().toISOString().split('T')[0];

const hashCode = (code) => crypto.createHash('sha256').update(code).digest('hex');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  if (shouldClean) {
    await Promise.all([
      Staff.deleteMany({}),
      Appointment.deleteMany({}),
      QueueEntry.deleteMany({}),
      ClinicSettings.deleteMany({}),
    ]);
    console.log('Cleaned all existing data');
  }

  // Clinic Settings
  await ClinicSettings.findOneAndUpdate(
    {},
    {
      clinicName: 'Sunrise Family Clinic',
      averageServiceDurationMinutes: 10,
      openingHours: { open: '08:00', close: '17:00' },
      queuePolicy: 'mixed',
      consultationRooms: 1,
      maxDisplayWaitingMinutes: 120,
    },
    { upsert: true, new: true }
  );
  console.log('✓ Clinic settings created');

  // Admin staff account
  const adminExists = await Staff.findOne({ username: 'admin' });
  if (!adminExists) {
    const passwordHash = await bcrypt.hash('Admin@1234', 12);
    await Staff.create({
      username: 'admin',
      passwordHash,
      displayName: 'Dr. Admin',
      role: 'admin',
    });
    console.log('✓ Admin staff created (username: admin, password: Admin@1234)');
  } else {
    console.log('✓ Admin staff already exists');
  }

  // Staff nurse account
  const nurseExists = await Staff.findOne({ username: 'nurse1' });
  if (!nurseExists) {
    const passwordHash = await bcrypt.hash('Nurse@1234', 12);
    await Staff.create({
      username: 'nurse1',
      passwordHash,
      displayName: 'Nurse Sarah',
      role: 'staff',
    });
    console.log('✓ Nurse staff created (username: nurse1, password: Nurse@1234)');
  }

  const today = todayStr();

  // Sample appointments
  const appointments = [
    { patientName: 'Alice Mendoza', patientPhone: '+1-555-0101', appointmentDate: today, appointmentTime: '09:00', status: 'scheduled' },
    { patientName: 'Bob Nguyen', patientPhone: '+1-555-0102', appointmentDate: today, appointmentTime: '09:30', status: 'scheduled' },
    { patientName: 'Carol Smith', patientPhone: '+1-555-0103', appointmentDate: today, appointmentTime: '10:00', status: 'scheduled' },
    { patientName: 'David Park', appointmentDate: today, appointmentTime: '10:30', status: 'scheduled' },
    { patientName: 'Elena Rossi', patientPhone: '+1-555-0105', appointmentDate: today, appointmentTime: '11:00', status: 'completed' },
  ];

  const createdAppts = [];
  for (const appt of appointments) {
    const existing = await Appointment.findOne({ patientName: appt.patientName, appointmentDate: today });
    if (!existing) {
      createdAppts.push(await Appointment.create(appt));
    } else {
      createdAppts.push(existing);
    }
  }
  console.log(`✓ ${appointments.length} appointments seeded`);

  // Check for existing queue entries today
  const existingQueue = await QueueEntry.countDocuments({ clinicDate: today });
  if (existingQueue === 0) {
    const queueEntries = [
      {
        queueNumber: 1,
        clinicDate: today,
        patientName: 'Elena Rossi',
        entryType: 'appointment',
        status: 'completed',
        registrationTime: new Date(`${today}T08:50:00`),
        scheduledTime: '09:00',
        consultationStartTime: new Date(`${today}T09:00:00`),
        consultationEndTime: new Date(`${today}T09:12:00`),
        estimatedWaitingMinutes: 0,
        accessCodeHash: hashCode('ABC123'),
      },
      {
        queueNumber: 2,
        clinicDate: today,
        patientName: 'Frank Turner',
        entryType: 'walk-in',
        status: 'completed',
        registrationTime: new Date(`${today}T09:05:00`),
        consultationStartTime: new Date(`${today}T09:15:00`),
        consultationEndTime: new Date(`${today}T09:27:00`),
        estimatedWaitingMinutes: 0,
        accessCodeHash: hashCode('DEF456'),
      },
      {
        queueNumber: 3,
        clinicDate: today,
        patientName: 'Alice Mendoza',
        entryType: 'appointment',
        status: 'in-consultation',
        registrationTime: new Date(`${today}T09:25:00`),
        scheduledTime: '09:30',
        consultationStartTime: new Date(Date.now() - 4 * 60000),
        estimatedWaitingMinutes: 0,
        accessCodeHash: hashCode('GHI789'),
      },
      {
        queueNumber: 4,
        clinicDate: today,
        patientName: 'Bob Nguyen',
        entryType: 'appointment',
        status: 'waiting',
        registrationTime: new Date(`${today}T09:28:00`),
        scheduledTime: '09:30',
        estimatedWaitingMinutes: 6,
        accessCodeHash: hashCode('JKL012'),
      },
      {
        queueNumber: 5,
        clinicDate: today,
        patientName: 'Grace Lee',
        entryType: 'walk-in',
        status: 'waiting',
        registrationTime: new Date(`${today}T09:45:00`),
        estimatedWaitingMinutes: 16,
        accessCodeHash: hashCode('MNO345'),
      },
      {
        queueNumber: 6,
        clinicDate: today,
        patientName: 'Henry Okafor',
        entryType: 'walk-in',
        status: 'skipped',
        registrationTime: new Date(`${today}T09:50:00`),
        skippedAt: new Date(`${today}T10:05:00`),
        estimatedWaitingMinutes: 26,
        accessCodeHash: hashCode('PQR678'),
      },
    ];

    for (const entry of queueEntries) {
      await QueueEntry.create(entry);
    }
    console.log(`✓ ${queueEntries.length} queue entries seeded`);

    console.log('\n📋 Demo access codes (for patient-status page):');
    console.log('  Queue #4 (Bob Nguyen):   code = JKL012');
    console.log('  Queue #5 (Grace Lee):    code = MNO345');
    console.log('  Queue #3 (Alice - in consultation): code = GHI789');
  } else {
    console.log('✓ Queue entries already exist for today, skipping');
  }

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n🔐 Staff credentials:');
  console.log('  Admin  → username: admin,  password: Admin@1234');
  console.log('  Nurse  → username: nurse1, password: Nurse@1234');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
