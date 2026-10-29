import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStudentProfileById, requireStudentPage } from '@/lib/auth/session';
import { getStudentBookings, getStudentNotifications, getStudentQueuePositions } from '@/lib/booking/queries';
import { formatDhakaDate, dhakaToday } from '@/lib/timezone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, CalendarCheck2, CalendarClock, CheckCircle2, Clock, Search, UserCog } from 'lucide-react';
import { FadeIn } from '@/components/motion/fade-in';
import { StaggerList, StaggerItem } from '@/components/motion/stagger-list';
import { BookingCard } from '@/components/student/booking-card';
import { NextUp, NoUpcomingHero } from '@/components/student/dashboard-hero';
import { CancellationAlerts } from '@/components/student/cancellation-alerts';

export default async function StudentDashboardPage() {
  const session = await requireStudentPage();
  const studentId = session.user.studentProfileId!;
  const [profile, upcomingRaw, pastRaw, notifications, positions] = await Promise.all([
    getStudentProfileById(studentId),
    getStudentBookings(studentId, { upcoming: true }),
    getStudentBookings(studentId, { upcoming: false }),
    getStudentNotifications(studentId),
    getStudentQueuePositions(studentId),
  ]);
  if (!profile) notFound();

  // Self-cancelled bookings aren't real commitments anymore — leave them out
  // of the summary (they still show, clearly marked, on My Bookings).
  const upcoming = upcomingRaw.filter((b) => b.status === 'CONFIRMED');
  const next = upcoming.find((b) => b.occurrence.status === 'OPEN');
  const rest = upcoming.filter((b) => b !== next);
  const attended = pastRaw.filter((b) => b.attendance?.status === 'PRESENT').length;
  const totalBooked = [...upcomingRaw, ...pastRaw].filter((b) => b.status !== 'CANCELLED_BY_STUDENT').length;
  const profileIncomplete = !profile.studentId;

  return (
    <div className="space-y-8">
      <FadeIn>
        <p className="text-sm text-muted-foreground">{formatDhakaDate(dhakaToday())}</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Hi, {profile.fullName.split(' ')[0]} 👋</h1>
      </FadeIn>

      <CancellationAlerts items={notifications.items.filter((n) => !n.readAt).slice(0, 3)} />

      {profileIncomplete && (
        <FadeIn>
          <Card className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
            <CardContent className="flex flex-col justify-between gap-3 pt-6 sm:flex-row sm:items-center">
              <p className="text-sm text-amber-900 dark:text-amber-200">Complete your profile before booking a consultation.</p>
              <Button asChild size="sm" variant="outline">
                <Link href="/student/profile">Complete profile</Link>
              </Button>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      <FadeIn delay={0.04}>{next ? <NextUp booking={next} position={positions.get(next.occurrenceId)} /> : <NoUpcomingHero />}</FadeIn>

      <StaggerList className="grid grid-cols-3 gap-3">
        <StaggerItem>
          <Stat icon={CalendarClock} label="Upcoming" value={upcoming.length} tone="text-primary bg-accent" />
        </StaggerItem>
        <StaggerItem>
          <Stat icon={CheckCircle2} label="Attended" value={attended} tone="text-success bg-success/10" />
        </StaggerItem>
        <StaggerItem>
          <Stat icon={CalendarCheck2} label="Total booked" value={totalBooked} tone="text-violet-600 bg-violet-500/10 dark:text-violet-300" />
        </StaggerItem>
      </StaggerList>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Also coming up</h2>
            <Link href="/student/bookings" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          {rest.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
              {next ? 'Nothing else booked this week.' : 'Your upcoming consultations will appear here.'}
            </div>
          ) : (
            <StaggerList className="space-y-3">
              {rest.slice(0, 5).map((b) => (
                <StaggerItem key={b.id}>
                  <BookingCard booking={b} position={positions.get(b.occurrenceId)} compact />
                </StaggerItem>
              ))}
            </StaggerList>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold">Quick actions</h2>
          <div className="space-y-2">
            <QuickAction href="/student/search" icon={Search} label="Search faculty" hint="Find by name, initial or email" />
            <QuickAction href="/student/bookings" icon={CalendarCheck2} label="My bookings" hint="Upcoming, past and cancelled" />
            <QuickAction href="/student/profile" icon={UserCog} label="Edit profile" hint="Student ID and name" />
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: typeof Clock; label: string; value: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-3 text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground sm:text-sm">{label}</p>
    </div>
  );
}

function QuickAction({ href, icon: Icon, label, hint }: { href: string; icon: typeof Search; label: string; hint: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 transition-all hover:border-primary/40 hover:shadow-sm"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block truncate text-xs text-muted-foreground">{hint}</span>
      </span>
      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}
