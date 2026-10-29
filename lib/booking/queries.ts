import 'server-only';
import * as React from 'react';
import { prisma } from '@/lib/db/prisma';
import { dhakaToday, hasSlotStarted } from '@/lib/timezone';
import { TIME_SLOT_24H, type TimeSlotValue } from '@/lib/constants';
import type { FacultySlot } from '@/components/faculty/types';
import { BookingErrors } from '@/lib/booking/errors';

/**
 * Student/public-facing occurrence list: counts only, never booking identities
 * (§20, §23, §27 — privacy is enforced here in the data-access layer, not the UI).
 */
export async function getBookableOccurrences(facultyId: string, fromDate: Date, toDate: Date, viewerStudentId?: string) {
  const occurrences = await prisma.consultationOccurrence.findMany({
    where: { facultyId, date: { gte: fromDate, lte: toDate } },
    orderBy: [{ date: 'asc' }, { startSlot: 'asc' }],
    include: {
      bookings: {
        where: { status: 'CONFIRMED' },
        select: { id: true, studentId: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  const today = dhakaToday();

  return occurrences.map((occ) => {
    const bookedCount = occ.bookings.length;
    const myIndex = viewerStudentId ? occ.bookings.findIndex((b) => b.studentId === viewerStudentId) : -1;
    return {
      id: occ.id,
      date: occ.date,
      startSlot: occ.startSlot,
      capacity: occ.capacity,
      status: occ.status,
      // The faculty's cancellation note is written for students, so it is
      // safe to expose alongside the counts.
      cancelReason: occ.cancelReason,
      bookedCount,
      isFull: bookedCount >= occ.capacity,
      isPast: occ.date.getTime() <= today.getTime(),
      isBookable: occ.status === 'OPEN' && occ.date.getTime() > today.getTime() && bookedCount < occ.capacity,
      myBookingPosition: myIndex >= 0 ? myIndex + 1 : null,
    };
  });
}

/** Faculty-only: every slot in a date range with its full roster (§28, §23), shaped for the bookings board. */
export async function getFacultySlots(facultyId: string, fromDate: Date, toDate: Date): Promise<FacultySlot[]> {
  const occurrences = await prisma.consultationOccurrence.findMany({
    where: { facultyId, date: { gte: fromDate, lte: toDate } },
    orderBy: [{ date: 'asc' }, { startSlot: 'asc' }],
    include: {
      bookings: { orderBy: { createdAt: 'asc' }, include: { student: true, attendance: true } },
    },
  });
  return occurrences.map(toFacultySlot);
}

export function toFacultySlot(occ: Awaited<ReturnType<typeof getFacultyOccurrenceRoster>>): FacultySlot {
  let confirmedSeen = 0;
  return {
    id: occ.id,
    date: occ.date,
    startSlot: occ.startSlot,
    capacity: occ.capacity,
    status: occ.status,
    cancelReason: occ.cancelReason,
    started: hasSlotStarted(occ.date, TIME_SLOT_24H[occ.startSlot as TimeSlotValue]),
    past: occ.date.getTime() < dhakaToday().getTime(),
    bookings: occ.bookings.map((b) => ({
      id: b.id,
      status: b.status,
      type: b.type,
      groupId: b.groupId,
      courseCode: b.courseCode,
      section: b.section,
      reason: b.reason,
      createdAt: b.createdAt,
      position: b.status === 'CONFIRMED' ? ++confirmedSeen : null,
      attendance: b.attendance?.status ?? null,
      student: { fullName: b.student.fullName, studentId: b.student.studentId, email: b.student.email },
    })),
  };
}

/** Faculty-only: full roster with private student/reason detail (§28, §23). */
export async function getFacultyOccurrenceRoster(facultyId: string, occurrenceId: string) {
  const occurrence = await prisma.consultationOccurrence.findUnique({
    where: { id: occurrenceId },
    include: {
      bookings: {
        orderBy: { createdAt: 'asc' },
        include: { student: true, attendance: true },
      },
    },
  });
  if (!occurrence) throw BookingErrors.notFound();
  if (occurrence.facultyId !== facultyId) throw BookingErrors.forbidden();
  return occurrence;
}

export async function getStudentOwnBooking(studentId: string, occurrenceId: string) {
  return prisma.booking.findUnique({
    where: { occurrenceId_studentId: { occurrenceId, studentId } },
  });
}

export async function getStudentBookings(studentId: string, { upcoming }: { upcoming: boolean }) {
  const today = dhakaToday();
  return prisma.booking.findMany({
    where: {
      studentId,
      occurrence: upcoming ? { date: { gte: today } } : { date: { lt: today } },
    },
    include: {
      occurrence: { include: { faculty: true } },
      attendance: true,
    },
    orderBy: { occurrence: { date: upcoming ? 'asc' : 'desc' } },
    take: 100,
  });
}

/**
 * The student's 1-based queue position in each upcoming occurrence they are
 * booked on, among confirmed bookings in booking order. Selected through the
 * relation (not a list of ids) so it runs in the same round as the bookings
 * query. Only positions are returned — never other students' identities (§23).
 */
export async function getStudentQueuePositions(studentId: string) {
  const positions = new Map<string, number>();
  const confirmed = await prisma.booking.findMany({
    where: {
      status: 'CONFIRMED',
      occurrence: { date: { gte: dhakaToday() }, bookings: { some: { studentId, status: 'CONFIRMED' } } },
    },
    select: { occurrenceId: true, studentId: true },
    orderBy: { createdAt: 'asc' },
  });
  const seen = new Map<string, number>();
  for (const booking of confirmed) {
    const position = (seen.get(booking.occurrenceId) ?? 0) + 1;
    seen.set(booking.occurrenceId, position);
    if (booking.studentId === studentId) positions.set(booking.occurrenceId, position);
  }
  return positions;
}

export async function getFacultyTodayEntries(facultyId: string, today: string /* weekday enum */) {
  return prisma.routineEntry.findMany({
    where: { facultyId, day: today as never },
    orderBy: { startSlot: 'asc' },
  });
}

export async function getFacultyAttendanceStats(facultyId: string) {
  const [totalBooked, totalPresent, totalAbsent] = await Promise.all([
    prisma.booking.count({ where: { occurrence: { facultyId }, status: 'CONFIRMED' } }),
    prisma.attendance.count({ where: { status: 'PRESENT', booking: { occurrence: { facultyId } } } }),
    prisma.attendance.count({ where: { status: 'ABSENT', booking: { occurrence: { facultyId } } } }),
  ]);
  return { totalBooked, totalPresent, totalAbsent };
}

// React.cache exists in Next's server build of React; plain React 18 (as used
// by vitest) lacks it, where sharing a result per request doesn't matter.
const perRequest: <T extends (...args: never[]) => unknown>(fn: T) => T =
  typeof React.cache === 'function' ? React.cache : (fn) => fn;

/**
 * A student's latest notifications plus how many are unread (own rows only).
 * cache() shares one result between the student layout (bell) and the
 * dashboard (alerts) within a request.
 */
export const getStudentNotifications = perRequest(async (studentId: string) => {
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({ where: { studentId }, orderBy: { createdAt: 'desc' }, take: 15 }),
    prisma.notification.count({ where: { studentId, readAt: null } }),
  ]);
  return { items, unread };
});
