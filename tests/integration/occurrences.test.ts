import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { resetDb, disconnectDb } from '../helpers/db';
import { createFaculty, createStudent } from '../helpers/factories';
import { upsertEntry } from '@/lib/routine/service';
import { createBooking } from '@/lib/booking/service';
import { ensureOccurrences, BOOKING_WINDOW_DAYS } from '@/lib/booking/occurrences';
import { dhakaTomorrow, dhakaWeekdayOf } from '@/lib/timezone';
import { prisma } from '@/lib/db/prisma';
import { addDays } from 'date-fns';

beforeEach(resetDb);
afterAll(disconnectDb);

describe('ensureOccurrences — near-term only, no early/far-future booking (§4, §54)', () => {
  it('materializes exactly one occurrence — the next upcoming one — for a weekly consultation slot', async () => {
    const faculty = await createFaculty();
    await upsertEntry(faculty.id, { day: 'SUNDAY', startSlot: 'T_11_00', type: 'CONSULTATION', capacity: 4 });

    await ensureOccurrences(faculty.id);

    const occurrences = await prisma.consultationOccurrence.findMany({ where: { facultyId: faculty.id } });
    expect(occurrences).toHaveLength(1);
    const occ = occurrences[0]!;
    expect(dhakaWeekdayOf(occ.date)).toBe('SUNDAY');
    expect(occ.date.getTime()).toBeGreaterThanOrEqual(dhakaTomorrow().getTime());
    expect(occ.date.getTime()).toBeLessThanOrEqual(addDays(dhakaTomorrow(), BOOKING_WINDOW_DAYS - 1).getTime());
  });

  it('materializes exactly one occurrence per distinct weekday across multiple consultation slots', async () => {
    const faculty = await createFaculty();
    await upsertEntry(faculty.id, { day: 'SUNDAY', startSlot: 'T_11_00', type: 'CONSULTATION', capacity: 4 });
    await upsertEntry(faculty.id, { day: 'TUESDAY', startSlot: 'T_08_00', type: 'CONSULTATION', capacity: 2 });
    await upsertEntry(faculty.id, { day: 'FRIDAY', startSlot: 'T_17_00', type: 'CONSULTATION', capacity: 1 });

    await ensureOccurrences(faculty.id);

    const occurrences = await prisma.consultationOccurrence.findMany({ where: { facultyId: faculty.id } });
    expect(occurrences).toHaveLength(3);
    expect(new Set(occurrences.map((o) => dhakaWeekdayOf(o.date)))).toEqual(new Set(['SUNDAY', 'TUESDAY', 'FRIDAY']));
  });

  it('is idempotent — calling it twice does not create duplicate occurrences', async () => {
    const faculty = await createFaculty();
    await upsertEntry(faculty.id, { day: 'MONDAY', startSlot: 'T_17_00', type: 'CONSULTATION', capacity: 2 });

    await ensureOccurrences(faculty.id);
    const firstCount = await prisma.consultationOccurrence.count({ where: { facultyId: faculty.id } });
    await ensureOccurrences(faculty.id);
    const secondCount = await prisma.consultationOccurrence.count({ where: { facultyId: faculty.id } });

    expect(secondCount).toBe(firstCount);
    expect(firstCount).toBe(1);
  });

  it('never creates occurrences for THEORY or LAB entries', async () => {
    const faculty = await createFaculty();
    await upsertEntry(faculty.id, { day: 'TUESDAY', startSlot: 'T_08_00', type: 'THEORY', courseCode: 'CSE110', section: '13', roomNumber: 'X' });

    await ensureOccurrences(faculty.id);
    const count = await prisma.consultationOccurrence.count({ where: { facultyId: faculty.id } });
    expect(count).toBe(0);
  });

  it('self-heals: prunes a previously over-generated, unbooked far-future occurrence back down to just the next one', async () => {
    const faculty = await createFaculty();
    const entry = await prisma.routineEntry.create({
      data: { facultyId: faculty.id, day: 'WEDNESDAY', startSlot: 'T_15_30', type: 'CONSULTATION', capacity: 3 },
    });
    // Simulate a stale far-future occurrence from before the window was narrowed.
    const farFuture = await prisma.consultationOccurrence.create({
      data: { routineEntryId: entry.id, facultyId: faculty.id, date: addDays(dhakaTomorrow(), 60), startSlot: 'T_15_30', capacity: 3 },
    });

    await ensureOccurrences(faculty.id);

    const stillExists = await prisma.consultationOccurrence.findUnique({ where: { id: farFuture.id } });
    expect(stillExists).toBeNull();

    const remaining = await prisma.consultationOccurrence.findMany({ where: { facultyId: faculty.id } });
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.date.getTime()).toBeLessThanOrEqual(addDays(dhakaTomorrow(), BOOKING_WINDOW_DAYS - 1).getTime());
  });

  it('never prunes a far-future occurrence that already has a confirmed booking', async () => {
    const faculty = await createFaculty();
    const entry = await prisma.routineEntry.create({
      data: { facultyId: faculty.id, day: 'WEDNESDAY', startSlot: 'T_15_30', type: 'CONSULTATION', capacity: 3 },
    });
    const farFuture = await prisma.consultationOccurrence.create({
      data: { routineEntryId: entry.id, facultyId: faculty.id, date: addDays(dhakaTomorrow(), 60), startSlot: 'T_15_30', capacity: 3 },
    });
    const student = await createStudent();
    await createBooking(student.id, { occurrenceId: farFuture.id, type: 'OTHERS', reason: 'already booked before the policy change' });

    await ensureOccurrences(faculty.id);

    const stillExists = await prisma.consultationOccurrence.findUnique({ where: { id: farFuture.id } });
    expect(stillExists).not.toBeNull();
  });
});
