'use client';

import { useState } from 'react';
import { WEEKDAYS, WEEKDAY_LABELS, WEEKDAY_SHORT, TIME_SLOTS, TIME_SLOT_LABELS, type WeekdayValue } from '@/lib/constants';
import { EntryBadge, type EntryLike } from '@/components/routine/entry-badge';
import { EntryLegend } from '@/components/routine/entry-legend';
import { dhakaToday, dhakaWeekdayOf } from '@/lib/timezone';
import { cn } from '@/lib/utils';

// Official layout (§14, §38): days run down the rows, time slots run across
// the columns on desktop — matching the department's source Google Sheet.
// On mobile, nine columns never fit (§47): a day selector + vertical list
// replaces the table entirely below the lg breakpoint.
export function DashboardWeekGrid({ entries }: { entries: EntryLike[] & { day: string; startSlot: string }[] }) {
  const [mobileDay, setMobileDay] = useState<WeekdayValue>(() => dhakaWeekdayOf(dhakaToday()) as WeekdayValue);

  const grid: Record<string, Record<string, EntryLike | undefined>> = {};
  for (const day of WEEKDAYS) grid[day] = {};
  for (const e of entries as (EntryLike & { day: string; startSlot: string })[]) {
    grid[e.day]![e.startSlot] = e;
  }

  return (
    <div className="space-y-3">
      <EntryLegend />

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
                  const cell = grid[day]?.[slot];
                  return (
                    <td key={slot} className="min-w-[120px] border-b border-border p-1.5 align-top text-center">
                      {cell ? <EntryBadge entry={cell} compact /> : <span className="text-xs text-muted-foreground/50">—</span>}
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
            const cell = grid[mobileDay]?.[slot];
            return (
              <div key={slot} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">{TIME_SLOT_LABELS[slot]}</span>
                <span className="min-w-0 flex-1">
                  {cell ? <EntryBadge entry={cell} compact /> : <span className="text-xs text-muted-foreground/50">—</span>}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
