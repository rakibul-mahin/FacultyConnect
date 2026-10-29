import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { addDays } from 'date-fns';
import { resetDb, disconnectDb } from '../helpers/db';
import { createFaculty, createStudent, createConsultationOccurrence } from '../helpers/factories';
import { createBooking, cancelOccurrence, cancelDay, cancelBookingByFaculty } from '@/lib/booking/service';
import { getFacultySlots } from '@/lib/booking/queries';
import { prisma } from '@/lib/db/prisma';
import { dhakaToday } from '@/lib/timezone';
import * as notifyModule from '@/lib/notify';

beforeEach(resetDb);
afterAll(disconnectDb);

describe('faculty cancellations require a reason once students are booked', () => {
  it('rejects cancelling a booked slot without a reason, and stores the reason when given', async () => {
    const faculty = await createFaculty();
    const { occurrence } = await createConsultationOccurrence(faculty.id, { daysFromToday: 1, capacity: 3 });
    const student = await createStudent();
    await createBooking(student.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'x' });

    await expect(cancelOccurrence(faculty.id, occurrence.id)).rejects.toMatchObject({ code: 'REASON_REQUIRED' });
    await expect(cancelOccurrence(faculty.id, occurrence.id, '   ')).rejects.toMatchObject({ code: 'REASON_REQUIRED' });

    await cancelOccurrence(faculty.id, occurrence.id, 'Department meeting');
    const after = await prisma.consultationOccurrence.findUnique({ where: { id: occurrence.id } });
    expect(after?.status).toBe('CANCELLED');
    expect(after?.cancelReason).toBe('Department meeting');
  });

  it('allows cancelling an empty slot without a reason', async () => {
    const faculty = await createFaculty();
    const { occurrence } = await createConsultationOccurrence(faculty.id, { daysFromToday: 1, capacity: 3 });
    await cancelOccurrence(faculty.id, occurrence.id);
    const after = await prisma.consultationOccurrence.findUnique({ where: { id: occurrence.id } });
    expect(after?.status).toBe('CANCELLED');
    expect(after?.cancelReason).toBeNull();
  });

  it('cancelDay requires a reason when any slot that day is booked, and notifies per slot', async () => {
    const faculty = await createFaculty();
    const { occurrence: a } = await createConsultationOccurrence(faculty.id, { daysFromToday: 2, capacity: 3, startSlot: 'T_11_00' });
    const { occurrence: b } = await createConsultationOccurrence(faculty.id, { daysFromToday: 2, capacity: 3, startSlot: 'T_14_00' });
    const student = await createStudent();
    await createBooking(student.id, { occurrenceId: a.id, type: 'OTHERS', reason: 'x' });

    const date = addDays(dhakaToday(), 2);
    await expect(cancelDay(faculty.id, date)).rejects.toMatchObject({ code: 'REASON_REQUIRED' });

    const spy = vi.spyOn(notifyModule, 'notify');
    const count = await cancelDay(faculty.id, date, 'Unwell');
    expect(count).toBe(2);
    const events = spy.mock.calls.map(([e]) => e).filter((e) => e.type === 'OCCURRENCE_CANCELLED');
    expect(events.map((e) => (e as { occurrenceId: string }).occurrenceId).sort()).toEqual([a.id, b.id].sort());
    spy.mockRestore();
  });
});

describe('cancelBookingByFaculty — removing a single student', () => {
  it('frees the seat and marks the booking CANCELLED_BY_FACULTY', async () => {
    const faculty = await createFaculty();
    const { occurrence } = await createConsultationOccurrence(faculty.id, { daysFromToday: 1, capacity: 1 });
    const [s1, s2] = await Promise.all([createStudent(), createStudent()]);
    const booking = await createBooking(s1.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'x' });

    await cancelBookingByFaculty(faculty.id, booking.id, 'Please book a thesis slot instead');

    const after = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(after?.status).toBe('CANCELLED_BY_FACULTY');
    const s2Booking = await createBooking(s2.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'y' });
    expect(s2Booking.status).toBe('CONFIRMED');
  });

  it('requires a reason', async () => {
    const faculty = await createFaculty();
    const { occurrence } = await createConsultationOccurrence(faculty.id, { daysFromToday: 1, capacity: 2 });
    const student = await createStudent();
    const booking = await createBooking(student.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'x' });
    await expect(cancelBookingByFaculty(faculty.id, booking.id, ' ')).rejects.toMatchObject({ code: 'REASON_REQUIRED' });
  });

  it("refuses to remove another faculty's student", async () => {
    const [owner, other] = await Promise.all([createFaculty(), createFaculty()]);
    const { occurrence } = await createConsultationOccurrence(owner.id, { daysFromToday: 1, capacity: 2 });
    const student = await createStudent();
    const booking = await createBooking(student.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'x' });
    await expect(cancelBookingByFaculty(other.id, booking.id, 'nope')).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('refuses to remove an already-cancelled booking', async () => {
    const faculty = await createFaculty();
    const { occurrence } = await createConsultationOccurrence(faculty.id, { daysFromToday: 1, capacity: 2 });
    const student = await createStudent();
    const booking = await createBooking(student.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'x' });
    await cancelBookingByFaculty(faculty.id, booking.id, 'Clash');
    await expect(cancelBookingByFaculty(faculty.id, booking.id, 'Again')).rejects.toMatchObject({ code: 'ALREADY_CANCELLED' });
  });
});

describe('getFacultySlots — bookings board data', () => {
  it('numbers confirmed students in booking order and skips cancelled ones', async () => {
    const faculty = await createFaculty();
    const { occurrence } = await createConsultationOccurrence(faculty.id, { daysFromToday: 1, capacity: 4 });
    const [s1, s2, s3] = await Promise.all([createStudent(), createStudent(), createStudent()]);
    const b1 = await createBooking(s1.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'a' });
    await createBooking(s2.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'b' });
    await createBooking(s3.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'c' });
    await cancelBookingByFaculty(faculty.id, b1.id, 'Clash');

    const [slot] = await getFacultySlots(faculty.id, dhakaToday(), addDays(dhakaToday(), 7));
    const positions = slot!.bookings.map((b) => [b.status, b.position]);
    expect(positions).toEqual([
      ['CANCELLED_BY_FACULTY', null],
      ['CONFIRMED', 1],
      ['CONFIRMED', 2],
    ]);
    expect(slot!.started).toBe(false);
  });
});

describe('student notifications from faculty cancellations', () => {
  it('cancelling a slot notifies every confirmed student — not ones who already cancelled', async () => {
    const faculty = await createFaculty({ fullName: 'Rakibul Hasan' });
    const { occurrence } = await createConsultationOccurrence(faculty.id, { daysFromToday: 1, capacity: 4 });
    const [s1, s2, s3] = await Promise.all([createStudent(), createStudent(), createStudent()]);
    await createBooking(s1.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'a' });
    await createBooking(s2.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'b' });
    const gone = await createBooking(s3.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'c' });
    await prisma.booking.update({ where: { id: gone.id }, data: { status: 'CANCELLED_BY_STUDENT' } });

    await cancelOccurrence(faculty.id, occurrence.id, 'Meeting');

    const notes = await prisma.notification.findMany({ orderBy: { studentId: 'asc' } });
    expect(notes.map((n) => n.studentId).sort()).toEqual([s1.id, s2.id].sort());
    expect(notes.every((n) => n.type === 'OCCURRENCE_CANCELLED' && n.reason === 'Meeting' && n.readAt === null)).toBe(true);
    expect(notes[0]!.facultyName).toBe('Rakibul Hasan');
    expect(notes[0]!.facultyPublicId).toBe(faculty.publicId);
  });

  it('cancelling a day notifies students across all of its slots', async () => {
    const faculty = await createFaculty();
    const { occurrence: a } = await createConsultationOccurrence(faculty.id, { daysFromToday: 2, capacity: 3, startSlot: 'T_11_00' });
    const { occurrence: b } = await createConsultationOccurrence(faculty.id, { daysFromToday: 2, capacity: 3, startSlot: 'T_14_00' });
    const [s1, s2] = await Promise.all([createStudent(), createStudent()]);
    await createBooking(s1.id, { occurrenceId: a.id, type: 'OTHERS', reason: 'x' });
    await createBooking(s2.id, { occurrenceId: b.id, type: 'OTHERS', reason: 'y' });

    await cancelDay(faculty.id, addDays(dhakaToday(), 2), 'Unwell');

    const notes = await prisma.notification.findMany();
    expect(notes).toHaveLength(2);
    expect(new Set(notes.map((n) => n.occurrenceId))).toEqual(new Set([a.id, b.id]));
  });

  it('removing a student stores the reason on the booking and notifies only that student', async () => {
    const faculty = await createFaculty();
    const { occurrence } = await createConsultationOccurrence(faculty.id, { daysFromToday: 1, capacity: 3 });
    const [s1, s2] = await Promise.all([createStudent(), createStudent()]);
    const booking = await createBooking(s1.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'x' });
    await createBooking(s2.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'y' });

    await cancelBookingByFaculty(faculty.id, booking.id, 'Please book a thesis slot');

    expect((await prisma.booking.findUnique({ where: { id: booking.id } }))?.cancelReason).toBe('Please book a thesis slot');
    const notes = await prisma.notification.findMany();
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ studentId: s1.id, type: 'BOOKING_REMOVED', reason: 'Please book a thesis slot' });
  });

  it('a rejected cancellation (no reason) writes no notifications', async () => {
    const faculty = await createFaculty();
    const { occurrence } = await createConsultationOccurrence(faculty.id, { daysFromToday: 1, capacity: 3 });
    const student = await createStudent();
    await createBooking(student.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'x' });

    await expect(cancelOccurrence(faculty.id, occurrence.id)).rejects.toMatchObject({ code: 'REASON_REQUIRED' });
    expect(await prisma.notification.count()).toBe(0);
  });
});
