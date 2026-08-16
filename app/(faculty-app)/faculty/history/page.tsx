import Link from 'next/link';
import { requireFacultyPage } from '@/lib/auth/session';
import { getFacultyHistory } from '@/lib/booking/queries';
import { formatDhakaDate } from '@/lib/timezone';
import { TIME_SLOT_LABELS, BOOKING_TYPE_LABELS, type TimeSlotValue } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AttendanceControl } from '@/components/booking/attendance-control';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { FadeIn } from '@/components/motion/fade-in';
import { StaggerList, StaggerItem } from '@/components/motion/stagger-list';
import { cn } from '@/lib/utils';

export default async function FacultyHistoryPage({ searchParams }: { searchParams: { page?: string } }) {
  const session = await requireFacultyPage();
  const page = Math.max(1, Number(searchParams.page ?? '1') || 1);
  const { occurrences, total, totalPages } = await getFacultyHistory(session.user.facultyProfileId!, { page, pageSize: 15 });

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="text-2xl font-semibold tracking-tight">History</h1>
        <p className="text-sm text-muted-foreground">{total} past consultation slot(s). Historical records are never deleted.</p>
      </FadeIn>

      {occurrences.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">No past consultations yet.</CardContent>
        </Card>
      ) : (
        <StaggerList className="space-y-4">
          {occurrences.map((occ) => (
            <StaggerItem key={occ.id}>
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">
                    {formatDhakaDate(occ.date)} · {TIME_SLOT_LABELS[occ.startSlot as TimeSlotValue]}
                  </CardTitle>
                </div>
                {occ.status === 'CANCELLED' ? (
                  <Badge variant="destructive">Cancelled</Badge>
                ) : (
                  <Badge variant="secondary">{occ.bookings.filter((b) => b.status === 'CONFIRMED').length} booked</Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {occ.bookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No bookings.</p>
                ) : (
                  occ.bookings.map((b) => (
                    <div
                      key={b.id}
                      className={cn(
                        'flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between',
                        b.status !== 'CONFIRMED' && 'opacity-60'
                      )}
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{b.student.fullName}</p>
                          {b.status === 'CANCELLED_BY_STUDENT' && <Badge variant="secondary">Cancelled by student</Badge>}
                          {b.status === 'CANCELLED_BY_FACULTY' && <Badge variant="destructive">Cancelled by faculty</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {BOOKING_TYPE_LABELS[b.type]} · {b.student.studentId ?? '—'}
                        </p>
                      </div>
                      {b.status === 'CONFIRMED' && <AttendanceControl bookingId={b.id} current={b.attendance?.status ?? null} />}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
            </StaggerItem>
          ))}
        </StaggerList>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button asChild variant="outline" size="sm" disabled={page <= 1}>
            <Link href={`/faculty/history?page=${page - 1}`} aria-disabled={page <= 1}>
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Link>
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button asChild variant="outline" size="sm" disabled={page >= totalPages}>
            <Link href={`/faculty/history?page=${page + 1}`} aria-disabled={page >= totalPages}>
              Next
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
