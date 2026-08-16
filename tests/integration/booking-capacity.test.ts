import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { resetDb, disconnectDb } from '../helpers/db';
import { createFaculty, createStudent, createConsultationOccurrence } from '../helpers/factories';
import { createBooking } from '@/lib/booking/service';
import { prisma } from '@/lib/db/prisma';

beforeEach(resetDb);
afterAll(disconnectDb);

describe('createBooking — capacity, duplicates, and deadline (§20, §24, §26, §43)', () => {
  it('allows booking up to capacity, then rejects the next student with FULL', async () => {
    const faculty = await createFaculty();
    const { occurrence } = await createConsultationOccurrence(faculty.id, { daysFromToday: 1, capacity: 2 });
    const [s1, s2, s3] = await Promise.all([createStudent(), createStudent(), createStudent()]);

    await createBooking(s1.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'a' });
    await createBooking(s2.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'b' });

    await expect(createBooking(s3.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'c' })).rejects.toMatchObject({
      code: 'FULL',
    });

    const count = await prisma.booking.count({ where: { occurrenceId: occurrence.id, status: 'CONFIRMED' } });
    expect(count).toBe(2);
  });

  it('rejects a second booking by the same student for the same occurrence (unique constraint)', async () => {
    const faculty = await createFaculty();
    const { occurrence } = await createConsultationOccurrence(faculty.id, { daysFromToday: 1, capacity: 4 });
    const student = await createStudent();

    await createBooking(student.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'first' });
    await expect(createBooking(student.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'second' })).rejects.toMatchObject({
      code: 'DUPLICATE',
    });
  });

  it('allows the same student to book multiple different slots and multiple faculty (§26)', async () => {
    const facultyA = await createFaculty();
    const facultyB = await createFaculty();
    const { occurrence: occA } = await createConsultationOccurrence(facultyA.id, { daysFromToday: 1, capacity: 4, startSlot: 'T_11_00' });
    const { occurrence: occB } = await createConsultationOccurrence(facultyA.id, { daysFromToday: 2, capacity: 4, startSlot: 'T_12_30' });
    const { occurrence: occC } = await createConsultationOccurrence(facultyB.id, { daysFromToday: 1, capacity: 4, startSlot: 'T_08_00' });
    const student = await createStudent();

    await createBooking(student.id, { occurrenceId: occA.id, type: 'OTHERS', reason: 'x' });
    await createBooking(student.id, { occurrenceId: occB.id, type: 'OTHERS', reason: 'y' });
    await createBooking(student.id, { occurrenceId: occC.id, type: 'OTHERS', reason: 'z' });

    const count = await prisma.booking.count({ where: { studentId: student.id, status: 'CONFIRMED' } });
    expect(count).toBe(3);
  });

  it('rejects booking today\'s consultation (calendar-day rule, §24)', async () => {
    const faculty = await createFaculty();
    const { occurrence } = await createConsultationOccurrence(faculty.id, { daysFromToday: 0, capacity: 4 });
    const student = await createStudent();

    await expect(createBooking(student.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'x' })).rejects.toMatchObject({
      code: 'TODAY_NOT_BOOKABLE',
    });
  });

  it('allows booking tomorrow\'s consultation', async () => {
    const faculty = await createFaculty();
    const { occurrence } = await createConsultationOccurrence(faculty.id, { daysFromToday: 1, capacity: 4 });
    const student = await createStudent();

    const booking = await createBooking(student.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'x' });
    expect(booking.status).toBe('CONFIRMED');
  });

  it('rejects booking a cancelled occurrence', async () => {
    const faculty = await createFaculty();
    const { occurrence } = await createConsultationOccurrence(faculty.id, { daysFromToday: 1, capacity: 4 });
    await prisma.consultationOccurrence.update({ where: { id: occurrence.id }, data: { status: 'CANCELLED' } });
    const student = await createStudent();

    await expect(createBooking(student.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'x' })).rejects.toMatchObject({
      code: 'CANCELLED',
    });
  });
});
