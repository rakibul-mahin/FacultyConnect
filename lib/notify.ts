import 'server-only';
import {
  emailBookingCreated,
  emailOccurrenceCancelled,
  emailStudentCancelled,
  emailStudentRemoved,
} from '@/lib/email/notifications';

/**
 * Single extension point for notifications (§55, §68). Booking logic calls
 * this after a change is saved; it sends the matching emails (lib/email).
 * In-app notifications for students are stored separately, inside the same
 * transaction as the cancellation (lib/booking/service.ts).
 *
 * It never throws: an email problem must not fail or undo the booking.
 */
export type NotificationEvent =
  | { type: 'BOOKING_CREATED'; occurrenceId: string; studentId: string }
  | { type: 'BOOKING_CANCELLED_BY_STUDENT'; occurrenceId: string; studentId: string; bookingId: string }
  | { type: 'BOOKING_CANCELLED_BY_FACULTY'; occurrenceId: string; studentId: string; bookingId: string; reason: string }
  | {
      type: 'OCCURRENCE_CANCELLED';
      occurrenceId: string;
      cancelledBookingIds: string[];
      reason: string | null;
      /** Whether the faculty cancelled this one slot or the whole day. */
      scope: 'slot' | 'day';
    }
  | { type: 'ATTENDANCE_MARKED'; bookingId: string; status: 'PRESENT' | 'ABSENT' };

export async function notify(event: NotificationEvent): Promise<void> {
  try {
    switch (event.type) {
      case 'BOOKING_CREATED':
        return await emailBookingCreated(event.occurrenceId, event.studentId);
      case 'BOOKING_CANCELLED_BY_STUDENT':
        return await emailStudentCancelled(event.bookingId);
      case 'BOOKING_CANCELLED_BY_FACULTY':
        return await emailStudentRemoved(event.bookingId, event.reason);
      case 'OCCURRENCE_CANCELLED':
        return await emailOccurrenceCancelled(event.cancelledBookingIds, event.reason, event.scope);
      case 'ATTENDANCE_MARKED':
        return;
    }
  } catch (err) {
    console.error('[notify] failed to send notifications for', event.type, err);
  }
}
