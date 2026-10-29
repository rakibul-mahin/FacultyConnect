'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { CalendarCheck2, CalendarRange } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Booker } from '@/components/booker/booker';
import { BookableWeekGrid } from '@/components/booking/bookable-week-grid';
import type { OccurrenceForBooking } from '@/components/booking/types';

export type FacultyPageTab = 'book' | 'routine';

const TABS: { value: FacultyPageTab; label: string; icon: typeof CalendarRange }[] = [
  { value: 'book', label: 'Book consultation', icon: CalendarCheck2 },
  { value: 'routine', label: 'Full routine', icon: CalendarRange },
];

/**
 * The two "windows" of a faculty page: the booking flow and the full weekly
 * routine. The active tab lives in `?view=` so links and QR scans can open
 * either one; switching only rewrites the URL instead of refetching.
 */
export function FacultyPageView({
  initialTab,
  faculty,
  entries,
  occurrences,
  windowStart,
  canBook,
  profileIncomplete,
}: {
  initialTab: FacultyPageTab;
  faculty: { fullName: string; seat: string };
  entries: React.ComponentProps<typeof BookableWeekGrid>['entries'];
  occurrences: OccurrenceForBooking[];
  windowStart: string;
  canBook: boolean;
  profileIncomplete: boolean;
}) {
  const [tab, setTab] = useState<FacultyPageTab>(initialTab);
  const [jumpTo, setJumpTo] = useState<string | undefined>();

  const switchTab = (next: FacultyPageTab) => {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === 'book') url.searchParams.delete('view');
    else url.searchParams.set('view', next);
    window.history.replaceState(null, '', url);
  };

  return (
    <div className="space-y-5">
      <div className="inline-flex rounded-xl border border-border bg-muted/60 p-1" role="tablist">
        {TABS.map(({ value, label, icon: Icon }) => {
          const active = tab === value;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setJumpTo(undefined);
                switchTab(value);
              }}
              className={cn(
                'relative flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-4',
                active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {active && (
                <motion.span
                  layoutId="faculty-page-tab"
                  className="absolute inset-0 rounded-lg bg-background shadow-sm"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <Icon className="relative h-4 w-4" />
              <span className="relative">{label}</span>
            </button>
          );
        })}
      </div>

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        {tab === 'book' ? (
          <Booker
            faculty={faculty}
            occurrences={occurrences}
            windowStart={windowStart}
            mode={canBook ? 'book' : 'preview'}
            profileIncomplete={profileIncomplete}
            initialOccurrenceId={jumpTo}
            onViewRoutine={() => switchTab('routine')}
          />
        ) : (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="mb-4">
              <h2 className="font-semibold">Weekly routine</h2>
              <p className="text-sm text-muted-foreground">
                {canBook
                  ? 'Theory and lab classes are shown for reference. Tap a consultation slot to book it.'
                  : 'Theory, lab and consultation slots. Only students can book consultation slots.'}
              </p>
            </div>
            <BookableWeekGrid
              entries={entries}
              occurrences={occurrences}
              canBook={canBook}
              profileIncomplete={profileIncomplete}
              onPick={(occ) => {
                setJumpTo(occ.id);
                switchTab('book');
              }}
            />
          </div>
        )}
      </motion.div>
    </div>
  );
}
