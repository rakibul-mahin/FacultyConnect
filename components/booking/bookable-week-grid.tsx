'use client';

import { useState } from 'react';
import { WEEKDAYS, WEEKDAY_LABELS, WEEKDAY_SHORT, TIME_SLOTS, TIME_SLOT_LABELS, type WeekdayValue } from '@/lib/constants';
import { dhakaToday, dhakaWeekdayOf, formatDhakaDate } from '@/lib/timezone';
import { EntryBadge, type EntryLike } from '@/components/routine/entry-badge';
import { EntryLegend } from '@/components/routine/entry-legend';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookingDialog } from '@/components/booking/booking-dialog';
import { cn } from '@/lib/utils';
import { CalendarDays } from 'lucide-react';
import type { OccurrenceForBooking } from '@/components/booking/types';

interface RoutineEntryLike extends EntryLike {
  day: string;
  startSlot: string;
}

/**
 * The single booking surface for students (§34-35, §67): the official
 * weekly grid itself is interactive — a consultation cell shows the nearest
 * upcoming date's booked/capacity count and opens a date picker + booking
 * dialog right there, instead of a separate list further down the page.
 * Below lg, nine columns never fit (§47): a day selector + vertical list
 * replaces the table.
 */
export function BookableWeekGrid({
  entries,
  occurrences,
  facultyName,
  canBook,
  profileIncomplete,
}: {
  entries: RoutineEntryLike[];
  occurrences: OccurrenceForBooking[];
  facultyName: string;
  canBook: boolean;
  profileIncomplete: boolean;
}) {
  const [target, setTarget] = useState<OccurrenceForBooking | null>(null);
  const [mobileDay, setMobileDay] = useState<WeekdayValue>(() => dhakaWeekdayOf(dhakaToday()) as WeekdayValue);

  const entryGrid: Record<string, Record<string, RoutineEntryLike | undefined>> = {};
  for (const day of WEEKDAYS) entryGrid[day] = {};
  for (const e of entries) entryGrid[e.day]![e.startSlot] = e;

  const occurrencesBySlot = new Map<string, OccurrenceForBooking[]>();
  for (const occ of occurrences) {
    const day = dhakaWeekdayOf(occ.date);
    const key = `${day}-${occ.startSlot}`;
    const arr = occurrencesBySlot.get(key) ?? [];
    arr.push(occ);
    occurrencesBySlot.set(key, arr);
  }

  return (
    <div className="space-y-3">
      <EntryLegend />
      {canBook && profileIncomplete && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Complete your profile before booking.
        </div>
      )}

      {/* Desktop grid */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[1100px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="w-28 border-b border-border p-2 text-left text-xs font-medium text-muted-foreground">Day</th>
              {TIME_SLOTS.map((slot) => (
                <th key={slot} className="border-b border-border p-2 text-center text-xs font-medium text-muted-foreground">
                  {TIME_SLOT_LABELS[slot]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEEKDAYS.map((day) => (
              <tr key={day}>
                <td className="border-b border-border p-2 align-top text-xs font-semibold">{WEEKDAY_LABELS[day]}</td>
                {TIME_SLOTS.map((slot) => {
                  const entry = entryGrid[day]?.[slot];
                  if (entry?.type === 'CONSULTATION') {
                    const slotOccurrences = occurrencesBySlot.get(`${day}-${slot}`) ?? [];
                    return (
                      <td key={slot} className="min-w-[120px] border-b border-border p-1.5 align-top text-center">
                        <ConsultationCell
                          occurrences={slotOccurrences}
                          canBook={canBook}
                          profileIncomplete={profileIncomplete}
                          onBook={setTarget}
                        />
                      </td>
                    );
                  }
                  return (
                    <td key={slot} className="min-w-[120px] border-b border-border p-1.5 align-top text-center">
                      {entry ? <EntryBadge entry={entry} compact /> : <span className="text-xs text-muted-foreground/50">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: day selector + vertical list */}
      <div className="lg:hidden">
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
          {WEEKDAYS.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => setMobileDay(day)}
              className={cn(
                'shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                mobileDay === day ? 'border-primary bg-primary text-primary-foreground' : 'border-input text-muted-foreground'
              )}
            >
              {WEEKDAY_SHORT[day]}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {TIME_SLOTS.map((slot) => {
            const entry = entryGrid[mobileDay]?.[slot];
            return (
              <div key={slot} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">{TIME_SLOT_LABELS[slot]}</span>
                <span className="min-w-0 flex-1">
                  {entry?.type === 'CONSULTATION' ? (
                    <ConsultationCell
                      occurrences={occurrencesBySlot.get(`${mobileDay}-${slot}`) ?? []}
                      canBook={canBook}
                      profileIncomplete={profileIncomplete}
                      onBook={setTarget}
                    />
                  ) : entry ? (
                    <EntryBadge entry={entry} compact />
                  ) : (
                    <span className="text-xs text-muted-foreground/50">—</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {target && (
        <BookingDialog
          open={Boolean(target)}
          onOpenChange={(open) => !open && setTarget(null)}
          occurrenceId={target.id}
          date={target.date}
          startSlot={target.startSlot}
          facultyName={facultyName}
        />
      )}
    </div>
  );
}

function ConsultationCell({
  occurrences,
  canBook,
  profileIncomplete,
  onBook,
}: {
  occurrences: OccurrenceForBooking[];
  canBook: boolean;
  profileIncomplete: boolean;
  onBook: (occ: OccurrenceForBooking) => void;
}) {
  if (occurrences.length === 0) {
    return (
      <div className="rounded-md border border-consultation/25 bg-consultation-bg px-2 py-1.5 text-xs font-medium text-consultation">
        Consultation
      </div>
    );
  }

  const next = occurrences[0]!;
  const summaryVariant = next.status === 'CANCELLED' ? 'destructive' : next.isFull ? 'warning' : 'secondary';
  const summaryLabel =
    next.status === 'CANCELLED'
      ? 'Cancelled'
      : next.myBookingPosition
        ? `Booked #${next.myBookingPosition}`
        : next.isFull
          ? 'FULLY BOOKED'
          : `${next.bookedCount}/${next.capacity} booked`;

  const canInteract = canBook && !profileIncomplete;

  const trigger = (
    <button
      type="button"
      className={cn(
        'flex w-full flex-col items-center gap-1 rounded-lg border border-consultation/25 bg-consultation-bg p-1.5 transition-all',
        canInteract ? 'hover:scale-[1.02] hover:border-consultation/50' : 'cursor-default'
      )}
    >
      <Badge variant={summaryVariant}>{summaryLabel}</Badge>
      {occurrences.length > 1 && (
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <CalendarDays className="h-3 w-3" />
          {occurrences.length} dates
        </span>
      )}
    </button>
  );

  if (!canInteract) return trigger;

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="center" className="w-[calc(100vw-2.5rem)] max-w-72 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Upcoming dates</p>
        <div className="space-y-1.5">
          {occurrences.map((occ) => (
            <div key={occ.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-2 text-sm">
              <div>
                <p className="font-medium">{formatDhakaDate(occ.date)}</p>
                <Badge variant={occ.status === 'CANCELLED' ? 'destructive' : occ.isFull ? 'warning' : 'secondary'} className="mt-1">
                  {occ.status === 'CANCELLED' ? 'Cancelled' : occ.isFull ? 'FULLY BOOKED' : `${occ.bookedCount} / ${occ.capacity} booked`}
                </Badge>
                {occ.myBookingPosition && <p className="mt-1 text-xs font-medium text-primary">You are #{occ.myBookingPosition}</p>}
              </div>
              <Button size="sm" disabled={!occ.isBookable || Boolean(occ.myBookingPosition)} onClick={() => onBook(occ)}>
                {occ.myBookingPosition ? 'Booked' : occ.isPast ? 'Closed' : 'Book'}
              </Button>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
