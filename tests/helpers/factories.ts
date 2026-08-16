import { prisma } from '@/lib/db/prisma';
import { addDays } from 'date-fns';
import { dhakaToday, dhakaWeekdayOf } from '@/lib/timezone';
import type { TimeSlot } from '@prisma/client';

let counter = 0;
function uniq(prefix: string) {
  counter += 1;
  return `${prefix}${counter}`;
}

export async function createFaculty(overrides: Partial<{ email: string; fullName: string; initial: string; seat: string }> = {}) {
  const email = overrides.email ?? `${uniq('faculty')}@bracu.ac.bd`;
  const user = await prisma.user.create({ data: { email, role: 'FACULTY' } });
  return prisma.facultyProfile.create({
    data: {
      userId: user.id,
      fullName: overrides.fullName ?? 'Test Faculty',
      email,
      initial: overrides.initial ?? 'TF',
      seat: overrides.seat ?? '1A1',
    },
  });
}

export async function createStudent(overrides: Partial<{ email: string; fullName: string; studentId: string }> = {}) {
  const email = overrides.email ?? `${uniq('student')}@g.bracu.ac.bd`;
  const user = await prisma.user.create({ data: { email, role: 'STUDENT' } });
  return prisma.studentProfile.create({
    data: {
      userId: user.id,
      fullName: overrides.fullName ?? 'Test Student',
      email,
      studentId: overrides.studentId ?? uniq('S'),
    },
  });
}

/** Creates a CONSULTATION RoutineEntry for `daysFromToday`'s weekday and materializes that one occurrence. */
export async function createConsultationOccurrence(facultyId: string, opts: { daysFromToday: number; capacity: number; startSlot?: TimeSlot }) {
  const date = addDays(dhakaToday(), opts.daysFromToday);
  const day = dhakaWeekdayOf(date);
  const startSlot = opts.startSlot ?? 'T_11_00';

  const entry = await prisma.routineEntry.create({
    data: { facultyId, day: day as never, startSlot, type: 'CONSULTATION', capacity: opts.capacity },
  });

  const occurrence = await prisma.consultationOccurrence.create({
    data: { routineEntryId: entry.id, facultyId, date, startSlot, capacity: opts.capacity },
  });

  return { entry, occurrence };
}
