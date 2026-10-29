'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { addDays } from 'date-fns';
import { format } from 'date-fns-tz';
import { CalendarSearch, ChevronLeft, ChevronRight, History, Loader2, RotateCcw, UserCheck, UserX, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseDhakaDateString, toDateKey } from '@/lib/timezone';
import { cn } from '@/lib/utils';
import { SlotCard } from '@/components/faculty/bookings-board';
import type { FacultySlot } from '@/components/faculty/types';

const fmt = (date: Date, pattern: string) => format(date, pattern, { timeZone: 'UTC' });
const confirmedOf = (slot: FacultySlot) => slot.bookings.filter((b) => b.status === 'CONFIRMED');

/**
 * One routine week (Sat–Fri) of past consultations. Arrows and the date
 * picker load another week from the server; picking a day only switches
 * which day's slots are shown.
 */
export function HistoryWeek({
  weekStart,
  latestDay,
  initialDay,
  slots,
  allTime,
}: {
  weekStart: string;
  /** Yesterday: days after it are not history yet. */
  latestDay: string;
  initialDay?: string;
  slots: FacultySlot[];
  allTime: { totalPresent: number; totalAbsent: number };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const start = parseDhakaDateString(weekStart);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const keys = days.map(toDateKey);
  const byDay = new Map(keys.map((k) => [k, slots.filter((s) => toDateKey(s.date) === k)]));

  const [selected, setSelected] = useState(() => {
    if (initialDay && keys.includes(initialDay) && initialDay <= latestDay) return initialDay;
    const withSlots = [...keys].reverse().find((k) => k <= latestDay && byDay.get(k)!.length > 0);
    return withSlots ?? [...keys].reverse().find((k) => k <= latestDay) ?? keys[0]!;
  });

  const isLatestWeek = keys.includes(latestDay) || keys[6]! > latestDay;
  const go = (query: string) => startTransition(() => router.push(`/faculty/history?${query}`, { scroll: false }));

  const weekBookings = slots.filter((s) => s.status === 'OPEN').flatMap(confirmedOf);
  const present = weekBookings.filter((b) => b.attendance === 'PRESENT').length;
  const absent = weekBookings.filter((b) => b.attendance === 'ABSENT').length;
  const marked = allTime.totalPresent + allTime.totalAbsent;
  const daySlots = byDay.get(selected) ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Users} label="Students this week" value={weekBookings.length} tone="bg-accent text-accent-foreground" />
        <Stat icon={UserCheck} label="Present this week" value={present} tone="bg-success/10 text-success" />
        <Stat icon={UserX} label="Absent this week" value={absent} tone="bg-destructive/10 text-destructive" />
        <Stat
          icon={History}
          label="All-time attendance"
          value={marked ? `${Math.round((allTime.totalPresent / marked) * 100)}%` : '—'}
          tone="bg-violet-500/10 text-violet-600 dark:text-violet-300"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              aria-label="Previous week"
              onClick={() => go(`week=${toDateKey(addDays(start, -7))}`)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              aria-label="Next week"
              disabled={isLatestWeek}
              onClick={() => go(`week=${toDateKey(addDays(start, 7))}`)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="ml-2">
              <p className="flex items-center gap-2 font-semibold">
                {fmt(days[0]!, 'd MMM')} – {fmt(days[6]!, 'd MMM yyyy')}
                {pending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </p>
              <p className="text-xs text-muted-foreground">Saturday to Friday</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isLatestWeek && (
              <Button variant="ghost" size="sm" onClick={() => go('')}>
                <RotateCcw className="h-3.5 w-3.5" />
                Latest
              </Button>
            )}
            <label className="relative flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent">
              <CalendarSearch className="h-4 w-4 text-muted-foreground" />
              Jump to date
              <input
                type="date"
                max={latestDay}
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={(e) => e.target.value && go(`day=${e.target.value}`)}
                aria-label="Jump to date"
              />
            </label>
          </div>
        </div>

        <div className={cn('grid grid-cols-7 gap-1.5 transition-opacity sm:gap-2', pending && 'pointer-events-none opacity-50')} role="listbox" aria-label="Select a day">
          {days.map((date, i) => {
            const key = keys[i]!;
            const daySlotsForKey = byDay.get(key)!;
            const future = key > latestDay;
            const hasSlots = daySlotsForKey.length > 0;
            const students = daySlotsForKey.filter((s) => s.status === 'OPEN').reduce((sum, s) => sum + confirmedOf(s).length, 0);
            const anyCancelled = daySlotsForKey.some((s) => s.status === 'CANCELLED');
            const isSelected = key === selected;
            return (
              <button
                key={key}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={future}
                onClick={() => setSelected(key)}
                className={cn(
                  'relative flex flex-col items-center gap-1 rounded-xl border px-1 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:py-3',
                  isSelected ? 'border-transparent text-primary-foreground' : 'border-border',
                  !isSelected && !future && 'hover:border-primary/40',
                  future && 'cursor-not-allowed border-dashed opacity-40',
                  !isSelected && !hasSlots && !future && 'text-muted-foreground'
                )}
              >
                {isSelected && (
                  <motion.span
                    layoutId="history-day-pill"
                    className="absolute inset-0 rounded-xl bg-primary shadow-md shadow-primary/25"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <span className={cn('relative text-[10px] font-medium uppercase tracking-wide sm:text-[11px]', isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                  {fmt(date, 'EEE')}
                </span>
                <span className="relative text-base font-semibold tabular-nums sm:text-lg">{fmt(date, 'd')}</span>
                <span className="relative flex h-4 items-center gap-1 text-[11px] font-semibold tabular-nums">
                  {hasSlots ? (
                    <>
                      <span className={cn('flex items-center gap-0.5', !isSelected && (students > 0 ? 'text-foreground' : 'text-muted-foreground'))}>
                        <Users className="h-3 w-3" />
                        {students}
                      </span>
                      {anyCancelled && <span className={cn('h-1.5 w-1.5 rounded-full', isSelected ? 'bg-primary-foreground' : 'bg-destructive')} title="Has a cancelled slot" />}
                    </>
                  ) : (
                    <span className="opacity-60">—</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold tracking-tight">{fmt(parseDhakaDateString(selected), 'EEEE, d MMMM yyyy')}</h2>
        <p className="text-sm text-muted-foreground">
          {daySlots.length} slot{daySlots.length === 1 ? '' : 's'} · mark attendance with ✓ and ✗
        </p>
      </div>

      {daySlots.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
            <History className="h-5 w-5 text-muted-foreground" />
          </span>
          <p className="mt-3 font-medium">No consultations on this day</p>
          <p className="mt-1 text-sm text-muted-foreground">Pick another day, or move to a different week.</p>
        </div>
      ) : (
        <motion.div
          key={selected}
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
          className="space-y-4"
        >
          {daySlots.map((slot) => (
            <motion.div key={slot.id} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } } }}>
              <SlotCard slot={slot} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: number | string; tone: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tone)}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-none tabular-nums">{value}</p>
        <p className="mt-1 text-xs leading-tight text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
