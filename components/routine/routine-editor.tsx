'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WEEKDAYS, WEEKDAY_LABELS, WEEKDAY_SHORT, TIME_SLOTS, TIME_SLOT_LABELS, type WeekdayValue, type TimeSlotValue } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { EntryBadge } from '@/components/routine/entry-badge';
import { EntryLegend } from '@/components/routine/entry-legend';
import { EntryEditorDialog } from '@/components/routine/entry-editor-dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

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

export function RoutineEditor({ initialEntries }: { initialEntries: RoutineCellData[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<{ day: WeekdayValue; startSlot: TimeSlotValue } | null>(null);
  const [mobileDay, setMobileDay] = useState<WeekdayValue>(WEEKDAYS[0]);

  const grid = useMemo(() => {
    const g: Record<string, Record<string, RoutineCellData | undefined>> = {};
    for (const day of WEEKDAYS) g[day] = {};
    for (const e of initialEntries) g[e.day]![e.startSlot] = e;
    return g;
  }, [initialEntries]);

  const existingForSelected = selected ? grid[selected.day]?.[selected.startSlot] ?? null : null;

  const handleSaved = () => router.refresh();

  return (
    <div className="space-y-3">
      <EntryLegend />
      {/* Desktop grid — official layout (§14, §38): days as rows, time slots as columns */}
      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card lg:block">
        <table className="w-full min-w-[1100px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="w-28 border-b border-border p-3 text-left text-xs font-medium text-muted-foreground">Day</th>
              {TIME_SLOTS.map((slot) => (
                <th key={slot} className="border-b border-border p-3 text-center text-xs font-medium text-muted-foreground">
                  {TIME_SLOT_LABELS[slot]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEEKDAYS.map((day) => (
              <tr key={day}>
                <td className="border-b border-border p-3 align-top text-xs font-semibold">{WEEKDAY_LABELS[day]}</td>
                {TIME_SLOTS.map((slot) => {
                  const cell = grid[day]?.[slot];
                  return (
                    <td key={slot} className="border-b border-border p-1.5 align-top">
                      <button
                        onClick={() => setSelected({ day, startSlot: slot })}
                        className={cn(
                          'flex min-h-[64px] w-full flex-col items-center justify-center rounded-lg border border-transparent transition-all hover:scale-[1.02] hover:border-primary',
                          !cell && 'p-2 text-muted-foreground/40 hover:bg-accent/60'
                        )}
                      >
                        {cell ? <EntryBadge entry={cell} compact /> : <Plus className="h-3.5 w-3.5" />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile day selector + vertical list */}
      <div className="lg:hidden">
        <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
          {WEEKDAYS.map((day) => (
            <button
              key={day}
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
            const cell = grid[mobileDay]?.[slot];
            return (
              <button
                key={slot}
                onClick={() => setSelected({ day: mobileDay, startSlot: slot })}
                className="flex w-full items-center gap-4 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-muted"
              >
                <span className="w-20 shrink-0 text-xs font-medium text-muted-foreground">{TIME_SLOT_LABELS[slot]}</span>
                <span className="flex-1">
                  {cell ? <EntryBadge entry={cell} /> : <span className="text-sm text-muted-foreground/60">Tap to add</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <EntryEditorDialog
          open={Boolean(selected)}
          onOpenChange={(open) => !open && setSelected(null)}
          day={selected.day}
          startSlot={selected.startSlot}
          existing={existingForSelected}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
