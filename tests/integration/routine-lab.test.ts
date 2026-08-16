import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { resetDb, disconnectDb } from '../helpers/db';
import { createFaculty } from '../helpers/factories';
import { upsertEntry, clearSlot, getRoutineGrid, RoutineError } from '@/lib/routine/service';
import { prisma } from '@/lib/db/prisma';

beforeEach(resetDb);
afterAll(disconnectDb);

describe('routine service — lab pairing and validation (§17-18, §42)', () => {
  it('automatically occupies the next slot when creating a lab at a valid start time', async () => {
    const faculty = await createFaculty();
    await upsertEntry(faculty.id, {
      day: 'SUNDAY',
      startSlot: 'T_08_00',
      type: 'LAB',
      courseCode: 'CSE427',
      section: '03',
      coFaculty: 'ITSSC,RKBM',
      roomNumber: '09F-27L',
    });

    const grid = await getRoutineGrid(faculty.id);
    expect(grid.SUNDAY?.T_08_00?.type).toBe('LAB');
    expect(grid.SUNDAY?.T_09_30?.type).toBe('LAB');
    expect(grid.SUNDAY?.T_09_30?.isLabContinuation).toBe(true);
    expect(grid.SUNDAY?.T_08_00?.labGroupId).toBe(grid.SUNDAY?.T_09_30?.labGroupId);
  });

  it('rejects a lab starting at an invalid time', async () => {
    const faculty = await createFaculty();
    await expect(
      upsertEntry(faculty.id, {
        day: 'SUNDAY',
        startSlot: 'T_09_30',
        type: 'LAB',
        courseCode: 'CSE427',
        section: '03',
        coFaculty: 'ITSSC,RKBM',
        roomNumber: '09F-27L',
      })
    ).rejects.toBeInstanceOf(RoutineError);
  });

  it('removes both slots when clearing either half of a lab', async () => {
    const faculty = await createFaculty();
    await upsertEntry(faculty.id, {
      day: 'WEDNESDAY',
      startSlot: 'T_11_00',
      type: 'LAB',
      courseCode: 'CSE110',
      section: '12',
      coFaculty: 'CQAE,RKBM',
      roomNumber: '09B-09L',
    });

    await clearSlot(faculty.id, 'WEDNESDAY', 'T_12_30'); // clear the continuation half

    const remaining = await prisma.routineEntry.count({ where: { facultyId: faculty.id } });
    expect(remaining).toBe(0);
  });

  it('does not let a lab silently overwrite an already-occupied continuation slot', async () => {
    const faculty = await createFaculty();
    await upsertEntry(faculty.id, { day: 'MONDAY', startSlot: 'T_12_30', type: 'THEORY', courseCode: 'CSE111', section: '13', roomNumber: '10B-15C' });

    await expect(
      upsertEntry(faculty.id, {
        day: 'MONDAY',
        startSlot: 'T_11_00',
        type: 'LAB',
        courseCode: 'CSE427',
        section: '03',
        coFaculty: 'ITSSC,RKBM',
        roomNumber: '09F-27L',
      })
    ).rejects.toBeInstanceOf(RoutineError);
  });

  it('does not mutate the co-faculty\'s own routine when creating a lab (§18)', async () => {
    const facultyA = await createFaculty({ initial: 'AAA' });
    const facultyB = await createFaculty({ initial: 'BBB' });

    await upsertEntry(facultyA.id, {
      day: 'SUNDAY',
      startSlot: 'T_08_00',
      type: 'LAB',
      courseCode: 'CSE427',
      section: '03',
      coFaculty: 'BBB',
      roomNumber: '09F-27L',
    });

    const facultyBEntries = await prisma.routineEntry.count({ where: { facultyId: facultyB.id } });
    expect(facultyBEntries).toBe(0);
  });
});
