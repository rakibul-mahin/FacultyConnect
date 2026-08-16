import { WEEKDAYS, TIME_SLOTS, LAB_VALID_START_SLOTS, LAB_CONTINUATION_SLOT, type WeekdayValue, type TimeSlotValue } from '@/lib/constants';

// Parses pasted Google Sheets TSV for the OFFICIAL 7-day x 9-slot routine
// layout only (§36-39). Positional — column n is always the same clock
// time, row n is always the same weekday. Never guesses from content; any
// cell that doesn't match a known shape is flagged NEEDS_REVIEW with the
// raw text preserved.

export type ParsedCellType = 'EMPTY' | 'THEORY' | 'LAB' | 'CONSULTATION' | 'NEEDS_REVIEW';

export interface ParsedCell {
  day: WeekdayValue;
  startSlot: TimeSlotValue;
  type: ParsedCellType;
  courseCode?: string;
  section?: string;
  roomNumber?: string;
  coFaculty?: string;
  rawText?: string;
  issue?: string;
  /** True when this cell is the second half of a lab and is absorbed into
   *  the preceding LAB start cell — excluded from diff/import as its own row. */
  isLabContinuationCell?: boolean;
}

export interface ParseResult {
  cells: ParsedCell[];
  errors: string[]; // structural errors (wrong dimensions etc.) — parsing aborted
}

const COURSE_LINE_RE = /^([A-Za-z]{2,4}\d{2,4})-([A-Za-z0-9]+)(\s*\(LAB\))?$/i;

/**
 * Tokenizes clipboard text into rows of tab-separated fields. Cells that
 * contain an internal line break (a course cell is 2-3 stacked lines —
 * course/section, then room, or course/section, co-faculty, then room) are
 * wrapped in double quotes by Google Sheets/Excel when copied, per RFC4180
 * CSV/TSV quoting — so a bare `\n` only ends a row when it's outside an open
 * quoted field, and `""` inside a quoted field is a literal `"`.
 */
function tokenizeClipboard(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"' && field === '') {
      inQuotes = true;
      continue;
    }
    if (ch === '\t') {
      row.push(field);
      field = '';
      continue;
    }
    if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }
    field += ch;
  }
  row.push(field);
  rows.push(row);
  return rows;
}

export function parseRoutineClipboard(raw: string): ParseResult {
  const errors: string[] = [];
  const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Note: don't use text.trim() here — a full 7x9 grid of blank cells (e.g.
  // importing to clear part of a routine) is legitimate and trims to ''
  // since tabs/newlines are whitespace. Only a truly empty paste is an error.
  if (text.length === 0) {
    return { cells: [], errors: ['Pasted content is empty.'] };
  }

  const rows = tokenizeClipboard(text);
  // A lone trailing empty row (single empty field) from a trailing newline
  // is a common copy artifact — a genuine last data row always has
  // TIME_SLOTS.length fields, even if every one is an empty string.
  if (rows.length > 0) {
    const last = rows[rows.length - 1]!;
    if (last.length === 1 && last[0] === '') rows.pop();
  }

  if (rows.length !== WEEKDAYS.length) {
    errors.push(
      `Expected ${WEEKDAYS.length} rows (Saturday–Friday) but found ${rows.length}. Make sure you copied exactly the Sat–Fri x 8:00–7:30 range.`
    );
    return { cells: [], errors };
  }

  const cells: ParsedCell[] = [];
  const grid: (ParsedCell | undefined)[][] = [];

  rows.forEach((columns, rowIdx) => {
    if (columns.length !== TIME_SLOTS.length) {
      errors.push(
        `Row ${rowIdx + 1} (${WEEKDAYS[rowIdx]}) has ${columns.length} columns; expected ${TIME_SLOTS.length} (8:00 AM–7:30 PM).`
      );
    }
    grid.push([]);
  });

  if (errors.length > 0) return { cells: [], errors };

  rows.forEach((columns, rowIdx) => {
    const day = WEEKDAYS[rowIdx]!;
    columns.forEach((raw, colIdx) => {
      const startSlot = TIME_SLOTS[colIdx];
      if (!startSlot) return;
      const cell = parseCell(day, startSlot, raw);
      cells.push(cell);
      grid[rowIdx]![colIdx] = cell;
    });
  });

  // Lab pairing reconciliation (§17, §36): the official sheet repeats the
  // same lab text in both the start column and its forced continuation
  // column. A LAB cell must sit at a valid start column; its continuation
  // column must be either empty (we'll auto-occupy it) or an identical LAB
  // duplicate (which we absorb into the start cell) — anything else is a
  // genuine conflict.
  for (let rowIdx = 0; rowIdx < grid.length; rowIdx++) {
    for (let colIdx = 0; colIdx < TIME_SLOTS.length; colIdx++) {
      const cell = grid[rowIdx]?.[colIdx];
      if (!cell || cell.type !== 'LAB') continue;
      // Already absorbed as a continuation by an earlier column in this same
      // pass (e.g. col 0 marking col 1) — don't re-evaluate it as if it were
      // its own independent lab start, or it gets wrongly flagged as an
      // invalid start time.
      if (cell.isLabContinuationCell) continue;
      const startSlot = cell.startSlot;

      if (!LAB_VALID_START_SLOTS.includes(startSlot)) {
        cell.type = 'NEEDS_REVIEW';
        cell.issue = `Lab cannot start at ${startSlot}. Labs may only start at 8:00 AM, 11:00 AM, or 2:00 PM.`;
        continue;
      }

      const continuationSlot = LAB_CONTINUATION_SLOT[startSlot]!;
      const continuationIdx = TIME_SLOTS.indexOf(continuationSlot);
      const continuationCell = grid[rowIdx]?.[continuationIdx];

      if (!continuationCell || continuationCell.type === 'EMPTY') {
        continue; // will be auto-occupied on import
      }

      const matches =
        continuationCell.type === 'LAB' &&
        continuationCell.courseCode === cell.courseCode &&
        continuationCell.section === cell.section &&
        continuationCell.coFaculty === cell.coFaculty &&
        continuationCell.roomNumber === cell.roomNumber;

      if (matches) {
        continuationCell.isLabContinuationCell = true;
      } else {
        cell.type = 'NEEDS_REVIEW';
        cell.issue = `The next slot (${continuationSlot}) already contains different, conflicting data.`;
      }
    }
  }

  return { cells, errors: [] };
}

function parseCell(day: WeekdayValue, startSlot: TimeSlotValue, raw: string): ParsedCell {
  const trimmed = raw.trim();
  if (!trimmed) return { day, startSlot, type: 'EMPTY' };

  if (/^consultation$/i.test(trimmed) || /^consultation\b/i.test(trimmed)) {
    return { day, startSlot, type: 'CONSULTATION', rawText: trimmed };
  }

  const lines = trimmed
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const firstLine = lines[0] ?? '';
  const match = firstLine.match(COURSE_LINE_RE);
  if (!match) {
    return {
      day,
      startSlot,
      type: 'NEEDS_REVIEW',
      rawText: trimmed,
      issue: `Could not recognize "${firstLine}" as COURSE-SECTION or COURSE-SECTION (LAB).`,
    };
  }

  const [, courseCode, section, labSuffix] = match;
  const isLab = Boolean(labSuffix);

  if (isLab) {
    // Expect line 2: "CoFaculty,Initial" and line 3: room. Order can vary
    // slightly in real sheets; treat whichever of line2/line3 contains a
    // comma as coFaculty, and the other as room.
    if (lines.length < 3) {
      return {
        day,
        startSlot,
        type: 'NEEDS_REVIEW',
        rawText: trimmed,
        issue: 'Lab cell is missing co-faculty or room number lines.',
      };
    }
    const rest = lines.slice(1);
    const coFacultyLine = rest.find((l) => l.includes(','));
    const roomLine = rest.find((l) => l !== coFacultyLine);
    if (!coFacultyLine || !roomLine) {
      return {
        day,
        startSlot,
        type: 'NEEDS_REVIEW',
        rawText: trimmed,
        issue: 'Could not identify co-faculty vs. room number lines for this lab.',
      };
    }
    return {
      day,
      startSlot,
      type: 'LAB',
      courseCode: courseCode!.toUpperCase(),
      section: section!,
      coFaculty: coFacultyLine,
      roomNumber: roomLine,
      rawText: trimmed,
    };
  }

  if (lines.length < 2) {
    return {
      day,
      startSlot,
      type: 'NEEDS_REVIEW',
      rawText: trimmed,
      issue: 'Theory cell is missing a room number line.',
    };
  }

  return {
    day,
    startSlot,
    type: 'THEORY',
    courseCode: courseCode!.toUpperCase(),
    section: section!,
    roomNumber: lines[1]!,
    rawText: trimmed,
  };
}
