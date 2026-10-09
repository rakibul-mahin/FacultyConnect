import { describe, it, expect } from 'vitest';
import { parseRoutineClipboard, parseRoutineTable } from '@/lib/parser/routine-parser';
import { readSpreadsheet } from '@/lib/parser/read-spreadsheet';

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

// The official labeled format as faculty paste it: a "Day \ Time" header,
// day labels, "—" for empty cells, and each cell's lines following one
// another rather than one tab-separated field per cell.
const LABELED_PASTE = [
  'Day \\ Time\t8:00 AM',
  '8:00 - 9:20\t9:30 AM',
  '9:30 - 10:50\t11:00 AM',
  '11:00 - 12:20\t12:30 PM',
  '12:30 - 1:50\t2:00 PM',
  '2:00 - 3:20\t3:30 PM',
  '3:30 - 4:50\t6:00 PM',
  '6:00 - 7:20',
  'SAT\t', '—', '—', '—', '—', '—', '—', '—',
  'SUN\t', '—', '—', '—', '—', 'CSE427-07', '09A-02C', 'CSE111-11', '09A-02C', '—',
  'MON\t', '—', '—', '—', '—', 'CSE110-07', 'AN2-03C', 'CSE110-08', 'AN2-03C', '—',
  'TUE\t', '—', '—', '—', '—', 'CSE427-07', '09A-02C', 'CSE111-11', '09A-02C', '—',
  'WED\t',
  'CSE110-03 (Lab) (MAZW,RKBM)', '09B-08L',
  'CSE110-03 (Lab) (MAZW,RKBM)', '09B-08L',
  'CSE427-07 (Lab) (AHA,RKBM)', 'AS2-12L',
  'CSE427-07 (Lab) (AHA,RKBM)', 'AS2-12L',
  'CSE110-07', 'AN2-03C', 'CSE110-08', 'AN2-03C', '—',
  'THU\t', '—', '—', '—', '—', '—', '—', '—',
].join('\n');

// The same routine as an Excel sheet read into rows: title + info rows,
// then the header, blank cells for empty slots, multi-line cells intact.
const EXCEL_ROWS: string[][] = [
  ['BRAC UNIVERSITY — Faculty Routine: RKBM'],
  ['NAME: Mohammad Rakibul Hasan Mahin  |  DESIGNATION: Lecturer'],
  ['Day \\ Time', '8:00 AM\n8:00 - 9:20', '9:30 AM\n9:30 - 10:50', '11:00 AM\n11:00 - 12:20', '12:30 PM\n12:30 - 1:50', '2:00 PM\n2:00 - 3:20', '3:30 PM\n3:30 - 4:50', '6:00 PM\n6:00 - 7:20'],
  ['SAT', '', '', '', '', '', '', ''],
  ['SUN', '', '', '', '', 'CSE427-07\n09A-02C', 'CSE111-11\n09A-02C', ''],
  ['MON', '', '', '', '', 'CSE110-07\nAN2-03C', 'CSE110-08\nAN2-03C', ''],
  ['TUE', '', '', '', '', 'CSE427-07\n09A-02C', 'CSE111-11\n09A-02C', ''],
  ['WED', 'CSE110-03 (Lab) (MAZW,RKBM)\n09B-08L', 'CSE110-03 (Lab) (MAZW,RKBM)\n09B-08L', 'CSE427-07 (Lab) (AHA,RKBM)\nAS2-12L', 'CSE427-07 (Lab) (AHA,RKBM)\nAS2-12L', 'CSE110-07\nAN2-03C', 'CSE110-08\nAN2-03C', ''],
  ['THU', '', '', '', '', '', '', ''],
];

function expectOfficialSample(result: ReturnType<typeof parseRoutineClipboard>) {
  expect(result.errors).toEqual([]);
  const at = (day: string, slot: string) => result.cells.find((c) => c.day === day && c.startSlot === slot);

  // 6 days x 7 time columns; Friday, 5:00 PM and 7:30 PM are absent, so they're left untouched.
  expect(result.cells).toHaveLength(42);
  expect(result.cells.some((c) => c.day === 'FRIDAY' || c.startSlot === 'T_17_00' || c.startSlot === 'T_19_30')).toBe(false);

  expect(at('SUNDAY', 'T_14_00')).toMatchObject({ type: 'THEORY', courseCode: 'CSE427', section: '07', roomNumber: '09A-02C' });
  expect(at('MONDAY', 'T_15_30')).toMatchObject({ type: 'THEORY', courseCode: 'CSE110', section: '08', roomNumber: 'AN2-03C' });
  expect(at('WEDNESDAY', 'T_08_00')).toMatchObject({ type: 'LAB', courseCode: 'CSE110', section: '03', coFaculty: 'MAZW,RKBM', roomNumber: '09B-08L' });
  expect(at('WEDNESDAY', 'T_09_30')?.isLabContinuationCell).toBe(true);
  expect(at('WEDNESDAY', 'T_11_00')).toMatchObject({ type: 'LAB', courseCode: 'CSE427', coFaculty: 'AHA,RKBM', roomNumber: 'AS2-12L' });
  expect(at('WEDNESDAY', 'T_12_30')?.isLabContinuationCell).toBe(true);
  expect(at('WEDNESDAY', 'T_18_00')?.type).toBe('EMPTY');
  expect(at('SATURDAY', 'T_08_00')?.type).toBe('EMPTY');
  expect(result.cells.filter((c) => c.type === 'NEEDS_REVIEW')).toEqual([]);
}

describe('parseRoutineClipboard — labeled official format', () => {
  it('parses the official paste format', () => {
    expectOfficialSample(parseRoutineClipboard(LABELED_PASTE));
  });

  it('parses the same table copied as one tab-separated field per cell', () => {
    expectOfficialSample(parseRoutineClipboard(buildGrid(EXCEL_ROWS)));
  });

  it('reports a day whose cell count does not match the header', () => {
    const broken = LABELED_PASTE.replace('THU\t\n—\n', 'THU\t\n');
    const result = parseRoutineClipboard(broken);
    expect(result.errors.join(' ')).toMatch(/Thursday has 6 cells/);
  });

  it('still accepts an old-style three-line lab cell in the labeled format', () => {
    const paste = LABELED_PASTE.replace(
      'CSE110-03 (Lab) (MAZW,RKBM)\n09B-08L\nCSE110-03 (Lab) (MAZW,RKBM)\n09B-08L',
      'CSE110-03 (LAB)\nMAZW,RKBM\n09B-08L\n—'
    );
    const result = parseRoutineClipboard(paste);
    expect(result.errors).toEqual([]);
    expect(result.cells.find((c) => c.day === 'WEDNESDAY' && c.startSlot === 'T_08_00')).toMatchObject({
      type: 'LAB',
      coFaculty: 'MAZW,RKBM',
      roomNumber: '09B-08L',
    });
  });
});

describe('parseRoutineTable — Excel upload', () => {
  it('parses the official sheet layout, ignoring title rows', () => {
    expectOfficialSample(parseRoutineTable(EXCEL_ROWS));
  });

  it('errors when there is no time header', () => {
    expect(parseRoutineTable([['SAT', '', '']]).errors[0]).toMatch(/time header/);
  });
});

describe('readSpreadsheet — Excel upload end to end', () => {
  it.each(['xlsx', 'biff8'] as const)('reads a %s file into rows the parser accepts', async (bookType) => {
    const XLSX = await import('xlsx');
    const sheet = XLSX.utils.aoa_to_sheet(EXCEL_ROWS);
    sheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }]; // merged title row, like the real sheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Routine');
    const bytes = XLSX.write(workbook, { type: 'array', bookType });

    const rows = await readSpreadsheet(new File([bytes], `routine.${bookType === 'xlsx' ? 'xlsx' : 'xls'}`));
    expectOfficialSample(parseRoutineTable(rows));
  });
});
