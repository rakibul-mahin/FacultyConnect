'use server';

import { revalidatePath } from 'next/cache';
import { requireStudentSession } from '@/lib/auth/session';
import * as bookingService from '@/lib/booking/service';
import { BookingError } from '@/lib/booking/errors';
import { z } from 'zod';
import type { ActionResult } from '@/app/(faculty-app)/faculty/routine/actions';

const cancelBookingSchema = z.object({ bookingId: z.string().uuid() });

export async function cancelBookingAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const session = await requireStudentSession();
    const input = cancelBookingSchema.parse(rawInput);
    await bookingService.cancelBookingByStudent(session.user.studentProfileId!, input.bookingId);
    revalidatePath('/student/bookings');
    revalidatePath('/student');
    return { ok: true, data: undefined };
  } catch (err) {
    if (err instanceof BookingError) return { ok: false, error: err.message };
    console.error(err);
    return { ok: false, error: 'Could not cancel this booking.' };
  }
}
