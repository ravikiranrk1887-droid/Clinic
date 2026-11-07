/**
 * Integration tests for appointment API endpoints.
 * Uses supertest to test HTTP layer without mocking controllers.
 */

const request = require('supertest');

// Mock database connection to avoid needing a real MongoDB
jest.mock('../src/config/database', () => jest.fn().mockResolvedValue(undefined));
jest.mock('../src/models/Appointment');
jest.mock('../src/models/QueueEntry');
jest.mock('../src/models/ClinicSettings');
jest.mock('../src/models/Staff');

const Appointment = require('../src/models/Appointment');
const { app } = require('../src/app');

// Mock JWT auth
jest.mock('../src/middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.staff = { _id: 'staffid', username: 'teststaff', role: 'admin' };
    next();
  },
  requireAdmin: (req, res, next) => next(),
}));

describe('GET /api/appointments', () => {
  it('returns appointments list', async () => {
    Appointment.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([
            { _id: 'a1', patientName: 'Alice', appointmentDate: '2024-01-15', appointmentTime: '09:00', status: 'scheduled' },
          ]),
        }),
      }),
    });
    Appointment.countDocuments = jest.fn().mockResolvedValue(1);

    const res = await request(app).get('/api/appointments');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('POST /api/appointments', () => {
  it('creates appointment with valid data', async () => {
    const newAppt = {
      patientName: 'Bob Smith',
      appointmentDate: '2030-12-31',
      appointmentTime: '10:00',
    };

    Appointment.create = jest.fn().mockResolvedValue({
      _id: 'new1',
      ...newAppt,
      status: 'scheduled',
    });

    const res = await request(app).post('/api/appointments').send(newAppt);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.patientName).toBe('Bob Smith');
  });

  it('rejects missing patient name', async () => {
    const res = await request(app).post('/api/appointments').send({
      appointmentDate: '2030-12-31',
      appointmentTime: '10:00',
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects invalid date format', async () => {
    const res = await request(app).post('/api/appointments').send({
      patientName: 'Test Patient',
      appointmentDate: '31-12-2030', // wrong format
      appointmentTime: '10:00',
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects invalid phone number', async () => {
    const res = await request(app).post('/api/appointments').send({
      patientName: 'Test Patient',
      appointmentDate: '2030-12-31',
      appointmentTime: '10:00',
      patientPhone: 'notaphone',
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/health', () => {
  it('returns 200 with health status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('ClinicQueue');
  });
});

describe('GET /api/appointments/:id', () => {
  it('returns 400 for invalid ObjectId format', async () => {
    const res = await request(app).get('/api/appointments/invalid-id');
    expect(res.status).toBe(400);
  });

  it('returns 404 for valid but nonexistent ID', async () => {
    Appointment.findById = jest.fn().mockResolvedValue(null);
    const res = await request(app).get('/api/appointments/507f1f77bcf86cd799439011');
    expect(res.status).toBe(404);
  });
});

describe('Auth protection', () => {
  it('GET /api/dashboard returns data with auth', async () => {
    const QueueEntry = require('../src/models/QueueEntry');
    const ClinicSettings = require('../src/models/ClinicSettings');

    ClinicSettings.findOne = jest.fn().mockResolvedValue({
      clinicName: 'Test Clinic',
      averageServiceDurationMinutes: 10,
      queuePolicy: 'mixed',
      consultationRooms: 1,
    });
    ClinicSettings.create = jest.fn().mockResolvedValue({
      clinicName: 'Test Clinic',
      averageServiceDurationMinutes: 10,
      queuePolicy: 'mixed',
      consultationRooms: 1,
    });

    QueueEntry.countDocuments = jest.fn().mockResolvedValue(0);

    const makeQueryChain = (data = []) => {
      const p = Promise.resolve(data);
      p.sort = jest.fn().mockImplementation(() => {
        const sortedP = Promise.resolve(data);
        sortedP.limit = jest.fn().mockResolvedValue(data);
        return sortedP;
      });
      p.limit = jest.fn().mockResolvedValue(data);
      return p;
    };

    QueueEntry.find = jest.fn().mockImplementation(() => makeQueryChain([]));
    Appointment.find = jest.fn().mockImplementation(() => makeQueryChain([]));

    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
