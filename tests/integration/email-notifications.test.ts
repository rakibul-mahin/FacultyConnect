import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { addDays } from 'date-fns';
import { resetDb, disconnectDb } from '../helpers/db';
import { createFaculty, createStudent, createConsultationOccurrence } from '../helpers/factories';
import { dhakaToday } from '@/lib/timezone';
import type { OutgoingEmail } from '@/lib/email/client';

// Capture outgoing emails instead of sending them.
const sent: OutgoingEmail[] = [];
const sendEmail = vi.fn(async (email: OutgoingEmail) => {
  sent.push(email);
  return true;
});
vi.mock('@/lib/email/client', () => ({ sendEmail: (e: OutgoingEmail) => sendEmail(e) }));

const { createBooking, cancelBookingByStudent, cancelBookingByFaculty, cancelOccurrence, cancelDay } = await import(
  '@/lib/booking/service'
);

beforeEach(async () => {
  await resetDb();
  sent.length = 0;
  sendEmail.mockClear();
});
afterAll(disconnectDb);

async function setup(capacity = 4) {
  const faculty = await createFaculty({ fullName: 'Rakibul Hasan', email: 'rakibul@bracu.ac.bd' });
  const { occurrence } = await createConsultationOccurrence(faculty.id, { daysFromToday: 1, capacity });
  return { faculty, occurrence };
}

describe('booking and cancellation emails', () => {
  it('a booking emails the student and the faculty member, each replying to the other', async () => {
    const { occurrence } = await setup();
    const student = await createStudent({ fullName: 'Ayesha Khan', email: 'ayesha@g.bracu.ac.bd' });
    await createBooking(student.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'Advising' });

    expect(sent).toHaveLength(2);
    const toStudent = sent.find((e) => e.to === 'ayesha@g.bracu.ac.bd')!;
    const toFaculty = sent.find((e) => e.to === 'rakibul@bracu.ac.bd')!;
    expect(toStudent.subject).toMatch(/^Booked: consultation with Rakibul Hasan/);
    expect(toStudent.replyTo).toBe('rakibul@bracu.ac.bd');
    expect(toFaculty.subject).toMatch(/^New booking: Ayesha Khan/);
    expect(toFaculty.replyTo).toBe('ayesha@g.bracu.ac.bd');
    expect(toFaculty.html).toContain('1 of 4 seats');
  });

  it('a student cancelling emails only the faculty member', async () => {
    const { occurrence } = await setup();
    const student = await createStudent({ email: 'ayesha@g.bracu.ac.bd' });
    const booking = await createBooking(student.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'x' });
    sent.length = 0;

    await cancelBookingByStudent(student.id, booking.id);

    expect(sent.map((e) => e.to)).toEqual(['rakibul@bracu.ac.bd']);
    expect(sent[0]!.subject).toMatch(/^Cancelled: /);
    expect(sent[0]!.html).toContain('0 of 4 seats');
  });

  it('faculty removing a student emails only that student, with the reason', async () => {
    const { faculty, occurrence } = await setup();
    const [s1, s2] = await Promise.all([createStudent({ email: 's1@g.bracu.ac.bd' }), createStudent({ email: 's2@g.bracu.ac.bd' })]);
    const b1 = await createBooking(s1.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'x' });
    await createBooking(s2.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'y' });
    sent.length = 0;

    await cancelBookingByFaculty(faculty.id, b1.id, 'Please book my Sunday slot');

    expect(sent.map((e) => e.to)).toEqual(['s1@g.bracu.ac.bd']);
    expect(sent[0]!.html).toContain('Please book my Sunday slot');
    expect(sent[0]!.text).toContain('removed your booking');
  });

  it('faculty cancelling a slot emails every booked student, not ones who already cancelled', async () => {
    const { faculty, occurrence } = await setup();
    const [s1, s2, s3] = await Promise.all([
      createStudent({ email: 's1@g.bracu.ac.bd' }),
      createStudent({ email: 's2@g.bracu.ac.bd' }),
      createStudent({ email: 's3@g.bracu.ac.bd' }),
    ]);
    await createBooking(s1.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'a' });
    await createBooking(s2.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'b' });
    const gone = await createBooking(s3.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'c' });
    await cancelBookingByStudent(s3.id, gone.id);
    sent.length = 0;

    await cancelOccurrence(faculty.id, occurrence.id, 'Unwell');

    expect(sent.map((e) => e.to).sort()).toEqual(['s1@g.bracu.ac.bd', 's2@g.bracu.ac.bd']);
    expect(sent.every((e) => e.text.includes('cancelled the 11:00 AM consultation') && e.html.includes('Unwell'))).toBe(true);
  });

  it('faculty cancelling a day emails every student booked that day, with day wording', async () => {
    const faculty = await createFaculty({ email: 'f@bracu.ac.bd' });
    const { occurrence: a } = await createConsultationOccurrence(faculty.id, { daysFromToday: 2, capacity: 3, startSlot: 'T_11_00' });
    const { occurrence: b } = await createConsultationOccurrence(faculty.id, { daysFromToday: 2, capacity: 3, startSlot: 'T_14_00' });
    const [s1, s2] = await Promise.all([createStudent({ email: 's1@g.bracu.ac.bd' }), createStudent({ email: 's2@g.bracu.ac.bd' })]);
    await createBooking(s1.id, { occurrenceId: a.id, type: 'OTHERS', reason: 'x' });
    await createBooking(s2.id, { occurrenceId: b.id, type: 'OTHERS', reason: 'y' });
    sent.length = 0;

    await cancelDay(faculty.id, addDays(dhakaToday(), 2), 'Meeting');

    expect(sent.map((e) => e.to).sort()).toEqual(['s1@g.bracu.ac.bd', 's2@g.bracu.ac.bd']);
    expect(sent.every((e) => /^Consultations on .* are cancelled$/.test(e.subject))).toBe(true);
  });

  it('a failing email never fails or undoes the booking', async () => {
    const { occurrence } = await setup();
    const student = await createStudent();
    sendEmail.mockRejectedValueOnce(new Error('network down'));
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});

    const booking = await createBooking(student.id, { occurrenceId: occurrence.id, type: 'OTHERS', reason: 'x' });

    expect(booking.status).toBe('CONFIRMED');
    errors.mockRestore();
  });
});
