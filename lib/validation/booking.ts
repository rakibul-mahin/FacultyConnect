import { z } from 'zod';

export const thesisBookingSchema = z.object({
  occurrenceId: z.string().uuid(),
  type: z.literal('THESIS_INTERNSHIP_PROJECT'),
  groupId: z.string().trim().min(1, 'Group ID is required').max(60),
  reason: z.string().trim().max(1000).optional(),
});

export const courseBookingSchema = z.object({
  occurrenceId: z.string().uuid(),
  type: z.literal('COURSE'),
  courseCode: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .regex(/^[A-Za-z]{2,4}\d{2,4}$/, 'Expected a course code like CSE110'),
  section: z.string().trim().min(1, 'Section is required').max(10),
  reason: z.string().trim().min(1, 'Reason is required').max(1000),
});

export const othersBookingSchema = z.object({
  occurrenceId: z.string().uuid(),
  type: z.literal('OTHERS'),
  reason: z.string().trim().min(1, 'Reason is required').max(1000),
});

export const bookingInputSchema = z.discriminatedUnion('type', [
  thesisBookingSchema,
  courseBookingSchema,
  othersBookingSchema,
]);

export type BookingInput = z.infer<typeof bookingInputSchema>;

export const markAttendanceSchema = z.object({
  bookingId: z.string().uuid(),
  status: z.enum(['PRESENT', 'ABSENT']),
});
