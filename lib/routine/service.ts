import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { LAB_CONTINUATION_SLOT, LAB_VALID_START_SLOTS, TIME_SLOTS, WEEKDAYS } from '@/lib/constants';
import type { RoutineEntryInput } from '@/lib/validation/routine';
import { randomUUID } from 'crypto';

export class RoutineError extends Error {}

export type RoutineGrid = Record<string, Record<string, RoutineCell | null>>;

export interface RoutineCell {
  id: string;
  type: 'THEORY' | 'LAB' | 'CONSULTATION';
  courseCode: string | null;
  section: string | null;
  roomNumber: string | null;
  coFaculty: string | null;
  capacity: number | null;
  labGroupId: string | null;
  isLabContinuation: boolean;
}

export async function getRoutineGrid(facultyId: string): Promise<RoutineGrid> {
  const entries = await prisma.routineEntry.findMany({ where: { facultyId } });
  const grid: RoutineGrid = {};
  for (const day of WEEKDAYS) {
    grid[day] = {};
    for (const slot of TIME_SLOTS) grid[day]![slot] = null;
  }
  for (const e of entries) {
    grid[e.day]![e.startSlot] = {
      id: e.id,
      type: e.type,
      courseCode: e.courseCode,
      section: e.section,
      roomNumber: e.roomNumber,
      coFaculty: e.coFaculty,
      capacity: e.capacity,
      labGroupId: e.labGroupId,
      isLabContinuation: e.isLabContinuation,
    };
  }
  return grid;
}

/** Clears a single slot. If the slot is part of a two-slot lab, clears both (§42). */
export async function clearSlot(facultyId: string, day: string, startSlot: string) {
  const existing = await prisma.routineEntry.findUnique({
    where: { facultyId_day_startSlot: { facultyId, day: day as never, startSlot: startSlot as never } },
  });
  if (!existing) return;

  if (existing.type === 'LAB' && existing.labGroupId) {
    await prisma.routineEntry.deleteMany({ where: { facultyId, labGroupId: existing.labGroupId } });
  } else {
    await prisma.routineEntry.delete({ where: { id: existing.id } });
  }
}

/**
 * Removes every routine entry for a faculty so they can start fresh. Like
 * clearSlot, this cascades to consultation occurrences and their bookings.
 */
export async function clearRoutine(facultyId: string): Promise<number> {
  const { count } = await prisma.routineEntry.deleteMany({ where: { facultyId } });
  return count;
}

export async function upsertEntry(facultyId: string, input: RoutineEntryInput) {
  if (input.type === 'EMPTY') {
    await clearSlot(facultyId, input.day, input.startSlot);
    return;
  }

  // Clear whatever currently occupies the slot (and its lab partner) first.
  await clearSlot(facultyId, input.day, input.startSlot);

  if (input.type === 'THEORY') {
    await prisma.routineEntry.create({
      data: {
        facultyId,
        day: input.day,
        startSlot: input.startSlot,
        type: 'THEORY',
        courseCode: input.courseCode.toUpperCase(),
        section: input.section,
        roomNumber: input.roomNumber,
      },
    });
    return;
  }

  if (input.type === 'CONSULTATION') {
    await prisma.routineEntry.create({
      data: {
        facultyId,
        day: input.day,
        startSlot: input.startSlot,
        type: 'CONSULTATION',
        capacity: input.capacity,
      },
    });
    return;
  }

  // LAB
  if (!LAB_VALID_START_SLOTS.includes(input.startSlot as never)) {
    throw new RoutineError('A lab can only start at 8:00 AM, 11:00 AM, or 2:00 PM.');
  }
  const continuation = LAB_CONTINUATION_SLOT[input.startSlot as keyof typeof LAB_CONTINUATION_SLOT];
  if (!continuation) {
    throw new RoutineError('Invalid lab start time.');
  }

  const conflicting = await prisma.routineEntry.findUnique({
    where: { facultyId_day_startSlot: { facultyId, day: input.day as never, startSlot: continuation as never } },
  });
  if (conflicting) {
    throw new RoutineError(
      'The next slot is already occupied. Clear it before creating a lab here — a lab automatically reserves both slots.'
    );
  }

  const labGroupId = randomUUID();
  await prisma.$transaction([
    prisma.routineEntry.create({
      data: {
        facultyId,
        day: input.day,
        startSlot: input.startSlot,
        type: 'LAB',
        courseCode: input.courseCode.toUpperCase(),
        section: input.section,
        coFaculty: input.coFaculty,
        roomNumber: input.roomNumber,
        labGroupId,
        isLabContinuation: false,
      },
    }),
    prisma.routineEntry.create({
      data: {
        facultyId,
        day: input.day,
        startSlot: continuation,
        type: 'LAB',
        courseCode: input.courseCode.toUpperCase(),
        section: input.section,
        coFaculty: input.coFaculty,
        roomNumber: input.roomNumber,
        labGroupId,
        isLabContinuation: true,
      },
    }),
  ]);
}
