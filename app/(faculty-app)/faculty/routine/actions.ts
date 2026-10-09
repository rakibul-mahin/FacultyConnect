'use server';

import { revalidatePath } from 'next/cache';
import { requireFacultySession } from '@/lib/auth/session';
import { routineEntryInputSchema } from '@/lib/validation/routine';
import { upsertEntry, clearRoutine, RoutineError } from '@/lib/routine/service';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { parseRoutineClipboard, parseRoutineTable, type ParsedCell } from '@/lib/parser/routine-parser';
import { buildImportDiff, applyRoutineImport, type DiffRow } from '@/lib/routine/import';

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export async function saveRoutineEntry(rawInput: unknown): Promise<ActionResult> {
  try {
    const session = await requireFacultySession();
    const input = routineEntryInputSchema.parse(rawInput);
    await upsertEntry(session.user.facultyProfileId!, input);
    revalidatePath('/faculty/routine');
    revalidatePath('/faculty');
    return { ok: true, data: undefined };
  } catch (err) {
    if (err instanceof RoutineError) return { ok: false, error: err.message };
    console.error(err);
    return { ok: false, error: 'Something went wrong saving this slot.' };
  }
}

export async function clearRoutineAction(): Promise<ActionResult<{ clearedCount: number }>> {
  try {
    const session = await requireFacultySession();
    const clearedCount = await clearRoutine(session.user.facultyProfileId!);
    revalidatePath('/faculty/routine');
    revalidatePath('/faculty');
    return { ok: true, data: { clearedCount } };
  } catch (err) {
    console.error(err);
    return { ok: false, error: 'Could not clear your routine.' };
  }
}

export async function parseClipboardAction(raw: string): Promise<ActionResult<{ cells: ParsedCell[]; errors: string[] }>> {
  try {
    await requireFacultySession();
    const result = parseRoutineClipboard(raw);
    return { ok: true, data: result };
  } catch (err) {
    console.error(err);
    return { ok: false, error: 'Could not parse the pasted content.' };
  }
}

// Rows read client-side from an uploaded Excel file. Bounded so a huge or
// hostile sheet can't be pushed through the parser.
const uploadedTableSchema = z.array(z.array(z.string().max(500)).max(40)).max(100);

export async function parseTableAction(
  rawRows: unknown
): Promise<ActionResult<{ cells: ParsedCell[]; errors: string[] }>> {
  try {
    await requireFacultySession();
    const rows = uploadedTableSchema.safeParse(rawRows);
    if (!rows.success) {
      return { ok: false, error: 'This file is too large to be a routine sheet. Upload only the routine table.' };
    }
    return { ok: true, data: parseRoutineTable(rows.data) };
  } catch (err) {
    console.error(err);
    return { ok: false, error: 'Could not read the uploaded file.' };
  }
}

export async function buildDiffAction(cells: ParsedCell[]): Promise<ActionResult<DiffRow[]>> {
  try {
    const session = await requireFacultySession();
    const rows = await buildImportDiff(session.user.facultyProfileId!, cells);
    return { ok: true, data: rows };
  } catch (err) {
    console.error(err);
    return { ok: false, error: 'Could not build the import preview.' };
  }
}

export async function confirmImportAction(cells: ParsedCell[]): Promise<ActionResult> {
  try {
    const session = await requireFacultySession();
    await applyRoutineImport(session.user.facultyProfileId!, cells);
    revalidatePath('/faculty/routine');
    revalidatePath('/faculty');
    return { ok: true, data: undefined };
  } catch (err) {
    console.error(err);
    return { ok: false, error: 'Could not apply the import.' };
  }
}

export async function getMyRoutineGridAction() {
  const session = await requireFacultySession();
  return prisma.routineEntry.findMany({ where: { facultyId: session.user.facultyProfileId! } });
}
