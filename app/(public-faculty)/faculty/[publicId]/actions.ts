'use server';

import { revalidatePath } from 'next/cache';
import { requireStudentSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { bookingInputSchema } from '@/lib/validation/booking';
import * as bookingService from '@/lib/booking/service';
import { BookingError, BookingErrors } from '@/lib/booking/errors';
import type { ActionResult } from '@/app/(faculty-app)/faculty/routine/actions';

export async function createBookingAction(rawInput: unknown): Promise<ActionResult<{ position: number }>> {
  try {
    const session = await requireStudentSession();

    const student = await prisma.studentProfile.findUniqueOrThrow({ where: { id: session.user.studentProfileId! } });
    if (!student.studentId) {
      return { ok: false, error: BookingErrors.profileIncomplete().message };
    }

    const input = bookingInputSchema.parse(rawInput);
    const booking = await bookingService.createBooking(session.user.studentProfileId!, input);

    const confirmedCount = await prisma.booking.count({
      where: { occurrenceId: input.occurrenceId, status: 'CONFIRMED', createdAt: { lte: booking.createdAt } },
    });

    revalidatePath('/student/bookings');
    revalidatePath('/student');
    return { ok: true, data: { position: confirmedCount } };
  } catch (err) {
    if (err instanceof BookingError) return { ok: false, error: err.message };
    console.error(err);
    return { ok: false, error: 'Something went wrong while booking. Please try again.' };
  }
}
