import { describe, it, expect } from 'vitest';
import {
  bookingConfirmedForStudent,
  cancelledForStudent,
  newBookingForFaculty,
  studentCancelledForFaculty,
  esc,
  type BookingEmailData,
} from '@/lib/email/templates';

const base: BookingEmailData = {
  occurrenceId: 'occ-1',
  date: new Date(Date.UTC(2026, 10, 1)), // Sunday, 1 November 2026
  startSlot: 'T_11_00',
  type: 'COURSE',
  groupId: null,
  courseCode: 'CSE110',
  section: '08',
  reason: 'Loops and recursion before the midterm',
  student: { fullName: 'Ayesha Khan', studentId: '22101200', email: 'ayesha@g.bracu.ac.bd' },
  faculty: { fullName: 'Rakibul Hasan', initial: 'RKBM', seat: '4M117', email: 'rakibul@bracu.ac.bd', publicId: 'pub-1' },
  seats: { taken: 3, capacity: 6 },
};

describe('email templates', () => {
  it('student confirmation shows faculty, date, time, seat and topic — and no queue number', () => {
    const e = bookingConfirmedForStudent(base);
    expect(e.subject).toBe('Booked: consultation with Rakibul Hasan on Sun, 1 Nov');
    for (const part of ['Rakibul Hasan (RKBM)', 'Sunday, 1 November 2026', '11:00 AM', 'Seat 4M117', 'CSE110 · Section 08', 'Loops and recursion']) {
      expect(e.html).toContain(part);
      expect(e.text).toContain(part);
    }
    expect(e.html.toLowerCase()).not.toContain('queue');
    expect(e.html).toContain('/student/bookings');
    expect(e.html).toContain('/email/consultly-mark.png');
    expect(e.html).toContain('Developed and maintained by Redefyn');
  });

  it('faculty new-booking email lists the student details and seats taken', () => {
    const e = newBookingForFaculty(base);
    expect(e.subject).toBe('New booking: Ayesha Khan · Sun, 1 Nov, 11:00 AM');
    for (const part of ['22101200', 'ayesha@g.bracu.ac.bd', '3 of 6 seats', 'Loops and recursion']) expect(e.html).toContain(part);
    expect(e.html).toContain('/faculty/bookings/occ-1');
  });

  it('faculty email for a student cancellation names the student and the freed seat', () => {
    const e = studentCancelledForFaculty({ ...base, seats: { taken: 2, capacity: 6 } });
    expect(e.subject).toBe('Cancelled: Ayesha Khan · Sun, 1 Nov, 11:00 AM');
    expect(e.html).toContain('2 of 6 seats');
    expect(e.text).toContain('Their seat is free again.');
  });

  it('student cancellation wording depends on removal, slot or day, and includes the reason', () => {
    const removed = cancelledForStudent(base, 'Please book my Sunday slot', 'removed');
    const slot = cancelledForStudent(base, 'Unwell', 'slot');
    const day = cancelledForStudent(base, 'Meeting', 'day');
    expect(removed.text).toContain('removed your booking');
    expect(slot.text).toContain('cancelled the 11:00 AM consultation on Sunday, 1 November');
    expect(day.text).toContain('cancelled all consultations on Sunday, 1 November, including yours');
    expect(day.subject).toBe('Consultations on Sun, 1 Nov are cancelled');
    expect(removed.html).toContain('Please book my Sunday slot');
    expect(removed.html).toContain('/faculty/pub-1'); // "Book another slot"
  });

  it('escapes anything a person typed, so it cannot inject HTML', () => {
    const e = newBookingForFaculty({
      ...base,
      student: { ...base.student, fullName: '<img src=x onerror=alert(1)>' },
      reason: '<script>alert("x")</script>',
    });
    expect(e.html).not.toContain('<script>');
    expect(e.html).not.toContain('<img src=x');
    expect(e.html).toContain('&lt;script&gt;');
    expect(esc(`"'<>&`)).toBe('&quot;&#39;&lt;&gt;&amp;');
  });
});
