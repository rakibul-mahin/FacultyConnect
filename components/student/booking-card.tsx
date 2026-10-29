import Link from 'next/link';
import { differenceInCalendarDays } from 'date-fns';
import { format } from 'date-fns-tz';
import { Ban, CheckCircle2, Clock, ExternalLink, MapPin, UserX, XCircle } from 'lucide-react';
import { TIME_SLOT_LABELS, type TimeSlotValue } from '@/lib/constants';
import { BOOKING_TYPE_STYLES } from '@/lib/booking/type-style';
import { dhakaToday } from '@/lib/timezone';
import { cn, initialsOf } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { CancelBookingButton } from '@/components/booking/cancel-booking-button';
import type { getStudentBookings } from '@/lib/booking/queries';

export type StudentBookingRow = Awaited<ReturnType<typeof getStudentBookings>>[number];

type Status =
  | { kind: 'confirmed'; position?: number }
  | { kind: 'cancelled-faculty'; reason: string | null; removed: boolean }
  | { kind: 'cancelled-self' }
  | { kind: 'present' }
  | { kind: 'absent' }
  | { kind: 'unmarked' };

export function bookingStatus(b: StudentBookingRow, position?: number, past = false): Status {
  if (b.status === 'CANCELLED_BY_STUDENT') return { kind: 'cancelled-self' };
  if (b.status === 'CANCELLED_BY_FACULTY') return { kind: 'cancelled-faculty', reason: b.cancelReason, removed: true };
  if (b.occurrence.status === 'CANCELLED') {
    return { kind: 'cancelled-faculty', reason: b.occurrence.cancelReason, removed: false };
  }
  if (past) {
    if (b.attendance?.status === 'PRESENT') return { kind: 'present' };
    if (b.attendance?.status === 'ABSENT') return { kind: 'absent' };
    return { kind: 'unmarked' };
  }
  return { kind: 'confirmed', position };
}

export function relativeDay(date: Date) {
  const days = differenceInCalendarDays(date, dhakaToday());
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days > 1) return `In ${days} days`;
  return null;
}

/**
 * One booking as a ticket: a date tile, the faculty and slot, what it's
 * about, and a status pill. Used on the student dashboard (compact) and the
 * My Bookings page.
 */
export function BookingCard({
  booking: b,
  position,
  past = false,
  compact = false,
}: {
  booking: StudentBookingRow;
  position?: number;
  past?: boolean;
  compact?: boolean;
}) {
  const status = bookingStatus(b, position, past);
  const type = BOOKING_TYPE_STYLES[b.type];
  const TypeIcon = type.icon;
  const inactive = status.kind === 'cancelled-self' || status.kind === 'cancelled-faculty';
  const when = relativeDay(b.occurrence.date);
  const detail =
    b.type === 'COURSE' ? `${b.courseCode}-${b.section}` : b.type === 'THESIS_INTERNSHIP_PROJECT' && b.groupId ? `Group ${b.groupId}` : null;

  return (
    <div
      className={cn(
        'group flex gap-4 rounded-2xl border border-border bg-card p-4 transition-all sm:p-5',
        !inactive && !past && 'hover:border-primary/40 hover:shadow-md hover:shadow-primary/5'
      )}
    >
      <DateTile date={b.occurrence.date} tone={inactive ? 'muted' : past ? 'past' : 'active'} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px]">{initialsOf(b.occurrence.faculty.fullName)}</AvatarFallback>
              </Avatar>
              <p className={cn('truncate font-semibold', inactive && 'text-muted-foreground')}>{b.occurrence.faculty.fullName}</p>
            </div>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {TIME_SLOT_LABELS[b.occurrence.startSlot as TimeSlotValue]}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                Seat {b.occurrence.faculty.seat || '—'}
              </span>
              {!past && !inactive && when && <span className="font-medium text-primary">{when}</span>}
            </p>
          </div>
          <StatusPill status={status} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium', type.chip)}>
            <TypeIcon className="h-3 w-3" />
            {type.short}
          </span>
          {detail && <span className="text-xs font-medium text-muted-foreground">{detail}</span>}
        </div>

        {!compact && b.reason && (
          <p className="mt-3 border-l-2 border-border pl-3 text-sm italic text-foreground/80">&ldquo;{b.reason}&rdquo;</p>
        )}

        {status.kind === 'cancelled-faculty' && status.reason && (
          <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm">
            <span className="font-medium text-destructive">Faculty&apos;s note: </span>
            <span className="text-foreground/80">{status.reason}</span>
          </div>
        )}

        {!compact && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="ghost" className="text-muted-foreground">
              <Link href={`/faculty/${b.occurrence.faculty.publicId}`}>
                <ExternalLink className="h-3.5 w-3.5" />
                Faculty page
              </Link>
            </Button>
            {!past && b.status === 'CONFIRMED' && b.occurrence.status === 'OPEN' && <CancelBookingButton bookingId={b.id} />}
          </div>
        )}
      </div>
    </div>
  );
}

export function DateTile({ date, tone }: { date: Date; tone: 'active' | 'past' | 'muted' }) {
  return (
    <div
      className={cn(
        'flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-xl text-center sm:h-[72px] sm:w-16',
        tone === 'active' && 'bg-gradient-to-b from-primary to-sky-500 text-primary-foreground shadow-sm shadow-primary/30 dark:text-white',
        tone === 'past' && 'bg-muted text-foreground',
        tone === 'muted' && 'bg-muted/60 text-muted-foreground'
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{format(date, 'EEE', { timeZone: 'UTC' })}</span>
      <span className="text-xl font-bold leading-none tabular-nums sm:text-2xl">{format(date, 'd', { timeZone: 'UTC' })}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{format(date, 'MMM', { timeZone: 'UTC' })}</span>
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  const base = 'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold';
  switch (status.kind) {
    case 'confirmed':
      return (
        <span className={cn(base, 'bg-success/10 text-success')}>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          Confirmed{status.position ? ` · #${status.position} in queue` : ''}
        </span>
      );
    case 'cancelled-faculty':
      return (
        <span className={cn(base, 'bg-destructive/10 text-destructive')}>
          <Ban className="h-3.5 w-3.5" />
          {status.removed ? 'Removed by faculty' : 'Cancelled by faculty'}
        </span>
      );
    case 'cancelled-self':
      return (
        <span className={cn(base, 'bg-muted text-muted-foreground')}>
          <XCircle className="h-3.5 w-3.5" />
          You cancelled
        </span>
      );
    case 'present':
      return (
        <span className={cn(base, 'bg-success/10 text-success')}>
          <CheckCircle2 className="h-3.5 w-3.5" />
          Attended
        </span>
      );
    case 'absent':
      return (
        <span className={cn(base, 'bg-destructive/10 text-destructive')}>
          <UserX className="h-3.5 w-3.5" />
          Absent
        </span>
      );
    case 'unmarked':
      return <span className={cn(base, 'bg-muted text-muted-foreground')}>Attendance not marked</span>;
  }
}
