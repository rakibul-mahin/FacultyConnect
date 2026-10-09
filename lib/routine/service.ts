import 'server-only';
import { prisma } from '@/lib/db/prisma';
import {
  LAB_CONTINUATION_SLOT,
  LAB_VALID_START_SLOTS,
  THEORY_PAIRED_DAY,
  TIME_SLOTS,
  TIME_SLOT_LABELS,
  WEEKDAYS,
  WEEKDAY_LABELS,
  type WeekdayValue,
} from '@/lib/constants';
import type { Prisma, RoutineEntry } from '@prisma/client';
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

type Db = typeof prisma | Prisma.TransactionClient;

function findEntry(db: Db, facultyId: string, day: string, startSlot: string) {
  return db.routineEntry.findUnique({
    where: { facultyId_day_startSlot: { facultyId, day: day as never, startSlot: startSlot as never } },
  });
}

/** Clears a single slot. If the slot is part of a two-slot lab, clears both (§42). */
export async function clearSlot(facultyId: string, day: string, startSlot: string, db: Db = prisma) {
  const existing = await findEntry(db, facultyId, day, startSlot);
  if (!existing) return;

  if (existing.type === 'LAB' && existing.labGroupId) {
    await db.routineEntry.deleteMany({ where: { facultyId, labGroupId: existing.labGroupId } });
  } else {
    await db.routineEntry.delete({ where: { id: existing.id } });
  }
}

type TheoryFields = Pick<RoutineEntry, 'type' | 'courseCode' | 'section' | 'roomNumber'>;

function isSameTheory(a: TheoryFields, b: TheoryFields) {
  return (
    a.type === 'THEORY' &&
    b.type === 'THEORY' &&
    a.courseCode === b.courseCode &&
    a.section === b.section &&
    a.roomNumber === b.roomNumber
  );
}

function describeOccupant(entry: RoutineEntry) {
  if (entry.type === 'THEORY') return `${entry.courseCode}-${entry.section}`;
  if (entry.type === 'LAB') return 'a lab';
  return 'a consultation slot';
}

/**
 * Theory classes are mirrored onto the paired day (Sun-Tue, Mon-Wed,
 * Thu-Sat) at the same time. Clearing or editing a theory slot also updates
 * its partner, but only while the partner still holds the same class.
 */
async function upsertPairedTheory(
  facultyId: string,
  input: Extract<RoutineEntryInput, { type: 'THEORY' | 'EMPTY' }>,
  partnerDay: WeekdayValue
) {
  await prisma.$transaction(async (tx) => {
    const existing = await findEntry(tx, facultyId, input.day, input.startSlot);
    const partner = await findEntry(tx, facultyId, partnerDay, input.startSlot);
    const partnerIsLinked = Boolean(existing && partner && isSameTheory(existing, partner));

    if (input.type === 'EMPTY') {
      await clearSlot(facultyId, input.day, input.startSlot, tx);
      if (partnerIsLinked) await tx.routineEntry.delete({ where: { id: partner!.id } });
      return;
    }

    const theory = {
      type: 'THEORY' as const,
      courseCode: input.courseCode.toUpperCase(),
      section: input.section,
      roomNumber: input.roomNumber,
    };

    if (partner && !partnerIsLinked && !isSameTheory(partner, theory)) {
      throw new RoutineError(
        `${WEEKDAY_LABELS[partnerDay]} ${TIME_SLOT_LABELS[input.startSlot]} already has ${describeOccupant(partner)}. ` +
          `Clear it first — theory classes on ${WEEKDAY_LABELS[input.day]} and ${WEEKDAY_LABELS[partnerDay]} are kept in sync.`
      );
    }

    await clearSlot(facultyId, input.day, input.startSlot, tx);
    if (partner) await tx.routineEntry.delete({ where: { id: partner.id } });

    await tx.routineEntry.createMany({
      data: [input.day, partnerDay].map((day) => ({ facultyId, day, startSlot: input.startSlot, ...theory })),
    });
  });
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
  const partnerDay = THEORY_PAIRED_DAY[input.day];
  if (partnerDay && (input.type === 'THEORY' || input.type === 'EMPTY')) {
    await upsertPairedTheory(facultyId, input, partnerDay);
    return;
  }

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
