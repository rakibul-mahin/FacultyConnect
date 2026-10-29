'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { Ban, CheckCircle2, ChevronRight, Lock } from 'lucide-react';
import { TIME_SLOT_LABELS, type TimeSlotValue } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { OccurrenceForBooking } from '@/components/booking/types';

const list = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045 } },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
};

/**
 * Seat-pressure colour, following the same thresholds Cal.com uses for its
 * seated events: comfortable below half, warning from half, urgent near full.
 */
function seatTone(booked: number, capacity: number) {
  const ratio = capacity > 0 ? booked / capacity : 1;
  if (ratio >= 0.83) return { dot: 'bg-rose-500', bar: 'bg-rose-500' };
  if (ratio >= 0.5) return { dot: 'bg-amber-500', bar: 'bg-amber-500' };
  return { dot: 'bg-emerald-500', bar: 'bg-emerald-500' };
}

export function SlotList({
  occurrences,
  interactive,
  onPick,
}: {
  occurrences: OccurrenceForBooking[];
  /** False in faculty preview: slots render normally but can't be picked. */
  interactive: boolean;
  onPick: (occ: OccurrenceForBooking) => void;
}) {
  return (
    <motion.ul variants={list} initial="hidden" animate="show" className="space-y-2.5">
      {occurrences.map((occ) => (
        <motion.li key={occ.id} variants={item}>
          <SlotRow occ={occ} interactive={interactive} onPick={onPick} />
        </motion.li>
      ))}
    </motion.ul>
  );
}

function SlotRow({
  occ,
  interactive,
  onPick,
}: {
  occ: OccurrenceForBooking;
  interactive: boolean;
  onPick: (occ: OccurrenceForBooking) => void;
}) {
  const time = TIME_SLOT_LABELS[occ.startSlot as TimeSlotValue];

  if (occ.status === 'CANCELLED') {
    return (
      <div className="rounded-xl border border-dashed border-destructive/40 bg-destructive/5 px-4 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <p className="font-semibold tabular-nums text-muted-foreground line-through">{time}</p>
          <span className="flex items-center gap-1.5 text-xs font-medium text-destructive">
            <Ban className="h-3.5 w-3.5" />
            Cancelled by faculty
          </span>
        </div>
        {occ.cancelReason && <p className="mt-1.5 text-xs text-muted-foreground">&ldquo;{occ.cancelReason}&rdquo;</p>}
      </div>
    );
  }

  if (occ.myBookingPosition) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-success/40 bg-success/5 px-4 py-3.5">
        <div>
          <p className="font-semibold tabular-nums">{time}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            You&apos;re #{occ.myBookingPosition} in the queue
          </p>
        </div>
        <Link href="/student/bookings" className="text-xs font-medium text-primary hover:underline">
          View booking
        </Link>
      </div>
    );
  }

  const seatsLeft = Math.max(0, occ.capacity - occ.bookedCount);
  const tone = seatTone(occ.bookedCount, occ.capacity);
  const fill = occ.capacity > 0 ? Math.min(100, (occ.bookedCount / occ.capacity) * 100) : 100;
  const pickable = interactive && occ.isBookable;

  return (
    <button
      type="button"
      disabled={!pickable}
      onClick={() => onPick(occ)}
      className={cn(
        'group relative w-full overflow-hidden rounded-xl border border-border bg-background px-4 py-3.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        pickable && 'hover:-translate-y-px hover:border-primary hover:shadow-md hover:shadow-primary/10',
        !pickable && 'cursor-not-allowed',
        occ.isFull && 'opacity-60'
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold tabular-nums">{time}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            {occ.isFull ? (
              <>
                <Lock className="h-3 w-3" />
                Fully booked
              </>
            ) : (
              <>
                <span className={cn('h-2 w-2 rounded-full', tone.dot)} aria-hidden />
                {seatsLeft} of {occ.capacity} seat{occ.capacity === 1 ? '' : 's'} left
              </>
            )}
          </p>
        </div>
        {pickable && (
          <span className="flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 sm:-translate-x-1">
            Select
            <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-muted">
        <motion.div
          className={cn('h-full', tone.bar)}
          initial={{ width: 0 }}
          animate={{ width: `${fill}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        />
      </div>
    </button>
  );
}
