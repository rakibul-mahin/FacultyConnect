import {
  WEEKDAYS,
  WEEKDAY_LABELS,
  TIME_SLOTS,
  TIME_SLOT_24H,
  TIME_SLOT_LABELS,
  LAB_VALID_START_SLOTS,
  LAB_CONTINUATION_SLOT,
  type WeekdayValue,
  type TimeSlotValue,
} from '@/lib/constants';

// Parses a faculty routine for import (§36-39). Three input shapes:
//  - legacy paste: the bare 7-day x 9-slot grid, positional — column n is
//    always the same clock time, row n is always the same weekday;
//  - labeled paste: the official sheet copied with its "Day \ Time" header
//    and day labels, so columns are read from the header times;
//  - an uploaded Excel file, read client-side into rows (parseRoutineTable).
// Never guesses from content; any cell that doesn't match a known shape is
// flagged NEEDS_REVIEW with the raw text preserved.

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

// "CSE110-13", "CSE427-03 (LAB)", or "CSE110-03 (Lab) (MAZW,RKBM)" with the
// co-faculty initials inline.
const COURSE_LINE_RE = /^([A-Za-z]{2,4}\d{2,4})-([A-Za-z0-9]+)(?:\s*(\(LAB\))(?:\s*\(([^()]+)\))?)?$/i;

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
  const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Note: don't use text.trim() here — a full 7x9 grid of blank cells (e.g.
  // importing to clear part of a routine) is legitimate and trims to ''
  // since tabs/newlines are whitespace. Only a truly empty paste is an error.
  if (text.length === 0) {
    return { cells: [], errors: ['Pasted content is empty.'] };
  }

  const rows = tokenizeClipboard(text);

  // The labeled format (day labels down the side, times across the top) is
  // recognised by its day labels; anything else is the legacy bare 7x9 grid.
  if (rows.some((row) => row.some((field) => field.split('\n').some((line) => parseDayLabel(line))))) {
    return findHeaderRow(rows) !== null ? parseRoutineTable(rows) : parseLabeledStream(text);
  }

  // A lone trailing empty row (single empty field) from a trailing newline
  // is a common copy artifact — a genuine last data row always has
  // TIME_SLOTS.length fields, even if every one is an empty string.
  if (rows.length > 0) {
    const last = rows[rows.length - 1]!;
    if (last.length === 1 && last[0] === '') rows.pop();
  }

  if (rows.length !== WEEKDAYS.length) {
    return {
      cells: [],
      errors: [
        `Expected ${WEEKDAYS.length} rows (Saturday–Friday) but found ${rows.length}. Copy the whole routine table including the time header row and the day column, or exactly the Sat–Fri x 8:00–7:30 range.`,
      ],
    };
  }

  const errors: string[] = [];
  rows.forEach((columns, rowIdx) => {
    if (columns.length !== TIME_SLOTS.length) {
      errors.push(
        `Row ${rowIdx + 1} (${WEEKDAYS[rowIdx]}) has ${columns.length} columns; expected ${TIME_SLOTS.length} (8:00 AM–7:30 PM).`
      );
    }
  });
  if (errors.length > 0) return { cells: [], errors };

  return buildCells(
    rows.flatMap((columns, rowIdx) =>
      columns.map((raw, colIdx) => ({ day: WEEKDAYS[rowIdx]!, startSlot: TIME_SLOTS[colIdx]!, raw }))
    )
  );
}

// ---------------------------------------------------------------------------
// Labeled format: a "Day \ Time" header row of clock times, then one row per
// weekday starting with its label (SAT, SUN, ...). Only the days and time
// columns present are returned — anything missing is left untouched on
// import. Empty cells may be blank or a dash ("—").
// ---------------------------------------------------------------------------

const DAY_LABELS: Record<string, WeekdayValue> = {
  SAT: 'SATURDAY',
  SATURDAY: 'SATURDAY',
  SUN: 'SUNDAY',
  SUNDAY: 'SUNDAY',
  MON: 'MONDAY',
  MONDAY: 'MONDAY',
  TUE: 'TUESDAY',
  TUESDAY: 'TUESDAY',
  WED: 'WEDNESDAY',
  WEDNESDAY: 'WEDNESDAY',
  THU: 'THURSDAY',
  THURSDAY: 'THURSDAY',
  FRI: 'FRIDAY',
  FRIDAY: 'FRIDAY',
};

const EMPTY_MARKER_RE = /^[—–-]+$/;
const TIME_RE = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;

function parseDayLabel(text: string): WeekdayValue | null {
  return DAY_LABELS[text.trim().toUpperCase()] ?? null;
}

/** "2:00 PM" → T_14_00, or null if it isn't one of the official columns. */
function parseTimeLabel(text: string): TimeSlotValue | null {
  const match = text.trim().match(TIME_RE);
  if (!match) return null;
  let hour = Number(match[1]) % 12;
  if (match[3]!.toUpperCase() === 'PM') hour += 12;
  const hhmm = `${String(hour).padStart(2, '0')}:${match[2]}`;
  return TIME_SLOTS.find((slot) => TIME_SLOT_24H[slot] === hhmm) ?? null;
}

function isTimeLabel(text: string) {
  return TIME_RE.test(text.trim());
}

/** Header row = the first row with at least two cells whose first line is a clock time. */
function findHeaderRow(rows: string[][]): number | null {
  const idx = rows.findIndex((row) => row.filter((field) => isTimeLabel(field.trim().split('\n')[0] ?? '')).length >= 2);
  return idx === -1 ? null : idx;
}

/**
 * Parses a spreadsheet-shaped table (an uploaded Excel file, or a Google
 * Sheets copy that keeps one field per cell). Rows above the header (title,
 * faculty info) and rows without a day label are ignored.
 */
export function parseRoutineTable(rows: string[][]): ParseResult {
  const table = rows.map((row) => row.map((field) => (field ?? '').replace(/\r\n?/g, '\n')));
  const headerIdx = findHeaderRow(table);
  if (headerIdx === null) {
    return { cells: [], errors: ['Could not find the time header row (8:00 AM, 9:30 AM, …).'] };
  }

  const errors: string[] = [];
  const columns: { colIdx: number; slot: TimeSlotValue }[] = [];
  table[headerIdx]!.forEach((field, colIdx) => {
    const firstLine = field.trim().split('\n')[0] ?? '';
    if (!isTimeLabel(firstLine)) return;
    const slot = parseTimeLabel(firstLine);
    if (slot) columns.push({ colIdx, slot });
    else errors.push(`"${firstLine}" is not one of the official class start times.`);
  });

  const entries: GridEntry[] = [];
  const seenDays = new Set<WeekdayValue>();
  for (const row of table.slice(headerIdx + 1)) {
    const labelIdx = row.findIndex((field) => field.trim() !== '');
    const day = labelIdx === -1 ? null : parseDayLabel(row[labelIdx]!);
    if (!day) continue;
    if (seenDays.has(day)) {
      errors.push(`${WEEKDAY_LABELS[day]} appears more than once.`);
      continue;
    }
    seenDays.add(day);
    for (const { colIdx, slot } of columns) {
      entries.push({ day, startSlot: slot, raw: row[colIdx] ?? '' });
    }
  }

  if (seenDays.size === 0) errors.push('No day rows (SAT, SUN, …) found below the time header.');
  if (errors.length > 0) return { cells: [], errors };
  return buildCells(entries);
}

/**
 * Parses a labeled routine whose cells were copied as loose lines rather
 * than one field per cell (e.g. copied from a rendered web table) — each
 * cell's lines simply follow one another under its day label. Cells are
 * re-assembled by shape: a dash is one empty cell; a course line takes its
 * room line (and, for an old-style lab, its co-faculty line) with it.
 */
function parseLabeledStream(text: string): ParseResult {
  const lines = text
    .split(/[\t\n]/)
    .map((line) => line.trim())
    .filter(Boolean);

  const firstDayIdx = lines.findIndex((line) => parseDayLabel(line));
  const headerTimes = lines.slice(0, firstDayIdx).filter(isTimeLabel);

  const errors: string[] = [];
  const blocks: { day: WeekdayValue; cells: string[] }[] = [];
  for (let i = firstDayIdx; i < lines.length; i++) {
    const day = parseDayLabel(lines[i]!);
    if (day) {
      blocks.push({ day, cells: [] });
      continue;
    }
    const cells = blocks[blocks.length - 1]!.cells;
    const line = lines[i]!;
    if (EMPTY_MARKER_RE.test(line) || !COURSE_LINE_RE.test(line)) {
      cells.push(EMPTY_MARKER_RE.test(line) ? '' : line);
      continue;
    }
    const match = line.match(COURSE_LINE_RE)!;
    const isLab = Boolean(match[3]);
    const hasInlineCoFaculty = Boolean(match[4]);
    const maxExtraLines = isLab && !hasInlineCoFaculty ? 2 : 1;
    const cellLines = [line];
    while (cellLines.length <= maxExtraLines && i + 1 < lines.length && isContinuationLine(lines[i + 1]!)) {
      cellLines.push(lines[++i]!);
    }
    cells.push(cellLines.join('\n'));
  }

  let columns: TimeSlotValue[];
  if (headerTimes.length > 0) {
    columns = [];
    for (const time of headerTimes) {
      const slot = parseTimeLabel(time);
      if (slot) columns.push(slot);
      else errors.push(`"${time}" is not one of the official class start times.`);
    }
  } else {
    columns = [...TIME_SLOTS];
  }

  const seenDays = new Set<WeekdayValue>();
  for (const block of blocks) {
    if (seenDays.has(block.day)) errors.push(`${WEEKDAY_LABELS[block.day]} appears more than once.`);
    seenDays.add(block.day);
    if (block.cells.length !== columns.length) {
      errors.push(
        `${WEEKDAY_LABELS[block.day]} has ${block.cells.length} cells but the header has ${columns.length} time columns. Use "—" for empty slots.`
      );
    }
  }
  if (errors.length > 0) return { cells: [], errors };

  return buildCells(
    blocks.flatMap((block) => block.cells.map((raw, colIdx) => ({ day: block.day, startSlot: columns[colIdx]!, raw })))
  );
}

function isContinuationLine(line: string) {
  return (
    !EMPTY_MARKER_RE.test(line) && !COURSE_LINE_RE.test(line) && !parseDayLabel(line) && !/^consultation\b/i.test(line)
  );
}

// ---------------------------------------------------------------------------
// Shared: cell parsing + lab pairing reconciliation
// ---------------------------------------------------------------------------

interface GridEntry {
  day: WeekdayValue;
  startSlot: TimeSlotValue;
  raw: string;
}

function buildCells(entries: GridEntry[]): ParseResult {
  const cells = entries.map((entry) => parseCell(entry.day, entry.startSlot, entry.raw));
  const byKey = new Map(cells.map((cell) => [`${cell.day}|${cell.startSlot}`, cell]));

  // Lab pairing reconciliation (§17, §36): the official sheet repeats the
  // same lab text in both the start column and its forced continuation
  // column. A LAB cell must sit at a valid start column; its continuation
  // column must be either empty (we'll auto-occupy it) or an identical LAB
  // duplicate (which we absorb into the start cell) — anything else is a
  // genuine conflict.
  for (const day of WEEKDAYS) {
    for (const startSlot of TIME_SLOTS) {
      const cell = byKey.get(`${day}|${startSlot}`);
      if (!cell || cell.type !== 'LAB') continue;
      // Already absorbed as a continuation by an earlier column in this same
      // pass (e.g. 8:00 marking 9:30) — don't re-evaluate it as if it were
      // its own independent lab start, or it gets wrongly flagged as an
      // invalid start time.
      if (cell.isLabContinuationCell) continue;

      if (!LAB_VALID_START_SLOTS.includes(startSlot)) {
        cell.type = 'NEEDS_REVIEW';
        cell.issue = `Lab cannot start at ${TIME_SLOT_LABELS[startSlot]}. Labs may only start at 8:00 AM, 11:00 AM, or 2:00 PM.`;
        continue;
      }

      const continuationSlot = LAB_CONTINUATION_SLOT[startSlot]!;
      const continuationCell = byKey.get(`${day}|${continuationSlot}`);

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
        cell.issue = `The next slot (${TIME_SLOT_LABELS[continuationSlot]}) already contains different, conflicting data.`;
      }
    }
  }

  return { cells, errors: [] };
}

function parseCell(day: WeekdayValue, startSlot: TimeSlotValue, raw: string): ParsedCell {
  const trimmed = raw.trim();
  if (!trimmed || EMPTY_MARKER_RE.test(trimmed)) return { day, startSlot, type: 'EMPTY' };

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

  const [, courseCode, section, labSuffix, inlineCoFaculty] = match;
  const isLab = Boolean(labSuffix);

  if (isLab && inlineCoFaculty) {
    // New official format: "CSE110-03 (Lab) (MAZW,RKBM)" then the room line.
    if (lines.length < 2) {
      return { day, startSlot, type: 'NEEDS_REVIEW', rawText: trimmed, issue: 'Lab cell is missing a room number line.' };
    }
    return {
      day,
      startSlot,
      type: 'LAB',
      courseCode: courseCode!.toUpperCase(),
      section: section!,
      coFaculty: inlineCoFaculty.trim(),
      roomNumber: lines[1]!,
      rawText: trimmed,
    };
  }

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
