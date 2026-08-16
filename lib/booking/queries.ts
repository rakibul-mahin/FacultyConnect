import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { dhakaToday } from '@/lib/timezone';
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
      bookedCount,
      isFull: bookedCount >= occ.capacity,
      isPast: occ.date.getTime() <= today.getTime(),
      isBookable: occ.status === 'OPEN' && occ.date.getTime() > today.getTime() && bookedCount < occ.capacity,
      myBookingPosition: myIndex >= 0 ? myIndex + 1 : null,
    };
  });
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

export async function getFacultyUpcomingOccurrences(facultyId: string, limit = 10) {
  const today = dhakaToday();
  const occurrences = await prisma.consultationOccurrence.findMany({
    where: { facultyId, date: { gte: today }, status: 'OPEN' },
    orderBy: [{ date: 'asc' }, { startSlot: 'asc' }],
    take: limit,
    include: { bookings: { where: { status: 'CONFIRMED' }, select: { id: true } } },
  });
  return occurrences;
}

export async function getFacultyTodayEntries(facultyId: string, today: string /* weekday enum */) {
  return prisma.routineEntry.findMany({
    where: { facultyId, day: today as never },
    orderBy: { startSlot: 'asc' },
  });
}

export async function getFacultyHistory(
  facultyId: string,
  { page = 1, pageSize = 20 }: { page?: number; pageSize?: number } = {}
) {
  const today = dhakaToday();
  const [occurrences, total] = await Promise.all([
    prisma.consultationOccurrence.findMany({
      where: { facultyId, date: { lt: today } },
      orderBy: [{ date: 'desc' }, { startSlot: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        bookings: { include: { student: true, attendance: true }, orderBy: { createdAt: 'asc' } },
      },
    }),
    prisma.consultationOccurrence.count({ where: { facultyId, date: { lt: today } } }),
  ]);
  return { occurrences, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getFacultyAttendanceStats(facultyId: string) {
  const [totalBooked, totalPresent, totalAbsent] = await Promise.all([
    prisma.booking.count({ where: { occurrence: { facultyId }, status: 'CONFIRMED' } }),
    prisma.attendance.count({ where: { status: 'PRESENT', booking: { occurrence: { facultyId } } } }),
    prisma.attendance.count({ where: { status: 'ABSENT', booking: { occurrence: { facultyId } } } }),
  ]);
  return { totalBooked, totalPresent, totalAbsent };
}
