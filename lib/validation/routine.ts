import { z } from 'zod';
import { WEEKDAYS, TIME_SLOTS } from '@/lib/constants';

export const weekdaySchema = z.enum(WEEKDAYS);
export const timeSlotSchema = z.enum(TIME_SLOTS);

const courseCode = z
  .string()
  .trim()
  .min(2, 'Course code is required')
  .max(20)
  .regex(/^[A-Za-z]{2,4}\d{2,4}$/, 'Expected a course code like CSE110');

const section = z.string().trim().min(1, 'Section is required').max(10);
const roomNumber = z.string().trim().min(1, 'Room number is required').max(20);
const coFaculty = z.string().trim().min(1, 'Co-faculty initial is required').max(40);

export const theoryEntrySchema = z.object({
  day: weekdaySchema,
  startSlot: timeSlotSchema,
  type: z.literal('THEORY'),
  courseCode,
  section,
  roomNumber,
});

export const labEntrySchema = z.object({
  day: weekdaySchema,
  startSlot: timeSlotSchema,
  type: z.literal('LAB'),
  courseCode,
  section,
  coFaculty,
  roomNumber,
});

export const consultationEntrySchema = z.object({
  day: weekdaySchema,
  startSlot: timeSlotSchema,
  type: z.literal('CONSULTATION'),
  capacity: z.coerce.number().int().positive('Capacity must be a positive number').max(500),
});

export const clearEntrySchema = z.object({
  day: weekdaySchema,
  startSlot: timeSlotSchema,
  type: z.literal('EMPTY'),
});

export const routineEntryInputSchema = z.discriminatedUnion('type', [
  theoryEntrySchema,
  labEntrySchema,
  consultationEntrySchema,
  clearEntrySchema,
]);

export type RoutineEntryInput = z.infer<typeof routineEntryInputSchema>;

export const cancelOccurrenceSchema = z.object({
  occurrenceId: z.string().uuid(),
  reason: z.string().trim().max(500).optional(),
});

export const cancelDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().trim().max(500).optional(),
});
