import 'server-only';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/db/prisma';
import type { Prisma } from '@prisma/client';
import type { ParsedCell } from '@/lib/parser/routine-parser';
import { LAB_CONTINUATION_SLOT } from '@/lib/constants';
import { getRoutineGrid, type RoutineGrid } from '@/lib/routine/service';

export type DiffStatus = 'ADDED' | 'CHANGED' | 'REMOVED' | 'UNCHANGED' | 'NEEDS_REVIEW';

export interface DiffRow {
  day: string;
  startSlot: string;
  status: DiffStatus;
  current: string | null;
  incoming: string | null;
  issue?: string;
}

function describeCurrent(grid: RoutineGrid, day: string, slot: string): string | null {
  const cell = grid[day]?.[slot];
  if (!cell) return null;
  if (cell.type === 'THEORY') return `${cell.courseCode}-${cell.section} · ${cell.roomNumber}`;
  if (cell.type === 'LAB') return `${cell.courseCode}-${cell.section} (LAB) · ${cell.coFaculty} · ${cell.roomNumber}`;
  return `Consultation · Capacity ${cell.capacity}`;
}

function describeIncoming(cell: ParsedCell): string | null {
  if (cell.type === 'EMPTY') return null;
  if (cell.type === 'NEEDS_REVIEW') return cell.rawText ?? '(unrecognized)';
  if (cell.type === 'THEORY') return `${cell.courseCode}-${cell.section} · ${cell.roomNumber}`;
  if (cell.type === 'LAB') return `${cell.courseCode}-${cell.section} (LAB) · ${cell.coFaculty} · ${cell.roomNumber}`;
  return 'Consultation';
}

/** Builds the Added/Changed/Removed/Unchanged/Needs-Review diff (§41). */
export async function buildImportDiff(facultyId: string, cells: ParsedCell[]): Promise<DiffRow[]> {
  const grid = await getRoutineGrid(facultyId);
  const rows: DiffRow[] = [];

  for (const cell of cells) {
    if (cell.isLabContinuationCell) continue; // absorbed into its LAB start row

    const current = describeCurrent(grid, cell.day, cell.startSlot);
    const incoming = describeIncoming(cell);

    let status: DiffStatus;
    if (cell.type === 'NEEDS_REVIEW') {
      status = 'NEEDS_REVIEW';
    } else if (current === null && incoming === null) {
      status = 'UNCHANGED';
    } else if (current === null && incoming !== null) {
      status = 'ADDED';
    } else if (current !== null && incoming === null) {
      status = 'REMOVED';
    } else if (current === incoming) {
      status = 'UNCHANGED';
    } else {
      status = 'CHANGED';
    }

    rows.push({ day: cell.day, startSlot: cell.startSlot, status, current, incoming, issue: cell.issue });
  }

  return rows;
}

async function clearSlotTx(tx: Prisma.TransactionClient, facultyId: string, day: string, startSlot: string) {
  const existing = await tx.routineEntry.findUnique({
    where: { facultyId_day_startSlot: { facultyId, day: day as never, startSlot: startSlot as never } },
  });
  if (!existing) return;
  if (existing.type === 'LAB' && existing.labGroupId) {
    await tx.routineEntry.deleteMany({ where: { facultyId, labGroupId: existing.labGroupId } });
  } else {
    await tx.routineEntry.delete({ where: { id: existing.id } });
  }
}

/**
 * Applies a confirmed import in one transaction (§41-42 — only "Confirm
 * Changes" writes to the database). Cells flagged NEEDS_REVIEW that the
 * faculty didn't resolve are skipped entirely, leaving the existing entry
 * at that slot untouched (Ignore semantics, §40).
 */
export async function applyRoutineImport(facultyId: string, cells: ParsedCell[]) {
  const decided = cells.filter((c) => c.type !== 'NEEDS_REVIEW' && !c.isLabContinuationCell);

  await prisma.$transaction(
    async (tx) => {
      for (const cell of decided) {
        await clearSlotTx(tx, facultyId, cell.day, cell.startSlot);

        if (cell.type === 'EMPTY') continue;

        if (cell.type === 'THEORY') {
          await tx.routineEntry.create({
            data: {
              facultyId,
              day: cell.day as never,
              startSlot: cell.startSlot as never,
              type: 'THEORY',
              courseCode: cell.courseCode,
              section: cell.section,
              roomNumber: cell.roomNumber,
            },
          });
          continue;
        }

        if (cell.type === 'CONSULTATION') {
          await tx.routineEntry.create({
            data: {
              facultyId,
              day: cell.day as never,
              startSlot: cell.startSlot as never,
              type: 'CONSULTATION',
              capacity: 10, // Sheets don't carry capacity — this is just the starting default; faculty can adjust it after import.
            },
          });
          continue;
        }

        // LAB
        const continuationSlot = LAB_CONTINUATION_SLOT[cell.startSlot as keyof typeof LAB_CONTINUATION_SLOT];
        if (!continuationSlot) continue; // guarded earlier by the parser
        await clearSlotTx(tx, facultyId, cell.day, continuationSlot);

        const labGroupId = randomUUID();
        await tx.routineEntry.create({
          data: {
            facultyId,
            day: cell.day as never,
            startSlot: cell.startSlot as never,
            type: 'LAB',
            courseCode: cell.courseCode,
            section: cell.section,
            coFaculty: cell.coFaculty,
            roomNumber: cell.roomNumber,
            labGroupId,
            isLabContinuation: false,
          },
        });
        await tx.routineEntry.create({
          data: {
            facultyId,
            day: cell.day as never,
            startSlot: continuationSlot as never,
            type: 'LAB',
            courseCode: cell.courseCode,
            section: cell.section,
            coFaculty: cell.coFaculty,
            roomNumber: cell.roomNumber,
            labGroupId,
            isLabContinuation: true,
          },
        });
      }
    },
    // A full-sheet import can be dozens of sequential round trips inside one
    // interactive transaction. Prisma's default 5s timeout is comfortably
    // enough on a local DB but too tight over a real network connection to a
    // hosted pooler (e.g. Supabase) — give it real headroom.
    { timeout: 30_000, maxWait: 10_000 }
  );
}
