import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { resetDb, disconnectDb } from '../helpers/db';
import { createFaculty } from '../helpers/factories';
import { upsertEntry } from '@/lib/routine/service';
import { buildImportDiff, applyRoutineImport } from '@/lib/routine/import';
import { parseRoutineClipboard } from '@/lib/parser/routine-parser';
import { prisma } from '@/lib/db/prisma';

beforeEach(resetDb);
afterAll(disconnectDb);

// Mirrors real Google Sheets/Excel clipboard TSV: a field containing a
// literal newline (a multi-line cell) is wrapped in double quotes.
function csvField(value: string): string {
  if (value.includes('\n') || value.includes('\t') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const EMPTY_ROW = Array(9).fill('');
function buildGrid(overrides: Record<number, Record<number, string>>): string {
  const rows = Array.from({ length: 7 }, () => [...EMPTY_ROW]);
  for (const [r, cols] of Object.entries(overrides)) {
    for (const [c, val] of Object.entries(cols)) rows[Number(r)]![Number(c)] = val;
  }
  return rows.map((cols) => cols.map(csvField).join('\t')).join('\n');
}

describe('routine import — diff & confirm (§40-42)', () => {
  it('classifies a brand-new slot as ADDED and an unrelated slot as UNCHANGED', async () => {
    const faculty = await createFaculty();
    const raw = buildGrid({ 1: { 4: 'CSE110-13\n09H-35C' } }); // Sunday 2:00 PM
    const { cells, errors } = parseRoutineClipboard(raw);
    expect(errors).toHaveLength(0);

    const diff = await buildImportDiff(faculty.id, cells);
    const added = diff.find((d) => d.day === 'SUNDAY' && d.startSlot === 'T_14_00');
    const unchanged = diff.find((d) => d.day === 'SATURDAY' && d.startSlot === 'T_08_00');

    expect(added?.status).toBe('ADDED');
    expect(unchanged?.status).toBe('UNCHANGED');
  });

  it('classifies a modified slot as CHANGED against the existing routine', async () => {
    const faculty = await createFaculty();
    await upsertEntry(faculty.id, { day: 'SUNDAY', startSlot: 'T_14_00', type: 'THEORY', courseCode: 'CSE110', section: '13', roomNumber: 'OLD-ROOM' });

    const raw = buildGrid({ 1: { 4: 'CSE110-13\nNEW-ROOM' } });
    const { cells } = parseRoutineClipboard(raw);
    const diff = await buildImportDiff(faculty.id, cells);
    const changed = diff.find((d) => d.day === 'SUNDAY' && d.startSlot === 'T_14_00');
    expect(changed?.status).toBe('CHANGED');
  });

  it('classifies a slot missing from the paste as REMOVED', async () => {
    const faculty = await createFaculty();
    await upsertEntry(faculty.id, { day: 'FRIDAY', startSlot: 'T_19_30', type: 'THEORY', courseCode: 'CSE110', section: '13', roomNumber: 'ROOM' });

    const raw = buildGrid({}); // nothing pasted anywhere
    const { cells } = parseRoutineClipboard(raw);
    const diff = await buildImportDiff(faculty.id, cells);
    const removed = diff.find((d) => d.day === 'FRIDAY' && d.startSlot === 'T_19_30');
    expect(removed?.status).toBe('REMOVED');
  });

  it('does not write anything until applyRoutineImport is explicitly called (preview is read-only)', async () => {
    const faculty = await createFaculty();
    const raw = buildGrid({ 1: { 4: 'CSE110-13\n09H-35C' } });
    const { cells } = parseRoutineClipboard(raw);
    await buildImportDiff(faculty.id, cells);

    const count = await prisma.routineEntry.count({ where: { facultyId: faculty.id } });
    expect(count).toBe(0);
  });

  it('applies decided rows and skips NEEDS_REVIEW rows, leaving the prior value untouched', async () => {
    const faculty = await createFaculty();
    await upsertEntry(faculty.id, { day: 'MONDAY', startSlot: 'T_11_00', type: 'THEORY', courseCode: 'CSE111', section: '01', roomNumber: 'KEEP-ME' });

    const raw = buildGrid({
      1: { 4: 'CSE110-13\n09H-35C' }, // Sunday 2:00 — valid, should be applied
      2: { 2: 'garbage that does not parse' }, // Monday 11:00 — needs review, should be skipped
    });
    const { cells } = parseRoutineClipboard(raw);
    await applyRoutineImport(faculty.id, cells);

    const sunday = await prisma.routineEntry.findUnique({
      where: { facultyId_day_startSlot: { facultyId: faculty.id, day: 'SUNDAY', startSlot: 'T_14_00' } },
    });
    expect(sunday?.courseCode).toBe('CSE110');

    const monday = await prisma.routineEntry.findUnique({
      where: { facultyId_day_startSlot: { facultyId: faculty.id, day: 'MONDAY', startSlot: 'T_11_00' } },
    });
    expect(monday?.courseCode).toBe('CSE111');
    expect(monday?.roomNumber).toBe('KEEP-ME');
  });

  it('imports a lab as a paired two-slot entry', async () => {
    const faculty = await createFaculty();
    const raw = buildGrid({
      1: {
        0: 'CSE427-03 (LAB)\nITSSC,RKBM\n09F-27L',
        1: 'CSE427-03 (LAB)\nITSSC,RKBM\n09F-27L',
      },
    });
    const { cells } = parseRoutineClipboard(raw);
    await applyRoutineImport(faculty.id, cells);

    const start = await prisma.routineEntry.findUnique({
      where: { facultyId_day_startSlot: { facultyId: faculty.id, day: 'SUNDAY', startSlot: 'T_08_00' } },
    });
    const continuation = await prisma.routineEntry.findUnique({
      where: { facultyId_day_startSlot: { facultyId: faculty.id, day: 'SUNDAY', startSlot: 'T_09_30' } },
    });
    expect(start?.type).toBe('LAB');
    expect(continuation?.type).toBe('LAB');
    expect(start?.labGroupId).toBe(continuation?.labGroupId);
  });
});
