import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { resetDb, disconnectDb } from '../helpers/db';
import { createFaculty, createStudent, createConsultationOccurrence } from '../helpers/factories';
import { createBooking, cancelBookingByStudent } from '@/lib/booking/service';
import { getBookableOccurrences, getFacultyOccurrenceRoster } from '@/lib/booking/queries';
import { prisma } from '@/lib/db/prisma';
import { addDays } from 'date-fns';
import { dhakaToday } from '@/lib/timezone';

beforeEach(resetDb);
afterAll(disconnectDb);

describe('cancelBookingByStudent — student self-cancellation', () => {
  it('lets a student cancel their own booking, freeing the seat for others', async () => {
    const faculty = await createFaculty();
    const { occurrence } = await createConsultationOccurrence(faculty.id, { daysFromToday: 1, capacity: 1 });
    const [s1, s2] = await Promise.all([createStudent(), createStudent()]);

    const booking = await createBooking(s1.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'mistake' });

    // Capacity 1 — second student is blocked while s1's booking is active.
    await expect(createBooking(s2.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'x' })).rejects.toMatchObject({
      code: 'FULL',
    });

    await cancelBookingByStudent(s1.id, booking.id);

    const cancelled = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(cancelled?.status).toBe('CANCELLED_BY_STUDENT');
    expect(cancelled?.cancelledAt).not.toBeNull();

    // Seat is now free for another student.
    const s2Booking = await createBooking(s2.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'y' });
    expect(s2Booking.status).toBe('CONFIRMED');
  });

  it('lets the same student re-book after cancelling (does not permanently block the slot for them)', async () => {
    const faculty = await createFaculty();
    const { occurrence } = await createConsultationOccurrence(faculty.id, { daysFromToday: 1, capacity: 4 });
    const student = await createStudent();

    const first = await createBooking(student.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'first attempt' });
    await cancelBookingByStudent(student.id, first.id);

    const rebooked = await createBooking(student.id, { occurrenceId: occurrence.id, type: 'COURSE', courseCode: 'CSE110', section: '13', reason: 'actually meant to book this' });
    expect(rebooked.status).toBe('CONFIRMED');
    expect(rebooked.id).toBe(first.id); // same underlying row, reused via upsert-style update

    const count = await prisma.booking.count({ where: { occurrenceId: occurrence.id, studentId: student.id, status: 'CONFIRMED' } });
    expect(count).toBe(1);
  });

  it('refuses to cancel another student\'s booking', async () => {
    const faculty = await createFaculty();
    const { occurrence } = await createConsultationOccurrence(faculty.id, { daysFromToday: 1, capacity: 4 });
    const [owner, intruder] = await Promise.all([createStudent(), createStudent()]);
    const booking = await createBooking(owner.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'x' });

    await expect(cancelBookingByStudent(intruder.id, booking.id)).rejects.toMatchObject({ code: 'FORBIDDEN' });

    const stillConfirmed = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(stillConfirmed?.status).toBe('CONFIRMED');
  });

  it('refuses to cancel an already-cancelled booking', async () => {
    const faculty = await createFaculty();
    const { occurrence } = await createConsultationOccurrence(faculty.id, { daysFromToday: 1, capacity: 4 });
    const student = await createStudent();
    const booking = await createBooking(student.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'x' });

    await cancelBookingByStudent(student.id, booking.id);
    await expect(cancelBookingByStudent(student.id, booking.id)).rejects.toMatchObject({ code: 'ALREADY_CANCELLED' });
  });

  it('refuses to cancel a booking for a consultation that has already passed', async () => {
    const faculty = await createFaculty();
    const { entry } = await createConsultationOccurrence(faculty.id, { daysFromToday: 1, capacity: 4 });
    const student = await createStudent();

    // Create a *past* occurrence directly (bypassing the deadline rule, as a real one would have been created while still future).
    const pastOccurrence = await prisma.consultationOccurrence.create({
      data: {
        routineEntryId: entry.id,
        facultyId: faculty.id,
        date: addDays(dhakaToday(), -3),
        startSlot: entry.startSlot,
        capacity: entry.capacity ?? 4,
      },
    });
    const booking = await prisma.booking.create({
      data: { occurrenceId: pastOccurrence.id, studentId: student.id, type: 'OTHERS', reason: 'already happened' },
    });

    await expect(cancelBookingByStudent(student.id, booking.id)).rejects.toMatchObject({ code: 'PAST_CANNOT_CANCEL' });
  });

  it('excludes a cancelled booking from the public/student capacity count and position, but keeps it in the faculty roster for history', async () => {
    const faculty = await createFaculty();
    const { occurrence } = await createConsultationOccurrence(faculty.id, { daysFromToday: 1, capacity: 4 });
    const [s1, s2] = await Promise.all([createStudent(), createStudent()]);

    const b1 = await createBooking(s1.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'private reason' });
    await createBooking(s2.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'y' });
    await cancelBookingByStudent(s1.id, b1.id);

    const publicList = await getBookableOccurrences(faculty.id, occurrence.date, occurrence.date, s1.id);
    expect(publicList[0]?.bookedCount).toBe(1); // only s2's still-confirmed booking counts
    expect(publicList[0]?.myBookingPosition).toBeNull(); // s1's cancelled booking no longer occupies a position

    const roster = await getFacultyOccurrenceRoster(faculty.id, occurrence.id);
    expect(roster.bookings).toHaveLength(2); // both kept for history/transparency
    const s1Row = roster.bookings.find((b) => b.studentId === s1.id);
    expect(s1Row?.status).toBe('CANCELLED_BY_STUDENT');
    expect(s1Row?.reason).toBe('private reason'); // still visible to the owning faculty
  });
});
