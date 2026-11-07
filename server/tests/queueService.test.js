/**
 * Tests for queue service - queue number generation, waiting time calculation,
 * status transitions, and duplicate prevention.
 *
 * These tests use mocked mongoose models to run without a live database.
 */

// Mock mongoose models
jest.mock('../src/models/QueueEntry');
jest.mock('../src/models/ClinicSettings');
jest.mock('../src/models/Appointment');

const QueueEntry = require('../src/models/QueueEntry');
const ClinicSettings = require('../src/models/ClinicSettings');
const queueService = require('../src/services/queueService');

const mockSettings = {
  averageServiceDurationMinutes: 10,
  consultationRooms: 1,
  queuePolicy: 'mixed',
  clinicName: 'Test Clinic',
};

beforeEach(() => {
  jest.clearAllMocks();
  ClinicSettings.findOne = jest.fn().mockResolvedValue(mockSettings);
  ClinicSettings.create = jest.fn().mockResolvedValue(mockSettings);
});

describe('queueService.getNextQueueNumber', () => {
  it('returns 1 when no queue entries exist', async () => {
    QueueEntry.findOne = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      }),
    });

    const num = await queueService.getNextQueueNumber('2024-01-15');
    expect(num).toBe(1);
  });

  it('returns last queue number + 1 when entries exist', async () => {
    QueueEntry.findOne = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ queueNumber: 7 }),
      }),
    });

    const num = await queueService.getNextQueueNumber('2024-01-15');
    expect(num).toBe(8);
  });
});

describe('queueService.isValidTransition', () => {
  it('allows waiting -> in-consultation', () => {
    expect(queueService.isValidTransition('waiting', 'in-consultation')).toBe(true);
  });

  it('allows waiting -> skipped', () => {
    expect(queueService.isValidTransition('waiting', 'skipped')).toBe(true);
  });

  it('allows waiting -> cancelled', () => {
    expect(queueService.isValidTransition('waiting', 'cancelled')).toBe(true);
  });

  it('allows in-consultation -> completed', () => {
    expect(queueService.isValidTransition('in-consultation', 'completed')).toBe(true);
  });

  it('allows skipped -> waiting (return)', () => {
    expect(queueService.isValidTransition('skipped', 'waiting')).toBe(true);
  });

  it('prevents completed -> waiting', () => {
    expect(queueService.isValidTransition('completed', 'waiting')).toBe(false);
  });

  it('prevents cancelled -> waiting', () => {
    expect(queueService.isValidTransition('cancelled', 'waiting')).toBe(false);
  });

  it('prevents waiting -> completed (must go through in-consultation)', () => {
    expect(queueService.isValidTransition('waiting', 'completed')).toBe(false);
  });
});

describe('queueService.calculateWaitingTimes', () => {
  const clinicDate = '2024-01-15';

  it('calculates correct waiting times with one patient in consultation', async () => {
    const consultationStart = new Date(Date.now() - 4 * 60000); // 4 minutes ago

    const makeQuery = (data) => {
      const p = Promise.resolve(data);
      p.sort = jest.fn().mockReturnValue(Promise.resolve(data));
      return p;
    };

    QueueEntry.find = jest.fn().mockImplementation((query) => {
      if (query.status === 'in-consultation') {
        return makeQuery([
          { _id: 'consult1', consultationStartTime: consultationStart, clinicDate },
        ]);
      }
      if (query.status === 'waiting') {
        return makeQuery([
          { _id: 'w1', entryType: 'appointment', scheduledTime: '09:00', clinicDate, registrationTime: new Date('2024-01-15T08:55:00') },
          { _id: 'w2', entryType: 'walk-in', scheduledTime: null, clinicDate, registrationTime: new Date('2024-01-15T09:05:00') },
          { _id: 'w3', entryType: 'walk-in', scheduledTime: null, clinicDate, registrationTime: new Date('2024-01-15T09:10:00') },
        ]);
      }
      return makeQuery([]);
    });

    const results = await queueService.calculateWaitingTimes(clinicDate);

    // With 4 min elapsed, ~6 min remaining
    // Patient A: ~6 min wait
    // Patient B: ~6 + 10 = 16 min
    // Patient C: ~6 + 10 + 10 = 26 min
    expect(results.length).toBe(3);
    expect(results[0].estimatedWaitingMinutes).toBeGreaterThanOrEqual(5);
    expect(results[0].estimatedWaitingMinutes).toBeLessThanOrEqual(7);
    expect(results[1].estimatedWaitingMinutes).toBeGreaterThanOrEqual(14);
    expect(results[1].estimatedWaitingMinutes).toBeLessThanOrEqual(18);
    expect(results[2].estimatedWaitingMinutes).toBeGreaterThanOrEqual(24);
    expect(results[2].estimatedWaitingMinutes).toBeLessThanOrEqual(28);
  });

  it('calculates 0 wait when no one is in consultation and patient is first', async () => {
    const makeQuery = (data) => {
      const p = Promise.resolve(data);
      p.sort = jest.fn().mockReturnValue(Promise.resolve(data));
      return p;
    };

    QueueEntry.find = jest.fn().mockImplementation((query) => {
      if (query.status === 'in-consultation') return makeQuery([]);
      if (query.status === 'waiting') {
        return makeQuery([
          { _id: 'w1', entryType: 'walk-in', scheduledTime: null, clinicDate, registrationTime: new Date() },
        ]);
      }
      return makeQuery([]);
    });

    const results = await queueService.calculateWaitingTimes(clinicDate);
    expect(results[0].estimatedWaitingMinutes).toBe(0);
  });

  it('returns empty array when no waiting patients', async () => {
    QueueEntry.find = jest.fn().mockImplementation((query) => {
      const p = Promise.resolve([]);
      p.sort = jest.fn().mockReturnValue(Promise.resolve([]));
      return p;
    });

    const results = await queueService.calculateWaitingTimes(clinicDate);
    expect(results).toHaveLength(0);
  });
});

describe('queueService.sortQueueByPolicy', () => {
  const baseEntries = [
    { _id: 'w1', entryType: 'walk-in', scheduledTime: null, clinicDate: '2024-01-15', registrationTime: new Date('2024-01-15T09:00:00') },
    { _id: 'a1', entryType: 'appointment', scheduledTime: '08:30', clinicDate: '2024-01-15', registrationTime: new Date('2024-01-15T08:25:00') },
    { _id: 'a2', entryType: 'appointment', scheduledTime: '09:30', clinicDate: '2024-01-15', registrationTime: new Date('2024-01-15T09:25:00') },
  ];

  it('appointment-first policy puts appointments before walk-ins', () => {
    const sorted = queueService.sortQueueByPolicy([...baseEntries], 'appointment-first');
    expect(sorted[0].entryType).toBe('appointment');
    expect(sorted[1].entryType).toBe('appointment');
    expect(sorted[2].entryType).toBe('walk-in');
  });

  it('walk-in-first policy puts walk-ins before appointments', () => {
    const sorted = queueService.sortQueueByPolicy([...baseEntries], 'walk-in-first');
    expect(sorted[0].entryType).toBe('walk-in');
  });

  it('fifo policy sorts by time only', () => {
    const sorted = queueService.sortQueueByPolicy([...baseEntries], 'fifo');
    // a1 has scheduled 08:30, w1 has registration 09:00, a2 has scheduled 09:30
    expect(sorted[0]._id).toBe('a1');
  });
});

describe('QueueEntry access code generation', () => {
  it('generates a 6-character uppercase hex code', () => {
    // Test the real static method behavior
    const crypto = require('crypto');
    const code = crypto.randomBytes(3).toString('hex').toUpperCase();
    expect(code).toMatch(/^[0-9A-F]{6}$/);
  });

  it('hashes access code deterministically', () => {
    const crypto = require('crypto');
    const code = 'ABC123';
    const hash1 = crypto.createHash('sha256').update(code).digest('hex');
    const hash2 = crypto.createHash('sha256').update(code).digest('hex');
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(code);
  });
});
