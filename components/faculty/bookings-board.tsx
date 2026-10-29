'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { format } from 'date-fns-tz';
import { Ban, CalendarX2, Clock, Maximize2, Radio, Users } from 'lucide-react';
import { TIME_SLOT_LABELS, type TimeSlotValue } from '@/lib/constants';
import { toDateKey } from '@/lib/timezone';
import { cn } from '@/lib/utils';
import { CancelDayButton } from '@/components/booking/cancel-day-button';
import { CancelOccurrenceButton } from '@/components/booking/cancel-occurrence-button';
import { SlotRoster } from '@/components/faculty/slot-roster';
import type { FacultySlot } from '@/components/faculty/types';

const confirmedCount = (slot: FacultySlot) => slot.bookings.filter((b) => b.status === 'CONFIRMED').length;

/**
 * Faculty bookings at a glance: summary tiles, a day strip with booked
 * counts, and every slot of the chosen day with its roster inline.
 */
export function BookingsBoard({ slots, dayKeys, todayKey }: { slots: FacultySlot[]; dayKeys: string[]; todayKey: string }) {
  const byDay = new Map<string, FacultySlot[]>(dayKeys.map((k) => [k, []]));
  for (const slot of slots) byDay.get(toDateKey(slot.date))?.push(slot);

  const [selectedKey, setSelectedKey] = useState(() => {
    const withBookings = dayKeys.find((k) => byDay.get(k)!.some((s) => confirmedCount(s) > 0));
    const withSlots = dayKeys.find((k) => byDay.get(k)!.length > 0);
    return withBookings ?? withSlots ?? todayKey;
  });

  const open = slots.filter((s) => s.status === 'OPEN');
  const students = open.reduce((sum, s) => sum + confirmedCount(s), 0);
  const seats = open.reduce((sum, s) => sum + s.capacity, 0);
  const daySlots = byDay.get(selectedKey) ?? [];
  const dayOpen = daySlots.filter((s) => s.status === 'OPEN' && !s.started);
  const dayStudents = daySlots.filter((s) => s.status === 'OPEN').reduce((sum, s) => sum + confirmedCount(s), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <SummaryTile label="Students booked" value={students} hint="next 7 days" tone="bg-accent text-accent-foreground" icon={Users} />
        <SummaryTile label="Open slots" value={open.length} hint="next 7 days" tone="bg-consultation-bg text-consultation" icon={Clock} />
        <SummaryTile
          label="Seats filled"
          value={seats ? `${Math.round((students / seats) * 100)}%` : '—'}
          hint={`${students} of ${seats}`}
          tone="bg-violet-500/10 text-violet-600 dark:text-violet-300"
          icon={Radio}
        />
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-thin" role="listbox" aria-label="Select a day">
        {dayKeys.map((key) => {
          const daySlotsForKey = byDay.get(key)!;
          const booked = daySlotsForKey.filter((s) => s.status === 'OPEN').reduce((sum, s) => sum + confirmedCount(s), 0);
          const has = daySlotsForKey.length > 0;
          const selected = key === selectedKey;
          const date = new Date(`${key}T00:00:00Z`);
          return (
            <button
              key={key}
              type="button"
              role="option"
              aria-selected={selected}
              disabled={!has}
              onClick={() => setSelectedKey(key)}
              className={cn(
                'relative flex min-w-[72px] flex-1 flex-col items-center gap-1 rounded-xl border px-2 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                selected ? 'border-transparent text-primary-foreground' : 'border-border bg-card',
                has && !selected && 'hover:border-primary/40',
                !has && 'cursor-not-allowed opacity-45'
              )}
            >
              {selected && (
                <motion.span
                  layoutId="faculty-day-pill"
                  className="absolute inset-0 rounded-xl bg-primary shadow-md shadow-primary/25"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <span className={cn('relative text-[11px] font-medium uppercase tracking-wide', selected ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                {key === todayKey ? 'Today' : format(date, 'EEE', { timeZone: 'UTC' })}
              </span>
              <span className="relative text-lg font-semibold tabular-nums">{format(date, 'd', { timeZone: 'UTC' })}</span>
              <span
                className={cn(
                  'relative whitespace-nowrap rounded-full px-2 text-[11px] font-semibold tabular-nums',
                  !has
                    ? 'text-muted-foreground'
                    : selected
                      ? 'bg-primary-foreground/20'
                      : booked > 0
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-muted text-muted-foreground'
                )}
              >
                {has ? (
                  <>
                    {booked}
                    <span className="hidden sm:inline"> booked</span>
                  </>
                ) : (
                  '—'
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{format(new Date(`${selectedKey}T00:00:00Z`), 'EEEE, d MMMM', { timeZone: 'UTC' })}</h2>
          <p className="text-sm text-muted-foreground">
            {daySlots.length} slot{daySlots.length === 1 ? '' : 's'} · {dayStudents} student{dayStudents === 1 ? '' : 's'}
          </p>
        </div>
        <CancelDayButton
          date={selectedKey}
          slotCount={dayOpen.length}
          bookedCount={dayOpen.reduce((sum, s) => sum + confirmedCount(s), 0)}
        />
      </div>

      {daySlots.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
          <CalendarX2 className="h-6 w-6 text-muted-foreground" />
          <p className="mt-3 font-medium">No consultation slots this week</p>
          <p className="mt-1 text-sm text-muted-foreground">Add consultation hours from your routine.</p>
        </div>
      ) : (
        <motion.div
          key={selectedKey}
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
          className="space-y-4"
        >
          {daySlots.map((slot) => (
            <motion.div
              key={slot.id}
              variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } } }}
            >
              <SlotCard slot={slot} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

export function SlotCard({ slot, standalone = false }: { slot: FacultySlot; standalone?: boolean }) {
  const booked = confirmedCount(slot);
  const cancelled = slot.status === 'CANCELLED';
  const fill = slot.capacity ? Math.min(100, (booked / slot.capacity) * 100) : 0;
  const full = booked >= slot.capacity;

  return (
    <div className={cn('overflow-hidden rounded-2xl border border-border bg-card shadow-sm', cancelled && 'border-destructive/30')}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-4">
          <span
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-xl',
              cancelled ? 'bg-destructive/10 text-destructive' : 'bg-consultation-bg text-consultation'
            )}
          >
            {cancelled ? <Ban className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className={cn('text-lg font-semibold tabular-nums', cancelled && 'text-muted-foreground line-through')}>
                {TIME_SLOT_LABELS[slot.startSlot as TimeSlotValue]}
              </p>
              {cancelled && <Chip className="bg-destructive/10 text-destructive">Cancelled</Chip>}
              {!cancelled && slot.started && (
                <Chip className={slot.past ? 'bg-muted text-muted-foreground' : 'bg-success/10 text-success'}>{slot.past ? 'Done' : 'Started'}</Chip>
              )}
              {!cancelled && !slot.started && full && <Chip className="bg-amber-500/10 text-amber-700 dark:text-amber-300">Full</Chip>}
            </div>
            <div className="mt-1.5 flex items-center gap-2.5">
              <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted sm:w-36">
                <motion.div
                  className={cn('h-full rounded-full', cancelled ? 'bg-muted-foreground/40' : full ? 'bg-amber-500' : 'bg-primary')}
                  initial={{ width: 0 }}
                  animate={{ width: `${fill}%` }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                />
              </div>
              <span className="text-xs font-medium tabular-nums text-muted-foreground">
                {booked} of {slot.capacity} booked
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!standalone && (
            <Link
              href={`/faculty/bookings/${slot.id}`}
              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Open slot page"
            >
              <Maximize2 className="h-4 w-4" />
            </Link>
          )}
          {!cancelled && !slot.started && <CancelOccurrenceButton occurrenceId={slot.id} bookedCount={booked} compact />}
        </div>
      </div>

      {cancelled && slot.cancelReason && (
        <div className="border-t border-destructive/20 bg-destructive/5 px-5 py-2.5 text-sm">
          <span className="font-medium text-destructive">Your note to students: </span>
          {slot.cancelReason}
        </div>
      )}

      <SlotRoster slot={slot} />
    </div>
  );
}

function Chip({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', className)}>{children}</span>;
}

function SummaryTile({
  label,
  value,
  hint,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  hint: string;
  tone: string;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', tone)}>
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-3 text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground sm:text-sm">
        {label} <span className="hidden sm:inline">· {hint}</span>
      </p>
    </div>
  );
}
