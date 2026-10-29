'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { format } from 'date-fns-tz';
import { Check, ChevronDown, Copy, Eye, Mail, MoreHorizontal, UserMinus, UserX, X } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { BOOKING_TYPE_STYLES } from '@/lib/booking/type-style';
import { cn, initialsOf } from '@/lib/utils';
import { markAttendanceAction, removeStudentAction } from '@/app/(faculty-app)/faculty/bookings/actions';
import { CancelReasonDialog } from '@/components/faculty/cancel-reason-dialog';
import type { FacultySlot, RosterBooking } from '@/components/faculty/types';

function typeDetail(b: RosterBooking) {
  if (b.type === 'COURSE') return `${b.courseCode}-${b.section}`;
  if (b.type === 'THESIS_INTERNSHIP_PROJECT' && b.groupId) return `Group ${b.groupId}`;
  return null;
}

async function copyEmail(email: string) {
  try {
    await navigator.clipboard.writeText(email);
    toast.success('Email copied');
  } catch {
    toast.error('Could not copy');
  }
}

/** Booked students for one slot: a table on desktop, stacked cards on mobile. */
export function SlotRoster({ slot }: { slot: FacultySlot }) {
  // Track by id so the sheet shows fresh data (e.g. attendance) after a refresh.
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<RosterBooking | null>(null);
  const [showCancelled, setShowCancelled] = useState(false);

  const confirmed = slot.bookings.filter((b) => b.status === 'CONFIRMED');
  const cancelled = slot.bookings.filter((b) => b.status !== 'CONFIRMED');
  const canRemove = slot.status === 'OPEN' && !slot.started;

  const rowProps = {
    slot,
    canRemove,
    onView: (b: RosterBooking) => setViewingId(b.id),
    onRemove: setRemoving,
  };

  return (
    <div>
      {confirmed.length === 0 ? (
        <div className="flex items-center justify-center gap-2 px-5 py-8 text-sm text-muted-foreground">
          <UserX className="h-4 w-4" />
          No bookings yet
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <table className="hidden w-full text-sm md:table">
            <thead>
              <tr className="border-y border-border bg-muted/40 text-left text-xs font-medium text-muted-foreground">
                <th className="w-12 py-2.5 pl-5 font-medium">#</th>
                <th className="py-2.5 font-medium">Student</th>
                <th className="py-2.5 font-medium">Email</th>
                <th className="py-2.5 font-medium">Type</th>
                <th className="py-2.5 font-medium">Reason</th>
                {slot.started && slot.status === 'OPEN' && <th className="py-2.5 pr-2 font-medium">Attendance</th>}
                <th className="w-12 py-2.5 pr-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {confirmed.map((b) => (
                <DesktopRow key={b.id} booking={b} {...rowProps} />
              ))}
            </tbody>
          </table>

          {/* Mobile cards */}
          <ul className="divide-y divide-border border-t border-border md:hidden">
            {confirmed.map((b) => (
              <MobileRow key={b.id} booking={b} {...rowProps} />
            ))}
          </ul>
        </>
      )}

      {cancelled.length > 0 && (
        <div className="border-t border-border">
          <button
            type="button"
            onClick={() => setShowCancelled((v) => !v)}
            className="flex w-full items-center gap-1.5 px-5 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showCancelled && 'rotate-180')} />
            {cancelled.length} cancelled booking{cancelled.length === 1 ? '' : 's'}
          </button>
          {showCancelled && (
            <ul className="space-y-1 px-5 pb-3">
              {cancelled.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                  <span className="truncate line-through">{b.student.fullName}</span>
                  <span className="shrink-0 text-xs">{b.status === 'CANCELLED_BY_FACULTY' ? 'Removed by you' : 'Cancelled by student'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <BookingDetailsSheet
        booking={slot.bookings.find((b) => b.id === viewingId) ?? null}
        slot={slot}
        onClose={() => setViewingId(null)}
        onRemove={canRemove ? setRemoving : undefined}
      />

      {removing && (
        <CancelReasonDialog
          open
          onOpenChange={(open) => !open && setRemoving(null)}
          title={`Remove ${removing.student.fullName}?`}
          description="Their seat is freed for other students, and they get a notification with your reason."
          affectedCount={1}
          confirmLabel="Remove & notify"
          successMessage="Student removed from this slot."
          onConfirm={(reason) => removeStudentAction({ bookingId: removing.id, reason })}
        />
      )}
    </div>
  );
}

interface RowProps {
  booking: RosterBooking;
  slot: FacultySlot;
  canRemove: boolean;
  onView: (b: RosterBooking) => void;
  onRemove: (b: RosterBooking) => void;
}

function DesktopRow({ booking: b, ...rest }: RowProps) {
  const type = BOOKING_TYPE_STYLES[b.type];
  const TypeIcon = type.icon;
  const detail = typeDetail(b);
  return (
    <tr className="group cursor-pointer transition-colors hover:bg-muted/40" onClick={() => rest.onView(b)}>
      <td className="py-3 pl-5 align-top">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums">{b.position}</span>
      </td>
      <td className="py-3 pr-4 align-top">
        <p className="font-medium">{b.student.fullName}</p>
        <p className="text-xs tabular-nums text-muted-foreground">{b.student.studentId ?? '—'}</p>
      </td>
      <td className="py-3 pr-4 align-top">
        <div className="flex items-center gap-1">
          <span className="max-w-[180px] truncate text-muted-foreground">{b.student.email}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              copyEmail(b.student.email);
            }}
            className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
            aria-label="Copy email"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
      <td className="py-3 pr-4 align-top">
        <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium', type.chip)}>
          <TypeIcon className="h-3 w-3" />
          {type.short}
        </span>
        {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
      </td>
      <td className="max-w-[260px] py-3 pr-4 align-top">
        <p className="truncate text-foreground/80">{b.reason || <span className="text-muted-foreground">—</span>}</p>
      </td>
      {rest.slot.started && rest.slot.status === 'OPEN' && (
        <td className="py-2 pr-2 align-top" onClick={(e) => e.stopPropagation()}>
          <AttendanceToggle booking={b} />
        </td>
      )}
      <td className="py-2 pr-3 align-top" onClick={(e) => e.stopPropagation()}>
        <RowMenu booking={b} {...rest} />
      </td>
    </tr>
  );
}

function MobileRow({ booking: b, ...rest }: RowProps) {
  const type = BOOKING_TYPE_STYLES[b.type];
  const TypeIcon = type.icon;
  return (
    <li className="flex gap-3 px-4 py-3.5" onClick={() => rest.onView(b)}>
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">{b.position}</span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{b.student.fullName}</p>
        <p className="truncate text-xs text-muted-foreground">
          {b.student.studentId ?? '—'} · {b.student.email}
        </p>
        <span className={cn('mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium', type.chip)}>
          <TypeIcon className="h-3 w-3" />
          {type.short}
          {typeDetail(b) && <span className="opacity-75">· {typeDetail(b)}</span>}
        </span>
        {b.reason && <p className="mt-2 line-clamp-2 text-sm text-foreground/80">{b.reason}</p>}
        {rest.slot.started && rest.slot.status === 'OPEN' && (
          <div className="mt-2.5" onClick={(e) => e.stopPropagation()}>
            <AttendanceToggle booking={b} />
          </div>
        )}
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <RowMenu booking={b} {...rest} />
      </div>
    </li>
  );
}

function RowMenu({ booking: b, slot, canRemove, onView, onRemove }: RowProps) {
  const mark = useMarkAttendance();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${b.student.fullName}`}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onSelect={() => onView(b)}>
          <Eye className="h-4 w-4" />
          View details
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => copyEmail(b.student.email)}>
          <Copy className="h-4 w-4" />
          Copy email
        </DropdownMenuItem>
        {slot.started && slot.status === 'OPEN' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => mark(b.id, 'PRESENT')}>
              <Check className="h-4 w-4 text-success" />
              Mark present
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => mark(b.id, 'ABSENT')}>
              <X className="h-4 w-4 text-destructive" />
              Mark absent
            </DropdownMenuItem>
          </>
        )}
        {canRemove && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onRemove(b)} className="text-destructive focus:text-destructive">
              <UserMinus className="h-4 w-4" />
              Remove student
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Inline present/absent switch; the marked state is filled in green or red. */
function AttendanceToggle({ booking: b }: { booking: RosterBooking }) {
  const mark = useMarkAttendance();
  const base = 'flex h-8 w-8 items-center justify-center rounded-lg border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label={`Mark ${b.student.fullName} present`}
        aria-pressed={b.attendance === 'PRESENT'}
        onClick={() => mark(b.id, 'PRESENT')}
        className={cn(base, b.attendance === 'PRESENT' ? 'border-success bg-success text-success-foreground shadow-sm' : 'border-border text-muted-foreground hover:border-success/50 hover:text-success')}
      >
        <Check className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label={`Mark ${b.student.fullName} absent`}
        aria-pressed={b.attendance === 'ABSENT'}
        onClick={() => mark(b.id, 'ABSENT')}
        className={cn(base, b.attendance === 'ABSENT' ? 'border-destructive bg-destructive text-destructive-foreground shadow-sm' : 'border-border text-muted-foreground hover:border-destructive/50 hover:text-destructive')}
      >
        <X className="h-4 w-4" />
      </button>
      {!b.attendance && <span className="ml-1 text-xs text-muted-foreground">Not marked</span>}
    </div>
  );
}

function useMarkAttendance() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  return (bookingId: string, status: 'PRESENT' | 'ABSENT') =>
    startTransition(async () => {
      const res = await markAttendanceAction({ bookingId, status });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(status === 'PRESENT' ? 'Marked present' : 'Marked absent');
      router.refresh();
    });
}

function BookingDetailsSheet({
  booking: b,
  slot,
  onClose,
  onRemove,
}: {
  booking: RosterBooking | null;
  slot: FacultySlot;
  onClose: () => void;
  onRemove?: (b: RosterBooking) => void;
}) {
  const mark = useMarkAttendance();
  const type = b ? BOOKING_TYPE_STYLES[b.type] : null;
  const TypeIcon = type?.icon;

  return (
    <Sheet open={Boolean(b)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent>
        {b && type && TypeIcon && (
          <>
            <div className="border-b border-border bg-gradient-to-b from-accent/60 to-transparent px-6 pb-6 pt-10">
              <Avatar className="h-14 w-14 ring-4 ring-background">
                <AvatarFallback className="bg-gradient-to-br from-primary to-sky-400 text-primary-foreground">{initialsOf(b.student.fullName)}</AvatarFallback>
              </Avatar>
              <SheetTitle className="mt-4 text-xl font-semibold tracking-tight">{b.student.fullName}</SheetTitle>
              <SheetDescription className="text-sm text-muted-foreground">
                #{b.position} in queue · booked {format(b.createdAt, "d MMM, h:mm a", { timeZone: 'Asia/Dhaka' })}
              </SheetDescription>
            </div>

            <dl className="space-y-5 px-6 py-6 text-sm">
              <DetailRow label="Student ID">
                <span className="font-medium tabular-nums">{b.student.studentId ?? '—'}</span>
              </DetailRow>
              <DetailRow label="Email">
                <div className="flex items-center gap-2">
                  <a href={`mailto:${b.student.email}`} className="truncate font-medium text-primary hover:underline">
                    {b.student.email}
                  </a>
                  <button type="button" onClick={() => copyEmail(b.student.email)} className="rounded p-1 text-muted-foreground hover:bg-muted" aria-label="Copy email">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </DetailRow>
              <DetailRow label="Type">
                <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium', type.chip)}>
                  <TypeIcon className="h-3 w-3" />
                  {type.short}
                </span>
                {typeDetail(b) && <p className="mt-1.5 font-medium">{typeDetail(b)}</p>}
              </DetailRow>
              <DetailRow label="Reason">
                {b.reason ? (
                  <p className="whitespace-pre-wrap rounded-lg bg-muted/60 p-3 leading-relaxed">{b.reason}</p>
                ) : (
                  <span className="text-muted-foreground">No reason given</span>
                )}
              </DetailRow>
              {slot.started && (
                <DetailRow label="Attendance">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={b.attendance === 'PRESENT' ? 'default' : 'outline'}
                      className={cn(b.attendance === 'PRESENT' && 'bg-success text-success-foreground hover:bg-success/90')}
                      onClick={() => mark(b.id, 'PRESENT')}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Present
                    </Button>
                    <Button size="sm" variant={b.attendance === 'ABSENT' ? 'destructive' : 'outline'} onClick={() => mark(b.id, 'ABSENT')}>
                      <X className="h-3.5 w-3.5" />
                      Absent
                    </Button>
                  </div>
                </DetailRow>
              )}
            </dl>

            <div className="mt-auto flex gap-2 border-t border-border p-4">
              <Button asChild variant="outline" className="flex-1">
                <a href={`mailto:${b.student.email}`}>
                  <Mail className="h-4 w-4" />
                  Email student
                </a>
              </Button>
              {onRemove && (
                <Button
                  variant="outline"
                  className="flex-1 text-destructive hover:text-destructive"
                  onClick={() => {
                    onClose();
                    onRemove(b);
                  }}
                >
                  <UserMinus className="h-4 w-4" />
                  Remove
                </Button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
