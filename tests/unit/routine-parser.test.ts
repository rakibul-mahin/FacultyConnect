import { describe, it, expect } from 'vitest';
import { parseRoutineClipboard } from '@/lib/parser/routine-parser';

// Mirrors real Google Sheets/Excel clipboard TSV: a field containing a
// literal newline (a multi-line cell) is wrapped in double quotes, with any
// literal quote inside doubled — RFC4180-style.
function csvField(value: string): string {
  if (value.includes('\n') || value.includes('\t') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildGrid(rows: string[][]): string {
  return rows.map((cols) => cols.map(csvField).join('\t')).join('\n');
}

const EMPTY_ROW = Array(9).fill('');

describe('parseRoutineClipboard', () => {
  it('rejects input with the wrong number of rows', () => {
    const result = parseRoutineClipboard('a\tb\nc\td');
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.cells).toHaveLength(0);
  });

  it('rejects a row with the wrong number of columns', () => {
    const rows = Array.from({ length: 7 }, () => [...EMPTY_ROW]);
    rows[0] = ['a', 'b']; // too few columns
    const result = parseRoutineClipboard(buildGrid(rows));
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('parses a THEORY cell', () => {
    const rows = Array.from({ length: 7 }, () => [...EMPTY_ROW]);
    rows[1]![4] = 'CSE110-13\n09H-35C'; // Sunday, 2:00 PM
    const result = parseRoutineClipboard(buildGrid(rows));
    expect(result.errors).toHaveLength(0);
    const cell = result.cells.find((c) => c.day === 'SUNDAY' && c.startSlot === 'T_14_00');
    expect(cell?.type).toBe('THEORY');
    expect(cell?.courseCode).toBe('CSE110');
    expect(cell?.section).toBe('13');
    expect(cell?.roomNumber).toBe('09H-35C');
  });

  it('parses a paired LAB cell into a start cell and an absorbed continuation cell', () => {
    const rows = Array.from({ length: 7 }, () => [...EMPTY_ROW]);
    rows[1]![0] = 'CSE427-03 (LAB)\nITSSC,RKBM\n09F-27L'; // Sunday, 8:00 AM
    rows[1]![1] = 'CSE427-03 (LAB)\nITSSC,RKBM\n09F-27L'; // Sunday, 9:30 AM (duplicate, per official sheet format)
    const result = parseRoutineClipboard(buildGrid(rows));
    expect(result.errors).toHaveLength(0);

    const start = result.cells.find((c) => c.day === 'SUNDAY' && c.startSlot === 'T_08_00');
    const continuation = result.cells.find((c) => c.day === 'SUNDAY' && c.startSlot === 'T_09_30');

    expect(start?.type).toBe('LAB');
    expect(start?.courseCode).toBe('CSE427');
    expect(start?.coFaculty).toBe('ITSSC,RKBM');
    expect(continuation?.isLabContinuationCell).toBe(true);
  });

  it('flags a lab starting at an invalid time as NEEDS_REVIEW', () => {
    const rows = Array.from({ length: 7 }, () => [...EMPTY_ROW]);
    rows[1]![1] = 'CSE427-03 (LAB)\nITSSC,RKBM\n09F-27L'; // 9:30 AM — not a valid lab start
    const result = parseRoutineClipboard(buildGrid(rows));
    const cell = result.cells.find((c) => c.day === 'SUNDAY' && c.startSlot === 'T_09_30');
    expect(cell?.type).toBe('NEEDS_REVIEW');
    expect(cell?.issue).toMatch(/cannot start/i);
  });

  it('flags a lab whose continuation slot already holds conflicting data', () => {
    const rows = Array.from({ length: 7 }, () => [...EMPTY_ROW]);
    rows[1]![0] = 'CSE427-03 (LAB)\nITSSC,RKBM\n09F-27L';
    rows[1]![1] = 'CSE110-13\n09H-35C'; // conflicting theory in the forced continuation slot
    const result = parseRoutineClipboard(buildGrid(rows));
    const start = result.cells.find((c) => c.day === 'SUNDAY' && c.startSlot === 'T_08_00');
    expect(start?.type).toBe('NEEDS_REVIEW');
  });

  it('flags unrecognized content as NEEDS_REVIEW instead of guessing', () => {
    const rows = Array.from({ length: 7 }, () => [...EMPTY_ROW]);
    rows[2]![2] = 'this is not a valid entry format';
    const result = parseRoutineClipboard(buildGrid(rows));
    const cell = result.cells.find((c) => c.day === 'MONDAY' && c.startSlot === 'T_11_00');
    expect(cell?.type).toBe('NEEDS_REVIEW');
    expect(cell?.rawText).toBe('this is not a valid entry format');
  });

  it('treats a bare "Consultation" cell as a CONSULTATION slot', () => {
    const rows = Array.from({ length: 7 }, () => [...EMPTY_ROW]);
    rows[1]![2] = 'Consultation';
    const result = parseRoutineClipboard(buildGrid(rows));
    const cell = result.cells.find((c) => c.day === 'SUNDAY' && c.startSlot === 'T_11_00');
    expect(cell?.type).toBe('CONSULTATION');
  });

  it('treats an empty cell as EMPTY', () => {
    const rows = Array.from({ length: 7 }, () => [...EMPTY_ROW]);
    const result = parseRoutineClipboard(buildGrid(rows));
    expect(result.cells.every((c) => c.type === 'EMPTY')).toBe(true);
  });
});
