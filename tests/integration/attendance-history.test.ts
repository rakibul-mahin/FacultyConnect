import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { resetDb, disconnectDb } from '../helpers/db';
import { createFaculty, createStudent, createConsultationOccurrence } from '../helpers/factories';
import { createBooking, cancelOccurrence, markAttendance } from '@/lib/booking/service';
import { prisma } from '@/lib/db/prisma';

beforeEach(resetDb);
afterAll(disconnectDb);

describe('attendance & historical data (§29-30, §32)', () => {
  it('records and updates attendance for a booking', async () => {
    const faculty = await createFaculty();
    const { occurrence } = await createConsultationOccurrence(faculty.id, { daysFromToday: 1, capacity: 4 });
    const student = await createStudent();
    const booking = await createBooking(student.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'x' });

    await markAttendance(faculty.id, booking.id, 'PRESENT');
    let attendance = await prisma.attendance.findUnique({ where: { bookingId: booking.id } });
    expect(attendance?.status).toBe('PRESENT');

    await markAttendance(faculty.id, booking.id, 'ABSENT');
    attendance = await prisma.attendance.findUnique({ where: { bookingId: booking.id } });
    expect(attendance?.status).toBe('ABSENT');
  });

  it('cancelling an occurrence keeps the occurrence and its bookings as historical records instead of deleting them', async () => {
    const faculty = await createFaculty();
    const { occurrence } = await createConsultationOccurrence(faculty.id, { daysFromToday: 1, capacity: 4 });
    const student = await createStudent();
    const booking = await createBooking(student.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'keep me' });

    await cancelOccurrence(faculty.id, occurrence.id, 'Faculty unavailable');

    const persistedOccurrence = await prisma.consultationOccurrence.findUnique({ where: { id: occurrence.id } });
    const persistedBooking = await prisma.booking.findUnique({ where: { id: booking.id } });

    expect(persistedOccurrence).not.toBeNull();
    expect(persistedOccurrence?.status).toBe('CANCELLED');
    expect(persistedOccurrence?.cancelReason).toBe('Faculty unavailable');
    expect(persistedBooking).not.toBeNull();
    expect(persistedBooking?.reason).toBe('keep me');
  });
});
