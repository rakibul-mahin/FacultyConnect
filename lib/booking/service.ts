import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { dhakaToday } from '@/lib/timezone';
import { BookingErrors } from '@/lib/booking/errors';
import { notify } from '@/lib/notify';
import type { BookingInput } from '@/lib/validation/booking';

const MAX_SERIALIZATION_RETRIES = 8;

/**
 * Creates a booking with transactional capacity enforcement (§6, §20, §43).
 * Serializable isolation makes Postgres abort the losing side of a race for
 * the last seat with a serialization error (P2034); we retry a bounded
 * number of times, re-checking capacity fresh on each attempt, so a student
 * who loses the race for the very last seat cleanly gets FULL instead of a
 * raw database error, and a burst of simultaneous requests still converges
 * on exactly filling capacity rather than under-booking.
 */
export async function createBooking(studentId: string, input: BookingInput) {
  const attempt = async () =>
    prisma.$transaction(
      async (tx) => {
        const occurrence = await tx.consultationOccurrence.findUnique({
          where: { id: input.occurrenceId },
        });
        if (!occurrence) throw BookingErrors.notFound();
        if (occurrence.status !== 'OPEN') throw BookingErrors.cancelled();

        const today = dhakaToday();
        if (occurrence.date.getTime() <= today.getTime()) {
          throw BookingErrors.todayNotBookable();
        }

        const existing = await tx.booking.findUnique({
          where: { occurrenceId_studentId: { occurrenceId: input.occurrenceId, studentId } },
        });
        if (existing && existing.status === 'CONFIRMED') throw BookingErrors.duplicate();

        const confirmedCount = await tx.booking.count({
          where: { occurrenceId: input.occurrenceId, status: 'CONFIRMED' },
        });
        if (confirmedCount >= occurrence.capacity) throw BookingErrors.full();

        const data =
          input.type === 'THESIS_INTERNSHIP_PROJECT'
            ? { type: input.type, groupId: input.groupId, reason: input.reason ?? null }
            : input.type === 'COURSE'
              ? { type: input.type, courseCode: input.courseCode.toUpperCase(), section: input.section, reason: input.reason }
              : { type: input.type, reason: input.reason };

        if (existing) {
          // Previously cancelled-by-faculty occurrence booking being re-created is not possible
          // (unique constraint keeps one row); this path only hits if status somehow isn't CONFIRMED.
          return tx.booking.update({ where: { id: existing.id }, data: { ...data, status: 'CONFIRMED' } });
        }

        return tx.booking.create({
          data: { occurrenceId: input.occurrenceId, studentId, ...data },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

  for (let i = 0; i <= MAX_SERIALIZATION_RETRIES; i++) {
    try {
      const booking = await attempt();
      notify({ type: 'BOOKING_CREATED', occurrenceId: input.occurrenceId, studentId });
      return booking;
    } catch (err) {
      const isSerializationConflict = err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034';
      if (isSerializationConflict && i < MAX_SERIALIZATION_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 15));
        continue;
      }
      if (isSerializationConflict) throw BookingErrors.concurrentConflict();
      if (err instanceof Prisma.PrismaClientKnownRequestError) throw normalizePrismaError(err);
      throw err;
    }
  }
  throw BookingErrors.concurrentConflict();
}

function normalizePrismaError(err: unknown) {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    return BookingErrors.duplicate();
  }
  return err;
}

export async function cancelOccurrence(facultyId: string, occurrenceId: string, reason?: string) {
  const occurrence = await prisma.consultationOccurrence.findUnique({
    where: { id: occurrenceId },
    include: { bookings: { where: { status: 'CONFIRMED' }, select: { id: true } } },
  });
  if (!occurrence) throw BookingErrors.notFound();
  if (occurrence.facultyId !== facultyId) throw BookingErrors.forbidden();

  await prisma.consultationOccurrence.update({
    where: { id: occurrenceId },
    data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason ?? null },
  });
  notify({ type: 'OCCURRENCE_CANCELLED', occurrenceId, cancelledBookingIds: occurrence.bookings.map((b) => b.id) });
}

export async function cancelDay(facultyId: string, date: Date, reason?: string) {
  const occurrences = await prisma.consultationOccurrence.findMany({
    where: { facultyId, date, status: 'OPEN' },
  });
  await prisma.consultationOccurrence.updateMany({
    where: { id: { in: occurrences.map((o) => o.id) } },
    data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason ?? null },
  });
  return occurrences.length;
}

/**
 * Lets a student cancel their own mistaken booking. This is a soft-cancel
 * (status change, never a delete) so historical records are preserved just
 * like faculty-initiated cancellations (§30-31) — but because it flips the
 * booking out of CONFIRMED, capacity/roster/position queries (which all
 * filter on status: 'CONFIRMED') immediately reflect the freed seat on both
 * the student's and faculty's views without any extra bookkeeping.
 */
export async function cancelBookingByStudent(studentId: string, bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { occurrence: true },
  });
  if (!booking) throw BookingErrors.notFound();
  if (booking.studentId !== studentId) throw BookingErrors.forbidden();
  if (booking.status !== 'CONFIRMED') throw BookingErrors.alreadyCancelled();

  const today = dhakaToday();
  if (booking.occurrence.date.getTime() < today.getTime()) {
    throw BookingErrors.pastCannotCancel();
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'CANCELLED_BY_STUDENT', cancelledAt: new Date() },
  });
  notify({ type: 'BOOKING_CANCELLED_BY_STUDENT', occurrenceId: booking.occurrenceId, studentId, bookingId });
}

export async function markAttendance(facultyId: string, bookingId: string, status: 'PRESENT' | 'ABSENT') {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { occurrence: true },
  });
  if (!booking) throw BookingErrors.notFound();
  if (booking.occurrence.facultyId !== facultyId) throw BookingErrors.forbidden();

  await prisma.attendance.upsert({
    where: { bookingId },
    update: { status, markedAt: new Date() },
    create: { bookingId, status },
  });
  notify({ type: 'ATTENDANCE_MARKED', bookingId, status });
}
