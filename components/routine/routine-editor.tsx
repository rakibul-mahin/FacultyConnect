'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Armchair, Plus } from 'lucide-react';
import {
  WEEKDAYS,
  WEEKDAY_LABELS,
  WEEKDAY_SHORT,
  TIME_SLOTS,
  TIME_SLOT_LABELS,
  LAB_CONTINUATION_SLOT,
  THEORY_PAIRED_DAY,
  type WeekdayValue,
  type TimeSlotValue,
} from '@/lib/constants';
import { ENTRY_STYLES } from '@/lib/routine/entry-style';
import { cn } from '@/lib/utils';
import { EntryEditorDialog } from '@/components/routine/entry-editor-dialog';
import { RoutineBlock } from '@/components/routine/routine-block';

export interface RoutineCellData {
  id: string;
  day: string;
  startSlot: string;
  type: 'THEORY' | 'LAB' | 'CONSULTATION';
  courseCode: string | null;
  section: string | null;
  roomNumber: string | null;
  coFaculty: string | null;
  capacity: number | null;
  labGroupId: string | null;
  isLabContinuation: boolean;
}

type Grid = Record<string, Record<string, RoutineCellData | undefined>>;

// Shared by the header and every day row so the columns line up exactly.
const GRID_COLS = 'grid grid-cols-[120px_repeat(9,minmax(0,1fr))]';

/** A lab's second slot opens its first one: that is where the lab is edited. */
function editTarget(day: WeekdayValue, slot: TimeSlotValue, grid: Grid): { day: WeekdayValue; startSlot: TimeSlotValue } {
  const cell = grid[day]?.[slot];
  if (cell?.type === 'LAB' && cell.isLabContinuation) {
    const start = TIME_SLOTS.find((s) => grid[day]?.[s]?.labGroupId === cell.labGroupId && !grid[day]?.[s]?.isLabContinuation);
    if (start) return { day, startSlot: start };
  }
  return { day, startSlot: slot };
}

/** The day a theory class is mirrored on, only when the twin really matches. */
function pairedDayOf(entry: RoutineCellData, grid: Grid): WeekdayValue | undefined {
  if (entry.type !== 'THEORY') return undefined;
  const partner = THEORY_PAIRED_DAY[entry.day as WeekdayValue];
  const twin = partner ? grid[partner]?.[entry.startSlot] : undefined;
  return twin?.type === 'THEORY' && twin.courseCode === entry.courseCode && twin.section === entry.section ? partner : undefined;
}

function isLabStartWithPair(entry: RoutineCellData | undefined, day: string, slot: TimeSlotValue, grid: Grid) {
  if (entry?.type !== 'LAB' || entry.isLabContinuation) return false;
  const next = LAB_CONTINUATION_SLOT[slot];
  return Boolean(next && grid[day]?.[next]?.labGroupId === entry.labGroupId);
}

export function RoutineEditor({ initialEntries, todayDay }: { initialEntries: RoutineCellData[]; todayDay: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState<{ day: WeekdayValue; startSlot: TimeSlotValue } | null>(null);
  const [mobileDay, setMobileDay] = useState<WeekdayValue>(
    (WEEKDAYS as readonly string[]).includes(todayDay) ? (todayDay as WeekdayValue) : WEEKDAYS[0]
  );

  const grid = useMemo(() => {
    const g: Grid = {};
    for (const day of WEEKDAYS) g[day] = {};
    for (const e of initialEntries) g[e.day]![e.startSlot] = e;
    return g;
  }, [initialEntries]);

  const stats = useMemo(() => {
    const consultations = initialEntries.filter((e) => e.type === 'CONSULTATION');
    return {
      THEORY: initialEntries.filter((e) => e.type === 'THEORY').length,
      LAB: initialEntries.filter((e) => e.type === 'LAB' && !e.isLabContinuation).length,
      CONSULTATION: consultations.length,
      seats: consultations.reduce((sum, e) => sum + (e.capacity ?? 0), 0),
    };
  }, [initialEntries]);

  const open = (day: WeekdayValue, slot: TimeSlotValue) => setSelected(editTarget(day, slot, grid));
  const existingForSelected = selected ? grid[selected.day]?.[selected.startSlot] ?? null : null;

  return (
    <div className="space-y-5">
      {/* Weekly totals double as the colour legend */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile type="THEORY" label="Theory classes" value={stats.THEORY} />
        <StatTile type="LAB" label="Lab sessions" value={stats.LAB} />
        <StatTile type="CONSULTATION" label="Consultation slots" value={stats.CONSULTATION} />
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
            <Armchair className="h-4 w-4" />
          </span>
          <div>
            <p className="text-2xl font-bold leading-none tabular-nums">{stats.seats}</p>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Seats / week</p>
          </div>
        </div>
      </div>

      {/* Desktop timetable — official layout (§14, §38): days as rows, time slots as columns */}
      <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:block">
        <div className="overflow-x-auto scrollbar-thin">
          <div className="min-w-[1080px]">
            <div className={cn(GRID_COLS, 'border-b border-border bg-muted/40')}>
              <div className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Day</div>
              {TIME_SLOTS.map((slot) => {
                const [time, meridiem] = TIME_SLOT_LABELS[slot].split(' ');
                return (
                  <div key={slot} className="px-2 py-3 text-center">
                    <span className="text-sm font-semibold tabular-nums">{time}</span>
                    <span className="ml-1 text-[11px] font-medium text-muted-foreground">{meridiem}</span>
                  </div>
                );
              })}
            </div>

            {WEEKDAYS.map((day, rowIdx) => {
              const isToday = day === todayDay;
              const cells: React.ReactNode[] = [];
              for (let i = 0; i < TIME_SLOTS.length; i++) {
                const slot = TIME_SLOTS[i]!;
                const entry = grid[day]?.[slot];
                const spanLab = isLabStartWithPair(entry, day, slot, grid);
                cells.push(
                  <div key={slot} className="p-1" style={spanLab ? { gridColumn: 'span 2' } : undefined}>
                    <button
                      type="button"
                      onClick={() => open(day, slot)}
                      aria-label={`${WEEKDAY_LABELS[day]} ${TIME_SLOT_LABELS[slot]}${entry ? '' : ' (empty)'}`}
                      className={cn(
                        'group h-full min-h-[76px] w-full rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        entry
                          ? 'hover:-translate-y-0.5 hover:shadow-md'
                          : 'flex items-center justify-center border border-dashed border-transparent text-muted-foreground/30 hover:border-primary/40 hover:bg-accent/40 hover:text-primary'
                      )}
                    >
                      {entry ? (
                        <RoutineBlock entry={entry} pairedDay={pairedDayOf(entry, grid)} compact={!spanLab} />
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-medium">
                          <Plus className="h-3.5 w-3.5" />
                          <span className="opacity-0 transition-opacity group-hover:opacity-100">Add</span>
                        </span>
                      )}
                    </button>
                  </div>
                );
                if (spanLab) i++; // the continuation slot is covered by the merged block
              }
              return (
                <motion.div
                  key={day}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: rowIdx * 0.03, ease: [0.16, 1, 0.3, 1] }}
                  className={cn(GRID_COLS, 'border-b border-border last:border-b-0', isToday && 'bg-accent/30')}
                >
                  <div className="flex flex-col justify-center gap-1 px-4 py-2">
                    <span className={cn('text-sm font-semibold', isToday && 'text-primary')}>{WEEKDAY_LABELS[day]}</span>
                    {isToday && (
                      <span className="w-fit rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                        Today
                      </span>
                    )}
                  </div>
                  {cells}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile: day pills + a vertical timeline */}
      <div className="lg:hidden">
        <div className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-thin">
          {WEEKDAYS.map((day) => {
            const active = mobileDay === day;
            const types = TIME_SLOTS.map((s) => grid[day]?.[s]).filter((e) => e && !e.isLabContinuation);
            return (
              <button
                key={day}
                type="button"
                onClick={() => setMobileDay(day)}
                className={cn(
                  'relative flex min-w-[56px] shrink-0 flex-col items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors',
                  active ? 'border-transparent text-primary-foreground' : 'border-border bg-card text-muted-foreground'
                )}
              >
                {active && (
                  <motion.span
                    layoutId="routine-mobile-day"
                    className="absolute inset-0 rounded-xl bg-primary shadow-md shadow-primary/25"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative">{WEEKDAY_SHORT[day]}</span>
                <span className="relative flex h-1.5 gap-0.5">
                  {types.slice(0, 4).map((e) => (
                    <span key={e!.id} className={cn('h-1.5 w-1.5 rounded-full', active ? 'bg-primary-foreground/80' : ENTRY_STYLES[e!.type].dot)} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>

        <motion.ol key={mobileDay} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="relative space-y-2">
          {TIME_SLOTS.map((slot) => {
            const entry = grid[mobileDay]?.[slot];
            if (entry?.type === 'LAB' && entry.isLabContinuation) return null; // shown inside the lab's first slot
            return (
              <li key={slot} className="flex gap-3">
                <span className="w-16 shrink-0 pt-3 text-right text-xs font-medium tabular-nums text-muted-foreground">
                  {TIME_SLOT_LABELS[slot]}
                </span>
                <button
                  type="button"
                  onClick={() => open(mobileDay, slot)}
                  className={cn(
                    'min-h-[56px] flex-1 rounded-xl text-left transition-colors',
                    !entry && 'border border-dashed border-border px-3 text-sm text-muted-foreground/70 hover:border-primary/40 hover:bg-accent/40'
                  )}
                >
                  {entry ? (
                    <RoutineBlock entry={entry} pairedDay={pairedDayOf(entry, grid)} />
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Plus className="h-3.5 w-3.5" />
                      Free · tap to add
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </motion.ol>
      </div>

      {selected && (
        <EntryEditorDialog
          open={Boolean(selected)}
          onOpenChange={(isOpen) => !isOpen && setSelected(null)}
          day={selected.day}
          startSlot={selected.startSlot}
          existing={existingForSelected}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  );
}

function StatTile({ type, label, value }: { type: keyof typeof ENTRY_STYLES; label: string; value: number }) {
  const style = ENTRY_STYLES[type];
  const Icon = style.icon;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', style.bg, style.text)}>
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-2xl font-bold leading-none tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{label}</p>
      </div>
    </div>
  );
}

