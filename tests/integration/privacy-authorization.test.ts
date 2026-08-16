import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { resetDb, disconnectDb } from '../helpers/db';
import { createFaculty, createStudent, createConsultationOccurrence } from '../helpers/factories';
import { createBooking, cancelOccurrence, markAttendance } from '@/lib/booking/service';
import { getBookableOccurrences, getFacultyOccurrenceRoster, getStudentBookings } from '@/lib/booking/queries';
import { BookingError } from '@/lib/booking/errors';

beforeEach(resetDb);
afterAll(disconnectDb);

describe('privacy & authorization (§20, §23, §27-28, §45, §53)', () => {
  it('never exposes booking identities or reasons through the public/student occurrence list', async () => {
    const faculty = await createFaculty();
    const { occurrence } = await createConsultationOccurrence(faculty.id, { daysFromToday: 1, capacity: 4 });
    const student = await createStudent();
    await createBooking(student.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'a very private reason' });

    const publicList = await getBookableOccurrences(faculty.id, occurrence.date, occurrence.date);
    const serialized = JSON.stringify(publicList);

    expect(serialized).not.toContain('a very private reason');
    expect(serialized).not.toContain(student.email);
    expect(serialized).not.toContain(student.studentId);
    // Only aggregate counts are exposed.
    expect(publicList[0]).toMatchObject({ bookedCount: 1, capacity: 4 });
  });

  it('shows the booking student their own position ("#N of capacity") without exposing others', async () => {
    const faculty = await createFaculty();
    const { occurrence } = await createConsultationOccurrence(faculty.id, { daysFromToday: 1, capacity: 4 });
    const [s1, s2] = await Promise.all([createStudent(), createStudent()]);
    await createBooking(s1.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'x' });
    await createBooking(s2.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'y' });

    const asS2 = await getBookableOccurrences(faculty.id, occurrence.date, occurrence.date, s2.id);
    expect(asS2[0]?.myBookingPosition).toBe(2);

    const asOutsider = await getBookableOccurrences(faculty.id, occurrence.date, occurrence.date);
    expect(asOutsider[0]?.myBookingPosition).toBeNull();
  });

  it('gives the owning faculty full roster detail including private reason', async () => {
    const faculty = await createFaculty();
    const { occurrence } = await createConsultationOccurrence(faculty.id, { daysFromToday: 1, capacity: 4 });
    const student = await createStudent();
    await createBooking(student.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'a very private reason' });

    const roster = await getFacultyOccurrenceRoster(faculty.id, occurrence.id);
    expect(roster.bookings[0]?.reason).toBe('a very private reason');
    expect(roster.bookings[0]?.student.email).toBe(student.email);
  });

  it('refuses roster access to a faculty member who does not own the occurrence', async () => {
    const facultyA = await createFaculty();
    const facultyB = await createFaculty();
    const { occurrence } = await createConsultationOccurrence(facultyA.id, { daysFromToday: 1, capacity: 4 });

    await expect(getFacultyOccurrenceRoster(facultyB.id, occurrence.id)).rejects.toBeInstanceOf(BookingError);
    await expect(getFacultyOccurrenceRoster(facultyB.id, occurrence.id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('refuses cancellation by a faculty member who does not own the occurrence', async () => {
    const facultyA = await createFaculty();
    const facultyB = await createFaculty();
    const { occurrence } = await createConsultationOccurrence(facultyA.id, { daysFromToday: 1, capacity: 4 });

    await expect(cancelOccurrence(facultyB.id, occurrence.id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('refuses attendance marking by a faculty member who does not own the booking', async () => {
    const facultyA = await createFaculty();
    const facultyB = await createFaculty();
    const { occurrence } = await createConsultationOccurrence(facultyA.id, { daysFromToday: 1, capacity: 4 });
    const student = await createStudent();
    const booking = await createBooking(student.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'x' });

    await expect(markAttendance(facultyB.id, booking.id, 'PRESENT')).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it("does not leak one student's bookings into another student's booking list", async () => {
    const faculty = await createFaculty();
    const { occurrence } = await createConsultationOccurrence(faculty.id, { daysFromToday: 1, capacity: 4 });
    const [s1, s2] = await Promise.all([createStudent(), createStudent()]);
    await createBooking(s1.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'student 1 secret' });

    const s2Bookings = await getStudentBookings(s2.id, { upcoming: true });
    expect(s2Bookings).toHaveLength(0);

    const s1Bookings = await getStudentBookings(s1.id, { upcoming: true });
    expect(s1Bookings).toHaveLength(1);
    expect(s1Bookings[0]?.reason).toBe('student 1 secret');
  });
});
