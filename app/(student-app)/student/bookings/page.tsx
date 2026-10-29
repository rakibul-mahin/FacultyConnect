import Link from 'next/link';
import { requireStudentPage } from '@/lib/auth/session';
import { getStudentBookings, getStudentQueuePositions } from '@/lib/booking/queries';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CalendarCheck2, CalendarClock, CalendarPlus, CalendarX2, History } from 'lucide-react';
import { FadeIn } from '@/components/motion/fade-in';
import { StaggerList, StaggerItem } from '@/components/motion/stagger-list';
import { BookingCard, type StudentBookingRow } from '@/components/student/booking-card';

function isCancelled(b: StudentBookingRow) {
  return b.status !== 'CONFIRMED' || b.occurrence.status === 'CANCELLED';
}

export default async function StudentBookingsPage({ searchParams }: { searchParams: { tab?: string } }) {
  const session = await requireStudentPage();
  const studentId = session.user.studentProfileId!;
  const [upcomingAll, pastAll, positions] = await Promise.all([
    getStudentBookings(studentId, { upcoming: true }),
    getStudentBookings(studentId, { upcoming: false }),
    getStudentQueuePositions(studentId),
  ]);

  const upcoming = upcomingAll.filter((b) => !isCancelled(b));
  const past = pastAll.filter((b) => !isCancelled(b));
  const cancelled = [...upcomingAll, ...pastAll].filter(isCancelled);

  return (
    <div className="space-y-6">
      <FadeIn className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My bookings</h1>
          <p className="text-sm text-muted-foreground">Your consultations, past and upcoming. Cancel early to free your seat for others.</p>
        </div>
        <Button asChild>
          <Link href="/student/search">
            <CalendarPlus className="h-4 w-4" />
            Book a consultation
          </Link>
        </Button>
      </FadeIn>

      <Tabs defaultValue={['past', 'cancelled'].includes(searchParams.tab ?? '') ? searchParams.tab : 'upcoming'}>
        <TabsList className="flex h-auto w-full rounded-xl border border-border bg-muted/60 p-1 sm:inline-flex sm:w-auto">
          <TabsTrigger value="upcoming" className="flex-1 gap-2 rounded-lg px-2 py-2 sm:flex-none sm:px-4">
            <CalendarCheck2 className="hidden h-4 w-4 sm:block" />
            Upcoming
            <Count n={upcoming.length} />
          </TabsTrigger>
          <TabsTrigger value="past" className="flex-1 gap-2 rounded-lg px-2 py-2 sm:flex-none sm:px-4">
            <History className="hidden h-4 w-4 sm:block" />
            Past
            <Count n={past.length} />
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="flex-1 gap-2 rounded-lg px-2 py-2 sm:flex-none sm:px-4">
            <CalendarX2 className="hidden h-4 w-4 sm:block" />
            Cancelled
            <Count n={cancelled.length} />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-5">
          {upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="No upcoming consultations"
              body="Find a faculty member and pick a slot in the next 7 days."
              cta
            />
          ) : (
            <BookingStack bookings={upcoming} positions={positions} />
          )}
        </TabsContent>
        <TabsContent value="past" className="mt-5">
          {past.length === 0 ? (
            <EmptyState icon={History} title="No past consultations yet" body="Consultations you attend will show up here." />
          ) : (
            <BookingStack bookings={past} past />
          )}
        </TabsContent>
        <TabsContent value="cancelled" className="mt-5">
          {cancelled.length === 0 ? (
            <EmptyState icon={CalendarX2} title="Nothing cancelled" body="Cancelled bookings, by you or by faculty, appear here." />
          ) : (
            <BookingStack bookings={cancelled} past />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Count({ n }: { n: number }) {
  return <span className="rounded-full bg-background/80 px-1.5 text-xs tabular-nums text-muted-foreground">{n}</span>;
}

function BookingStack({ bookings, positions, past }: { bookings: StudentBookingRow[]; positions?: Map<string, number>; past?: boolean }) {
  return (
    <StaggerList className="space-y-3">
      {bookings.map((b) => (
        <StaggerItem key={b.id}>
          <BookingCard booking={b} position={positions?.get(b.occurrenceId)} past={past} />
        </StaggerItem>
      ))}
    </StaggerList>
  );
}

function EmptyState({ icon: Icon, title, body, cta }: { icon: typeof History; title: string; body: string; cta?: boolean }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
      <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-4 font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
      {cta && (
        <Button asChild size="sm" className="mt-5">
          <Link href="/student/search">Find a faculty member</Link>
        </Button>
      )}
    </div>
  );
}
