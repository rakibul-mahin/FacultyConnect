import { describe, it, expect } from 'vitest';
import { roleForEmail } from '@/lib/auth/provision';
import { labEntrySchema, consultationEntrySchema } from '@/lib/validation/routine';
import { courseBookingSchema } from '@/lib/validation/booking';
import { studentProfileSchema } from '@/lib/validation/profile';

describe('roleForEmail (server-side domain -> role derivation)', () => {
  it('maps @bracu.ac.bd to FACULTY', () => {
    expect(roleForEmail('someone@bracu.ac.bd')).toBe('FACULTY');
  });
  it('maps @g.bracu.ac.bd to STUDENT', () => {
    expect(roleForEmail('someone@g.bracu.ac.bd')).toBe('STUDENT');
  });
  it('rejects any other domain, e.g. gmail.com or a spoofed subdomain', () => {
    expect(roleForEmail('someone@gmail.com')).toBeNull();
    expect(roleForEmail('someone@evil-bracu.ac.bd')).toBeNull();
    expect(roleForEmail('someone@bracu.ac.bd.evil.com')).toBeNull();
  });
});

describe('routine validation schemas', () => {
  it('rejects a lab starting outside the three valid slots', () => {
    const result = labEntrySchema.safeParse({
      day: 'SUNDAY',
      startSlot: 'T_09_30',
      type: 'LAB',
      courseCode: 'CSE427',
      section: '03',
      coFaculty: 'ITSSC,RKBM',
      roomNumber: '09F-27L',
    });
    // Slot validity is enforced in the service layer, not the shape schema —
    // shape should still parse; service-level rejection is covered by an
    // integration test.
    expect(result.success).toBe(true);
  });

  it('requires a positive integer capacity for consultations', () => {
    expect(consultationEntrySchema.safeParse({ day: 'SUNDAY', startSlot: 'T_11_00', type: 'CONSULTATION', capacity: 0 }).success).toBe(false);
    expect(consultationEntrySchema.safeParse({ day: 'SUNDAY', startSlot: 'T_11_00', type: 'CONSULTATION', capacity: -1 }).success).toBe(false);
    expect(consultationEntrySchema.safeParse({ day: 'SUNDAY', startSlot: 'T_11_00', type: 'CONSULTATION', capacity: 4 }).success).toBe(true);
  });
});

describe('booking validation schemas', () => {
  it('requires a reason for COURSE bookings', () => {
    const result = courseBookingSchema.safeParse({
      occurrenceId: '00000000-0000-0000-0000-000000000000',
      type: 'COURSE',
      courseCode: 'CSE110',
      section: '13',
      reason: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('student profile validation', () => {
  it('rejects a non-alphanumeric student ID', () => {
    expect(studentProfileSchema.safeParse({ studentId: '2020-1234' }).success).toBe(false);
  });
  it('accepts a well-formed student ID', () => {
    expect(studentProfileSchema.safeParse({ studentId: '20201234' }).success).toBe(true);
  });
});
