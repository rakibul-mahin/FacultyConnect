import { addDays } from 'date-fns';
import { requireFacultyPage } from '@/lib/auth/session';
import { getFacultyAttendanceStats, getFacultySlots } from '@/lib/booking/queries';
import { dhakaToday, parseDhakaDateString, toDateKey } from '@/lib/timezone';
import { FadeIn } from '@/components/motion/fade-in';
import { HistoryWeek } from '@/components/faculty/history-week';

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Saturday that starts the routine week (Sat–Fri) containing `date`. */
function weekStartOf(date: Date) {
  return addDays(date, -((date.getUTCDay() + 1) % 7));
}

export default async function FacultyHistoryPage({ searchParams }: { searchParams: { week?: string; day?: string } }) {
  const session = await requireFacultyPage();
  const facultyId = session.user.facultyProfileId!;

  // History is strictly the past: yesterday is the latest day it can show.
  const yesterday = addDays(dhakaToday(), -1);
  const latestWeek = weekStartOf(yesterday);
  const day = searchParams.day && DATE_KEY.test(searchParams.day) ? parseDhakaDateString(searchParams.day) : null;
  const requested = searchParams.week && DATE_KEY.test(searchParams.week) ? parseDhakaDateString(searchParams.week) : day ?? yesterday;
  let weekStart = weekStartOf(requested);
  if (weekStart > latestWeek) weekStart = latestWeek;
  const weekEnd = addDays(weekStart, 6);

  const [slots, stats] = await Promise.all([
    getFacultySlots(facultyId, weekStart, weekEnd < yesterday ? weekEnd : yesterday),
    getFacultyAttendanceStats(facultyId),
  ]);

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="text-2xl font-semibold tracking-tight">History</h1>
        <p className="text-sm text-muted-foreground">Past consultations week by week. Records are never deleted.</p>
      </FadeIn>
      <FadeIn delay={0.05}>
        <HistoryWeek
          key={`${toDateKey(weekStart)}:${day ? toDateKey(day) : ''}`}
          weekStart={toDateKey(weekStart)}
          latestDay={toDateKey(yesterday)}
          initialDay={day ? toDateKey(day) : undefined}
          slots={slots}
          allTime={stats}
        />
      </FadeIn>
    </div>
  );
}
