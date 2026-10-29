import 'server-only';
import { prisma } from '@/lib/db/prisma';
import type { Prisma, RoutineEntry } from '@prisma/client';
import { addDays } from 'date-fns';
import { dhakaTomorrow, dhakaWeekdayOf } from '@/lib/timezone';
import { BOOKING_WINDOW_DAYS } from '@/lib/booking/window';

export { BOOKING_WINDOW_DAYS };

function bookingWindow() {
  const start = dhakaTomorrow();
  const end = addDays(start, BOOKING_WINDOW_DAYS - 1);
  return { start, end };
}

/**
 * Lazily/idempotently materializes ConsultationOccurrence rows for every
 * CONSULTATION RoutineEntry of a faculty member across [tomorrow,
 * tomorrow+6] — i.e. only ever the next occurrence per weekly slot. No cron
 * required — see ARCHITECTURE.md §4. Safe to call on every relevant page
 * load; upsert on the (routineEntryId, date) unique constraint makes repeat
 * calls a no-op for dates that already exist. Because this window rolls
 * forward by exactly one day on every call, "tomorrow" is always captured
 * before it becomes "today", so nothing is ever missed.
 */
export async function ensureOccurrences(
  facultyId: string,
  /** Pass the faculty's routine entries when the caller already loaded them, to skip a round trip. */
  routineEntries?: RoutineEntry[]
): Promise<number> {
  const consultationEntries = (
    routineEntries ?? (await prisma.routineEntry.findMany({ where: { facultyId, type: 'CONSULTATION' } }))
  ).filter((entry) => entry.type === 'CONSULTATION');

  const { end } = bookingWindow();
  const rows = windowRows(facultyId, consultationEntries);

  // One INSERT for the whole window; rows that already exist hit the
  // (routineEntryId, date) unique constraint and are skipped, leaving them
  // untouched. Runs alongside the cleanup below — the two never touch the
  // same rows (inside vs. beyond the window).
  const [created] = await Promise.all([
    rows.length > 0 ? prisma.consultationOccurrence.createMany({ data: rows, skipDuplicates: true }) : null,
    // Self-healing: remove any previously over-generated far-future
    // occurrences beyond the near-term window that nobody has booked, so a
    // narrower window takes effect immediately instead of only for newly
    // created rows. Never touches occurrences with a confirmed booking.
    prisma.consultationOccurrence.deleteMany({
      where: {
        facultyId,
        status: 'OPEN',
        date: { gt: end },
        bookings: { none: { status: 'CONFIRMED' } },
      },
    }),
  ]);
  return created?.count ?? 0;
}

/** The occurrence rows the booking window should contain for these entries. */
function windowRows(facultyId: string, routineEntries: RoutineEntry[]) {
  const { start } = bookingWindow();
  const rows: Prisma.ConsultationOccurrenceCreateManyInput[] = [];
  for (let i = 0; i < BOOKING_WINDOW_DAYS; i++) {
    const date = addDays(start, i);
    const weekday = dhakaWeekdayOf(date);
    for (const entry of routineEntries) {
      if (entry.type !== 'CONSULTATION' || entry.day !== weekday) continue;
      rows.push({
        routineEntryId: entry.id,
        facultyId,
        date,
        startSlot: entry.startSlot,
        capacity: entry.capacity ?? 1,
      });
    }
  }
  return rows;
}

/**
 * Page-load path for ensureOccurrences. The window's rows almost always exist
 * already (a new day enters the window once a day), and every write costs
 * several round trips to the hosted database (BEGIN, statements, COMMIT). So
 * this runs `read` and a cheap existence check in parallel, and only when a
 * row is actually missing does it run ensureOccurrences — including its
 * far-future cleanup — and repeat `read`.
 */
export async function readWithOccurrences<T>(
  facultyId: string,
  /** The faculty's routine, if loaded (or still loading — a pending query is fine). */
  routineEntries: RoutineEntry[] | Promise<RoutineEntry[]> | undefined,
  read: () => Promise<T>
) {
  const { start, end } = bookingWindow();
  const [entries, existing, first] = await Promise.all([
    routineEntries ?? prisma.routineEntry.findMany({ where: { facultyId, type: 'CONSULTATION' } }),
    prisma.consultationOccurrence.findMany({
      where: { facultyId, date: { gte: start, lte: end } },
      select: { routineEntryId: true, date: true },
    }),
    read(),
  ]);
  const have = new Set(existing.map((o) => `${o.routineEntryId}:${o.date.getTime()}`));
  const missing = windowRows(facultyId, entries).some((r) => !have.has(`${r.routineEntryId}:${(r.date as Date).getTime()}`));
  if (!missing) return first;
  await ensureOccurrences(facultyId, entries);
  return read();
}
