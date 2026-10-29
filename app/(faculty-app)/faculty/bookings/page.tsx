import { addDays } from 'date-fns';
import { requireFacultyPage } from '@/lib/auth/session';
import { readWithOccurrences, BOOKING_WINDOW_DAYS } from '@/lib/booking/occurrences';
import { getFacultySlots } from '@/lib/booking/queries';
import { dhakaToday, toDateKey } from '@/lib/timezone';
import { FadeIn } from '@/components/motion/fade-in';
import { BookingsBoard } from '@/components/faculty/bookings-board';

export default async function FacultyBookingsPage() {
  const session = await requireFacultyPage();
  const facultyId = session.user.facultyProfileId!;
  // Today (for attendance) plus the full student booking window after it.
  const today = dhakaToday();
  const last = addDays(today, BOOKING_WINDOW_DAYS);
  const slots = await readWithOccurrences(facultyId, undefined, () => getFacultySlots(facultyId, today, last));
  const dayKeys = Array.from({ length: BOOKING_WINDOW_DAYS + 1 }, (_, i) => toDateKey(addDays(today, i)));

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="text-2xl font-semibold tracking-tight">Bookings</h1>
        <p className="text-sm text-muted-foreground">Who&apos;s coming to your consultations this week. Click a student for full details.</p>
      </FadeIn>
      <FadeIn delay={0.05}>
        <BookingsBoard slots={slots} dayKeys={dayKeys} todayKey={toDateKey(today)} />
      </FadeIn>
    </div>
  );
}
