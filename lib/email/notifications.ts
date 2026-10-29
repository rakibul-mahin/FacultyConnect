import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { sendEmail } from '@/lib/email/client';
import {
  bookingConfirmedForStudent,
  cancelledForStudent,
  newBookingForFaculty,
  studentCancelledForFaculty,
  type BookingEmailData,
  type StudentCancellation,
} from '@/lib/email/templates';

/**
 * Who gets which email (product decision):
 *  - student books            → the student and the faculty member
 *  - student cancels          → the faculty member only
 *  - faculty removes a student → that student only
 *  - faculty cancels a slot / a day → every student booked on it
 */

const bookingInclude = { student: true, occurrence: { include: { faculty: true } } } as const;

type BookingWithRelations = NonNullable<Awaited<ReturnType<typeof findBooking>>>;

function findBooking(id: string) {
  return prisma.booking.findUnique({ where: { id }, include: bookingInclude });
}

function toEmailData(b: BookingWithRelations, seatsTaken?: number): BookingEmailData {
  const { occurrence } = b;
  return {
    occurrenceId: occurrence.id,
    date: occurrence.date,
    startSlot: occurrence.startSlot,
    type: b.type,
    groupId: b.groupId,
    courseCode: b.courseCode,
    section: b.section,
    reason: b.reason,
    student: { fullName: b.student.fullName, studentId: b.student.studentId, email: b.student.email },
    faculty: {
      fullName: occurrence.faculty.fullName,
      initial: occurrence.faculty.initial,
      seat: occurrence.faculty.seat,
      email: occurrence.faculty.email,
      publicId: occurrence.faculty.publicId,
    },
    seats: seatsTaken === undefined ? undefined : { taken: seatsTaken, capacity: occurrence.capacity },
  };
}

const confirmedCount = (occurrenceId: string) => prisma.booking.count({ where: { occurrenceId, status: 'CONFIRMED' } });

export async function emailBookingCreated(occurrenceId: string, studentId: string) {
  const [booking, taken] = await Promise.all([
    prisma.booking.findUnique({ where: { occurrenceId_studentId: { occurrenceId, studentId } }, include: bookingInclude }),
    confirmedCount(occurrenceId),
  ]);
  if (!booking) return;
  const data = toEmailData(booking, taken);
  await Promise.all([
    sendEmail({ to: data.student.email, replyTo: data.faculty.email, ...bookingConfirmedForStudent(data) }),
    sendEmail({ to: data.faculty.email, replyTo: data.student.email, ...newBookingForFaculty(data) }),
  ]);
}

export async function emailStudentCancelled(bookingId: string) {
  const booking = await findBooking(bookingId);
  if (!booking) return;
  const data = toEmailData(booking, await confirmedCount(booking.occurrenceId));
  await sendEmail({ to: data.faculty.email, replyTo: data.student.email, ...studentCancelledForFaculty(data) });
}

export async function emailStudentRemoved(bookingId: string, reason: string) {
  const booking = await findBooking(bookingId);
  if (!booking) return;
  const data = toEmailData(booking);
  await sendEmail({ to: data.student.email, replyTo: data.faculty.email, ...cancelledForStudent(data, reason, 'removed') });
}

export async function emailOccurrenceCancelled(bookingIds: string[], reason: string | null, scope: Exclude<StudentCancellation, 'removed'>) {
  if (bookingIds.length === 0) return;
  const bookings = await prisma.booking.findMany({ where: { id: { in: bookingIds } }, include: bookingInclude });
  await Promise.all(
    bookings.map((b) => {
      const data = toEmailData(b);
      return sendEmail({ to: data.student.email, replyTo: data.faculty.email, ...cancelledForStudent(data, reason, scope) });
    })
  );
}
