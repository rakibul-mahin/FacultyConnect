// Kept in its own module (no server-only imports) so client components can
// render the same window the server materializes.

/**
 * By product decision, students (and faculty) never browse or book far into
 * the future — only the single next upcoming occurrence of each weekly
 * consultation slot is ever visible. A 7-calendar-day span starting
 * tomorrow always contains every weekday exactly once, so it always
 * materializes exactly the next occurrence per slot, no more.
 */
export const BOOKING_WINDOW_DAYS = 7;
