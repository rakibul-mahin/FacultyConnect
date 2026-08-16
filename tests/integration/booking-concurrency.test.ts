import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { resetDb, disconnectDb } from '../helpers/db';
import { createFaculty, createStudent, createConsultationOccurrence } from '../helpers/factories';
import { createBooking } from '@/lib/booking/service';
import { prisma } from '@/lib/db/prisma';

beforeEach(resetDb);
afterAll(disconnectDb);

describe('createBooking — concurrency safety (§6, §43)', () => {
  it('never overbooks capacity when many students race for the last seat simultaneously', async () => {
    const faculty = await createFaculty();
    const capacity = 3;
    const { occurrence } = await createConsultationOccurrence(faculty.id, { daysFromToday: 1, capacity });
    const students = await Promise.all(Array.from({ length: 10 }, () => createStudent()));

    const results = await Promise.allSettled(
      students.map((s) => createBooking(s.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'racing' }))
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');

    expect(succeeded).toHaveLength(capacity);
    expect(failed).toHaveLength(students.length - capacity);

    const confirmedCount = await prisma.booking.count({ where: { occurrenceId: occurrence.id, status: 'CONFIRMED' } });
    expect(confirmedCount).toBe(capacity);
  });
});
