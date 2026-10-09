import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { resetDb, disconnectDb } from '../helpers/db';
import { createFaculty } from '../helpers/factories';
import { upsertEntry, getRoutineGrid, RoutineError } from '@/lib/routine/service';
import { prisma } from '@/lib/db/prisma';

beforeEach(resetDb);
afterAll(disconnectDb);

const theory = { type: 'THEORY' as const, courseCode: 'cse110', section: '13', roomNumber: '09H-35C' };

describe('routine service — theory day pairing (Sun-Tue, Mon-Wed, Thu-Sat)', () => {
  it.each([
    ['SUNDAY', 'TUESDAY'],
    ['WEDNESDAY', 'MONDAY'],
    ['SATURDAY', 'THURSDAY'],
  ] as const)('mirrors a theory class on %s onto %s', async (day, partner) => {
    const faculty = await createFaculty();
    await upsertEntry(faculty.id, { day, startSlot: 'T_14_00', ...theory });

    const grid = await getRoutineGrid(faculty.id);
    for (const d of [day, partner]) {
      expect(grid[d]?.T_14_00).toMatchObject({ type: 'THEORY', courseCode: 'CSE110', section: '13', roomNumber: '09H-35C' });
    }
  });

  it('does not mirror Friday theory classes', async () => {
    const faculty = await createFaculty();
    await upsertEntry(faculty.id, { day: 'FRIDAY', startSlot: 'T_08_00', ...theory });
    expect(await prisma.routineEntry.count({ where: { facultyId: faculty.id } })).toBe(1);
  });

  it('does not mirror consultations or labs', async () => {
    const faculty = await createFaculty();
    await upsertEntry(faculty.id, { day: 'SUNDAY', startSlot: 'T_17_00', type: 'CONSULTATION', capacity: 5 });
    await upsertEntry(faculty.id, {
      day: 'MONDAY',
      startSlot: 'T_08_00',
      type: 'LAB',
      courseCode: 'CSE427',
      section: '03',
      coFaculty: 'ITSSC',
      roomNumber: '09F-27L',
    });

    const grid = await getRoutineGrid(faculty.id);
    expect(grid.TUESDAY?.T_17_00).toBeNull();
    expect(grid.WEDNESDAY?.T_08_00).toBeNull();
    expect(grid.WEDNESDAY?.T_09_30).toBeNull();
  });

  it('keeps the pair in sync when editing and clearing', async () => {
    const faculty = await createFaculty();
    await upsertEntry(faculty.id, { day: 'SUNDAY', startSlot: 'T_11_00', ...theory });
    await upsertEntry(faculty.id, { day: 'TUESDAY', startSlot: 'T_11_00', ...theory, roomNumber: '10A-01C' });

    let grid = await getRoutineGrid(faculty.id);
    expect(grid.SUNDAY?.T_11_00?.roomNumber).toBe('10A-01C');
    expect(grid.TUESDAY?.T_11_00?.roomNumber).toBe('10A-01C');

    await upsertEntry(faculty.id, { day: 'SUNDAY', startSlot: 'T_11_00', type: 'EMPTY' });
    grid = await getRoutineGrid(faculty.id);
    expect(grid.SUNDAY?.T_11_00).toBeNull();
    expect(grid.TUESDAY?.T_11_00).toBeNull();
  });

  it('only clears the clicked slot when the partner holds a different class', async () => {
    const faculty = await createFaculty();
    await prisma.routineEntry.createMany({
      data: [
        { facultyId: faculty.id, day: 'MONDAY', startSlot: 'T_08_00', ...theory, courseCode: 'CSE110' },
        { facultyId: faculty.id, day: 'WEDNESDAY', startSlot: 'T_08_00', ...theory, courseCode: 'CSE220' },
      ],
    });

    await upsertEntry(faculty.id, { day: 'MONDAY', startSlot: 'T_08_00', type: 'EMPTY' });

    const grid = await getRoutineGrid(faculty.id);
    expect(grid.MONDAY?.T_08_00).toBeNull();
    expect(grid.WEDNESDAY?.T_08_00?.courseCode).toBe('CSE220');
  });

  it('blocks saving when the paired slot holds something else, and changes nothing', async () => {
    const faculty = await createFaculty();
    await upsertEntry(faculty.id, { day: 'TUESDAY', startSlot: 'T_14_00', type: 'CONSULTATION', capacity: 5 });

    await expect(upsertEntry(faculty.id, { day: 'SUNDAY', startSlot: 'T_14_00', ...theory })).rejects.toBeInstanceOf(
      RoutineError
    );

    const grid = await getRoutineGrid(faculty.id);
    expect(grid.SUNDAY?.T_14_00).toBeNull();
    expect(grid.TUESDAY?.T_14_00?.type).toBe('CONSULTATION');
  });
});
