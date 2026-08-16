import { z } from 'zod';

export const facultyProfileSchema = z.object({
  initial: z
    .string()
    .trim()
    .min(2, 'Initial must be at least 2 characters')
    .max(10, 'Initial must be at most 10 characters')
    .regex(/^[A-Za-z]+$/, 'Initial must be letters only'),
  seat: z
    .string()
    .trim()
    .min(1, 'Seat number is required')
    .max(20, 'Seat number is too long'),
});

export type FacultyProfileInput = z.infer<typeof facultyProfileSchema>;

export const studentProfileSchema = z.object({
  studentId: z
    .string()
    .trim()
    .min(4, 'Student ID looks too short')
    .max(20, 'Student ID looks too long')
    .regex(/^[A-Za-z0-9]+$/, 'Student ID must be alphanumeric'),
});

export type StudentProfileInput = z.infer<typeof studentProfileSchema>;
