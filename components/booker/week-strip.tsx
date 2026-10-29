'use client';

import { motion } from 'motion/react';
import { format } from 'date-fns-tz';
import { cn } from '@/lib/utils';
import type { OccurrenceForBooking } from '@/components/booking/types';

export interface StripDay {
  key: string;
  date: Date;
  occurrences: OccurrenceForBooking[];
}

/**
 * Seven-day picker (tomorrow → +6, the whole booking window). Each day shows
 * a dot per consultation slot, coloured by whether it can still be booked.
 * The selected-day pill is a shared layout element so it glides between days.
 */
export function WeekStrip({
  days,
  selectedKey,
  onSelect,
}: {
  days: StripDay[];
  selectedKey: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="grid grid-cols-7 gap-1 sm:gap-2" role="listbox" aria-label="Select a day">
      {days.map((day) => {
        const selected = day.key === selectedKey;
        const hasSlots = day.occurrences.length > 0;
        const openCount = day.occurrences.filter((o) => o.isBookable && !o.myBookingPosition).length;
        return (
          <button
            key={day.key}
            type="button"
            role="option"
            aria-selected={selected}
            disabled={!hasSlots}
            onClick={() => onSelect(day.key)}
            className={cn(
              'relative flex flex-col items-center gap-1 rounded-xl px-1 py-2.5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:py-3',
              !hasSlots && 'cursor-not-allowed opacity-40',
              hasSlots && !selected && 'bg-accent/50 hover:bg-accent',
              selected && 'text-primary-foreground'
            )}
          >
            {selected && (
              <motion.span
                layoutId="booker-day-pill"
                className="absolute inset-0 rounded-xl bg-primary shadow-md shadow-primary/25"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span
              className={cn(
                'relative text-[10px] font-medium uppercase tracking-wide sm:text-[11px]',
                selected ? 'text-primary-foreground/80' : 'text-muted-foreground'
              )}
            >
              {format(day.date, 'EEE', { timeZone: 'UTC' })}
            </span>
            <span className="relative text-base font-semibold tabular-nums sm:text-lg">
              {format(day.date, 'd', { timeZone: 'UTC' })}
            </span>
            <span className="relative flex h-1.5 items-center gap-0.5">
              {day.occurrences.slice(0, 4).map((occ) => (
                <span
                  key={occ.id}
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    selected
                      ? 'bg-primary-foreground/80'
                      : occ.isBookable && !occ.myBookingPosition
                        ? 'bg-consultation'
                        : 'bg-muted-foreground/40'
                  )}
                />
              ))}
            </span>
            <span className="sr-only">
              {hasSlots ? `${openCount} open slot${openCount === 1 ? '' : 's'}` : 'No consultations'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
