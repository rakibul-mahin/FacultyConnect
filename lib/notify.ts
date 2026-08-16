import 'server-only';

/**
 * Single extension point for notifications (§55, §68). Version 1 ships with
 * no email/SMS infrastructure — paid email APIs are explicitly out of scope
 * for a $0/month deployment. Booking/routine/attendance logic calls this
 * function at the natural notification points; today it just logs, so a
 * real provider (e.g. a free-tier transactional email API) can be dropped in
 * later without touching any booking/routine/attendance code.
 */
export type NotificationEvent =
  | { type: 'BOOKING_CREATED'; occurrenceId: string; studentId: string }
  | { type: 'BOOKING_CANCELLED_BY_STUDENT'; occurrenceId: string; studentId: string; bookingId: string }
  | { type: 'OCCURRENCE_CANCELLED'; occurrenceId: string; cancelledBookingIds: string[] }
  | { type: 'ATTENDANCE_MARKED'; bookingId: string; status: 'PRESENT' | 'ABSENT' };

export function notify(event: NotificationEvent) {
  if (process.env.NODE_ENV === 'development') {
    console.log('[notify]', event.type, event);
  }
}
