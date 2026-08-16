import Link from 'next/link';
import { requireFacultyPage } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { ensureOccurrences } from '@/lib/booking/occurrences';
import { getFacultyUpcomingOccurrences, getFacultyAttendanceStats } from '@/lib/booking/queries';
import { dhakaToday, dhakaWeekdayOf, formatDhakaDate } from '@/lib/timezone';
import { TIME_SLOT_LABELS, WEEKDAY_LABELS, type TimeSlotValue } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CalendarRange,
  Upload,
  Plus,
  ClipboardList,
  History,
  QrCode,
  UserCog,
  Users,
  Clock,
} from 'lucide-react';
import { EntryBadge } from '@/components/routine/entry-badge';
import { DashboardWeekGrid } from '@/components/routine/dashboard-week-grid';
import { FadeIn } from '@/components/motion/fade-in';
import { StaggerList, StaggerItem } from '@/components/motion/stagger-list';

export default async function FacultyDashboardPage() {
  const session = await requireFacultyPage();
  const facultyId = session.user.facultyProfileId!;

  const profile = await prisma.facultyProfile.findUniqueOrThrow({ where: { id: facultyId } });
  await ensureOccurrences(facultyId);

  const today = dhakaToday();
  const todayWeekday = dhakaWeekdayOf(today);

  const [todayEntries, weekEntries, upcoming, stats] = await Promise.all([
    prisma.routineEntry.findMany({ where: { facultyId, day: todayWeekday as never }, orderBy: { startSlot: 'asc' } }),
    prisma.routineEntry.findMany({ where: { facultyId }, orderBy: [{ day: 'asc' }, { startSlot: 'asc' }] }),
    getFacultyUpcomingOccurrences(facultyId, 5),
    getFacultyAttendanceStats(facultyId),
  ]);

  const upcomingBookingCount = upcoming.reduce((sum, o) => sum + o.bookings.length, 0);
  const profileIncomplete = !profile.initial || !profile.seat;

  return (
    <div className="space-y-8">
      <FadeIn className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">{formatDhakaDate(today)}</p>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {profile.fullName.split(' ')[0]}</h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="outline">{profile.initial || 'Set initial'}</Badge>
            <Badge variant="outline">Seat {profile.seat || '—'}</Badge>
          </div>
        </div>
      </FadeIn>

      {profileIncomplete && (
        <FadeIn>
          <Card className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
            <CardContent className="flex flex-col justify-between gap-3 pt-6 sm:flex-row sm:items-center">
              <p className="text-sm text-amber-900 dark:text-amber-200">
                Your profile is missing an initial or seat number — students see these on your public page.
              </p>
              <Button asChild size="sm" variant="outline">
                <Link href="/faculty/profile">Complete profile</Link>
              </Button>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      <StaggerList className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StaggerItem>
          <StatCard label="Today" value={`${todayEntries.length} slots`} icon={Clock} />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Upcoming bookings" value={String(upcomingBookingCount)} icon={Users} />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Total present" value={String(stats.totalPresent)} icon={ClipboardList} />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Total absent" value={String(stats.totalAbsent)} icon={ClipboardList} />
        </StaggerItem>
      </StaggerList>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Today&apos;s schedule — {WEEKDAY_LABELS[todayWeekday as keyof typeof WEEKDAY_LABELS]}</CardTitle>
            <CardDescription>What&apos;s on your routine today</CardDescription>
          </CardHeader>
          <CardContent>
            {todayEntries.length === 0 ? (
              <EmptyToday />
            ) : (
              <StaggerList as="list" className="divide-y divide-border">
                {todayEntries.map((e) => (
                  <StaggerItem as="list" key={e.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="w-24 shrink-0 text-sm font-medium text-muted-foreground">
                      {TIME_SLOT_LABELS[e.startSlot as TimeSlotValue]}
                    </div>
                    <div className="flex-1">
                      <EntryBadge entry={e} />
                    </div>
                  </StaggerItem>
                ))}
              </StaggerList>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming consultations</CardTitle>
            <CardDescription>Next {upcoming.length} open slots</CardDescription>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No consultation slots configured yet. Add one from your routine.
              </p>
            ) : (
              <StaggerList as="list" className="space-y-3">
                {upcoming.map((o) => (
                  <StaggerItem as="list" key={o.id}>
                    <Link
                      href={`/faculty/bookings/${o.id}`}
                      className="flex items-center justify-between rounded-lg border border-border p-3 text-sm transition-all hover:border-primary hover:bg-muted hover:scale-[1.01]"
                    >
                      <div>
                        <p className="font-medium">{formatDhakaDate(o.date)}</p>
                        <p className="text-xs text-muted-foreground">{TIME_SLOT_LABELS[o.startSlot as TimeSlotValue]}</p>
                      </div>
                      <Badge variant={o.bookings.length >= o.capacity ? 'warning' : 'secondary'}>
                        {o.bookings.length} / {o.capacity}
                      </Badge>
                    </Link>
                  </StaggerItem>
                ))}
              </StaggerList>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly routine</CardTitle>
          <CardDescription>Your recurring Saturday–Friday schedule</CardDescription>
        </CardHeader>
        <CardContent>
          <DashboardWeekGrid entries={weekEntries} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick actions</CardTitle>
        </CardHeader>
        <CardContent>
          <StaggerList className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StaggerItem><QuickAction href="/faculty/routine" label="Edit Routine" icon={CalendarRange} /></StaggerItem>
            <StaggerItem><QuickAction href="/faculty/routine/import" label="Import Routine" icon={Upload} /></StaggerItem>
            <StaggerItem><QuickAction href="/faculty/routine?add=consultation" label="Add Consultation" icon={Plus} /></StaggerItem>
            <StaggerItem><QuickAction href="/faculty/bookings" label="View Bookings" icon={ClipboardList} /></StaggerItem>
            <StaggerItem><QuickAction href="/faculty/history" label="History" icon={History} /></StaggerItem>
            <StaggerItem><QuickAction href="/faculty/qr" label="Generate QR" icon={QrCode} /></StaggerItem>
            <StaggerItem><QuickAction href="/faculty/profile" label="Edit Profile" icon={UserCog} /></StaggerItem>
          </StaggerList>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Clock }) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="flex items-center gap-3 pt-6">
        <div className="rounded-lg bg-accent p-2 text-accent-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-lg font-semibold leading-none">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickAction({ href, label, icon: Icon }: { href: string; label: string; icon: typeof Clock }) {
  return (
    <Button asChild variant="outline" className="h-auto w-full flex-col gap-2 py-4 transition-all hover:scale-[1.03] hover:border-primary hover:text-primary">
      <Link href={href}>
        <Icon className="h-5 w-5" />
        <span className="text-xs font-medium">{label}</span>
      </Link>
    </Button>
  );
}

function EmptyToday() {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <Clock className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-medium">Nothing scheduled today</p>
      <p className="text-xs text-muted-foreground">Enjoy the free day, or add something to your routine.</p>
    </div>
  );
}
