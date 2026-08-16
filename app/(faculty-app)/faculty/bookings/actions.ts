'use server';

import { revalidatePath } from 'next/cache';
import { requireFacultySession } from '@/lib/auth/session';
import * as bookingService from '@/lib/booking/service';
import { BookingError } from '@/lib/booking/errors';
import { markAttendanceSchema } from '@/lib/validation/booking';
import { cancelOccurrenceSchema, cancelDaySchema } from '@/lib/validation/routine';
import { parseDhakaDateString } from '@/lib/timezone';
import type { ActionResult } from '@/app/(faculty-app)/faculty/routine/actions';

export async function cancelOccurrenceAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const session = await requireFacultySession();
    const input = cancelOccurrenceSchema.parse(rawInput);
    await bookingService.cancelOccurrence(session.user.facultyProfileId!, input.occurrenceId, input.reason);
    revalidatePath('/faculty/bookings');
    revalidatePath('/faculty');
    return { ok: true, data: undefined };
  } catch (err) {
    if (err instanceof BookingError) return { ok: false, error: err.message };
    console.error(err);
    return { ok: false, error: 'Could not cancel this consultation.' };
  }
}

export async function cancelDayAction(rawInput: unknown): Promise<ActionResult<{ cancelledCount: number }>> {
  try {
    const session = await requireFacultySession();
    const input = cancelDaySchema.parse(rawInput);
    const cancelledCount = await bookingService.cancelDay(session.user.facultyProfileId!, parseDhakaDateString(input.date), input.reason);
    revalidatePath('/faculty/bookings');
    revalidatePath('/faculty');
    return { ok: true, data: { cancelledCount } };
  } catch (err) {
    if (err instanceof BookingError) return { ok: false, error: err.message };
    console.error(err);
    return { ok: false, error: 'Could not cancel this day.' };
  }
}

export async function markAttendanceAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const session = await requireFacultySession();
    const input = markAttendanceSchema.parse(rawInput);
    await bookingService.markAttendance(session.user.facultyProfileId!, input.bookingId, input.status);
    revalidatePath('/faculty/bookings');
    revalidatePath('/faculty/history');
    return { ok: true, data: undefined };
  } catch (err) {
    if (err instanceof BookingError) return { ok: false, error: err.message };
    console.error(err);
    return { ok: false, error: 'Could not update attendance.' };
  }
}
