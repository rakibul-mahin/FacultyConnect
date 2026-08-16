import { requireStudentPage } from '@/lib/auth/session';
import { getStudentBookings } from '@/lib/booking/queries';
import { formatDhakaDate } from '@/lib/timezone';
import { TIME_SLOT_LABELS, BOOKING_TYPE_LABELS, type TimeSlotValue } from '@/lib/constants';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CalendarClock } from 'lucide-react';
import { FadeIn } from '@/components/motion/fade-in';
import { StaggerList, StaggerItem } from '@/components/motion/stagger-list';
import { CancelBookingButton } from '@/components/booking/cancel-booking-button';

export default async function StudentBookingsPage() {
  const session = await requireStudentPage();
  const [upcoming, past] = await Promise.all([
    getStudentBookings(session.user.studentProfileId!, { upcoming: true }),
    getStudentBookings(session.user.studentProfileId!, { upcoming: false }),
  ]);

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="text-2xl font-semibold tracking-tight">My bookings</h1>
        <p className="text-sm text-muted-foreground">
          Mistakenly booked something? Cancel it from the Upcoming tab to free up your seat.
        </p>
      </FadeIn>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming">
          <BookingList bookings={upcoming} allowCancel />
        </TabsContent>
        <TabsContent value="past">
          <BookingList bookings={past} showAttendance />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type BookingRow = Awaited<ReturnType<typeof getStudentBookings>>[number];

function BookingList({ bookings, showAttendance, allowCancel }: { bookings: BookingRow[]; showAttendance?: boolean; allowCancel?: boolean }) {
  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
          <CalendarClock className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nothing here yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <StaggerList className="space-y-3">
      {bookings.map((b) => {
        const cancelledByStudent = b.status === 'CANCELLED_BY_STUDENT';
        return (
          <StaggerItem key={b.id}>
            <Card className={cancelledByStudent ? 'opacity-60' : undefined}>
              <CardContent className="flex flex-col gap-2 pt-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{b.occurrence.faculty.fullName}</p>
                    <Badge variant="outline">{BOOKING_TYPE_LABELS[b.type]}</Badge>
                    {cancelledByStudent && <Badge variant="secondary">You cancelled this</Badge>}
                    {!cancelledByStudent && b.occurrence.status === 'CANCELLED' && <Badge variant="destructive">Faculty cancelled</Badge>}
                    {showAttendance && b.attendance && (
                      <Badge variant={b.attendance.status === 'PRESENT' ? 'success' : 'destructive'}>
                        {b.attendance.status === 'PRESENT' ? 'Present' : 'Absent'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDhakaDate(b.occurrence.date)} · {TIME_SLOT_LABELS[b.occurrence.startSlot as TimeSlotValue]}
                  </p>
                  {b.type === 'THESIS_INTERNSHIP_PROJECT' && b.groupId && <p className="text-sm">Group {b.groupId}</p>}
                  {b.type === 'COURSE' && (
                    <p className="text-sm">
                      {b.courseCode}-{b.section}
                    </p>
                  )}
                  {b.reason && <p className="text-sm text-foreground/80">&ldquo;{b.reason}&rdquo;</p>}
                </div>
                {allowCancel && b.status === 'CONFIRMED' && <CancelBookingButton bookingId={b.id} />}
              </CardContent>
            </Card>
          </StaggerItem>
        );
      })}
    </StaggerList>
  );
}
