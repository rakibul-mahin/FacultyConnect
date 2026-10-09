import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStudentProfileById, requireStudentPage } from '@/lib/auth/session';
import { getStudentBookings } from '@/lib/booking/queries';
import { formatDhakaDate, dhakaToday } from '@/lib/timezone';
import { TIME_SLOT_LABELS, BOOKING_TYPE_LABELS, type TimeSlotValue } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, CalendarCheck2, UserCog, CalendarClock } from 'lucide-react';
import { FadeIn } from '@/components/motion/fade-in';
import { StaggerList, StaggerItem } from '@/components/motion/stagger-list';

export default async function StudentDashboardPage() {
  const session = await requireStudentPage();
  const [profile, upcomingRaw] = await Promise.all([
    getStudentProfileById(session.user.studentProfileId!),
    getStudentBookings(session.user.studentProfileId!, { upcoming: true }),
  ]);
  if (!profile) notFound();
  // Self-cancelled bookings aren't real commitments anymore — leave them out
  // of this summary widget (they still show, clearly marked, on the full
  // My Bookings page for history's sake).
  const upcoming = upcomingRaw.filter((b) => b.status === 'CONFIRMED');
  const profileIncomplete = !profile.studentId;

  return (
    <div className="space-y-8">
      <FadeIn>
        <p className="text-sm text-muted-foreground">{formatDhakaDate(dhakaToday())}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Hi, {profile.fullName.split(' ')[0]}</h1>
      </FadeIn>

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

      <StaggerList className="grid gap-3 sm:grid-cols-3">
        <StaggerItem><QuickAction href="/student/search" label="Search Faculty" icon={Search} /></StaggerItem>
        <StaggerItem><QuickAction href="/student/bookings" label="My Bookings" icon={CalendarCheck2} /></StaggerItem>
        <StaggerItem><QuickAction href="/student/profile" label="Edit Profile" icon={UserCog} /></StaggerItem>
      </StaggerList>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming bookings</CardTitle>
          <CardDescription>{upcoming.length} upcoming consultation(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <CalendarClock className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">No upcoming bookings</p>
              <Button asChild size="sm" className="mt-2">
                <Link href="/student/search">Find a faculty member</Link>
              </Button>
            </div>
          ) : (
            <StaggerList as="list" className="divide-y divide-border">
              {upcoming.slice(0, 8).map((b) => (
                <StaggerItem as="list" key={b.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{b.occurrence.faculty.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDhakaDate(b.occurrence.date)} · {TIME_SLOT_LABELS[b.occurrence.startSlot as TimeSlotValue]}
                    </p>
                  </div>
                  <Badge variant={b.status === 'CANCELLED_BY_FACULTY' || b.occurrence.status === 'CANCELLED' ? 'destructive' : 'secondary'}>
                    {b.occurrence.status === 'CANCELLED' ? 'Cancelled' : BOOKING_TYPE_LABELS[b.type]}
                  </Badge>
                </StaggerItem>
              ))}
            </StaggerList>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function QuickAction({ href, label, icon: Icon }: { href: string; label: string; icon: typeof Search }) {
  return (
    <Button asChild variant="outline" className="h-auto w-full flex-col gap-2 py-6 transition-all hover:scale-[1.03] hover:border-primary hover:text-primary">
      <Link href={href}>
        <Icon className="h-5 w-5" />
        <span className="text-sm font-medium">{label}</span>
      </Link>
    </Button>
  );
}
