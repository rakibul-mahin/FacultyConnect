import { notFound } from 'next/navigation';
import { requireFacultyPage } from '@/lib/auth/session';
import { getFacultyOccurrenceRoster } from '@/lib/booking/queries';
import { formatDhakaDate } from '@/lib/timezone';
import { TIME_SLOT_LABELS, BOOKING_TYPE_LABELS, type TimeSlotValue } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CancelOccurrenceButton } from '@/components/booking/cancel-occurrence-button';
import { AttendanceControl } from '@/components/booking/attendance-control';
import { Mail, IdCard, BookOpen, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export default async function OccurrenceRosterPage({ params }: { params: { occurrenceId: string } }) {
  const session = await requireFacultyPage();

  let occurrence;
  try {
    occurrence = await getFacultyOccurrenceRoster(session.user.facultyProfileId!, params.occurrenceId);
  } catch {
    // Not found, or belongs to another faculty — either way, don't leak existence.
    notFound();
  }

  const confirmedBookings = occurrence.bookings.filter((b) => b.status === 'CONFIRMED');

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm text-muted-foreground">{formatDhakaDate(occurrence.date)}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{TIME_SLOT_LABELS[occurrence.startSlot as TimeSlotValue]}</h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={occurrence.status === 'CANCELLED' ? 'destructive' : confirmedBookings.length >= occurrence.capacity ? 'warning' : 'secondary'}>
              <Users className="h-3 w-3" />
              {confirmedBookings.length} / {occurrence.capacity} booked
            </Badge>
            {occurrence.status === 'CANCELLED' && <Badge variant="destructive">Cancelled</Badge>}
          </div>
        </div>
        {occurrence.status === 'OPEN' && <CancelOccurrenceButton occurrenceId={occurrence.id} bookedCount={confirmedBookings.length} />}
      </div>

      {occurrence.status === 'CANCELLED' && occurrence.cancelReason && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-6 text-sm text-destructive">Cancellation note: {occurrence.cancelReason}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Roster</CardTitle>
        </CardHeader>
        <CardContent>
          {occurrence.bookings.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No one has booked this slot yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {(() => {
                let confirmedSeen = 0;
                return occurrence.bookings.map((booking) => {
                  const isConfirmed = booking.status === 'CONFIRMED';
                  if (isConfirmed) confirmedSeen += 1;
                  return (
                    <div
                      key={booking.id}
                      className={cn('flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between', !isConfirmed && 'opacity-60')}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {isConfirmed ? `#${confirmedSeen} ` : ''}
                            {booking.student.fullName}
                          </span>
                          <Badge variant="outline">{BOOKING_TYPE_LABELS[booking.type]}</Badge>
                          {booking.status === 'CANCELLED_BY_FACULTY' && <Badge variant="destructive">Cancelled by faculty</Badge>}
                          {booking.status === 'CANCELLED_BY_STUDENT' && <Badge variant="secondary">Cancelled by student</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <IdCard className="h-3 w-3" />
                            {booking.student.studentId ?? '—'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {booking.student.email}
                          </span>
                          {booking.type === 'THESIS_INTERNSHIP_PROJECT' && <span>Group {booking.groupId}</span>}
                          {booking.type === 'COURSE' && (
                            <span className="flex items-center gap-1">
                              <BookOpen className="h-3 w-3" />
                              {booking.courseCode}-{booking.section}
                            </span>
                          )}
                        </div>
                        {booking.reason && <p className="max-w-lg text-sm text-foreground/90">&ldquo;{booking.reason}&rdquo;</p>}
                      </div>
                      {isConfirmed && <AttendanceControl bookingId={booking.id} current={booking.attendance?.status ?? null} />}
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
