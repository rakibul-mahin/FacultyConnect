'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { addDays } from 'date-fns';
import { format } from 'date-fns-tz';
import { ArrowLeft, CalendarDays, CalendarRange, CalendarX2, Clock, Eye, Globe, MapPin } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { BOOKING_TYPE_LABELS, TIME_SLOT_LABELS, type TimeSlotValue } from '@/lib/constants';
import { parseDhakaDateString, toDateKey } from '@/lib/timezone';
import { initialsOf } from '@/lib/utils';
import { BOOKING_WINDOW_DAYS } from '@/lib/booking/window';
import { WeekStrip, type StripDay } from '@/components/booker/week-strip';
import { SlotList } from '@/components/booker/slot-list';
import { BookingForm } from '@/components/booker/booking-form';
import { BookingSuccess } from '@/components/booker/booking-success';
import type { OccurrenceForBooking } from '@/components/booking/types';

type Step = 'slots' | 'details' | 'done';

// Enter-only on purpose: an exit + AnimatePresence mode="wait" can wedge the
// panel blank when steps change mid-exit (e.g. Back then a fast re-pick).
const stepMotion = {
  initial: { opacity: 0, x: 18 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
} as const;

function longDate(date: Date) {
  return format(date, 'EEEE, d MMMM', { timeZone: 'UTC' });
}

/**
 * Cal.com-style booking surface: a sticky details panel on the left and a
 * three-step flow on the right (pick a slot → enter details → confirmed).
 * In `preview` mode (faculty viewing a faculty page) it renders exactly what
 * students see, but nothing can be picked.
 */
export function Booker({
  faculty,
  occurrences,
  windowStart,
  mode,
  profileIncomplete,
  initialOccurrenceId,
  onViewRoutine,
}: {
  faculty: { fullName: string; seat: string };
  occurrences: OccurrenceForBooking[];
  /** "yyyy-MM-dd" of the first bookable day (tomorrow, Asia/Dhaka), computed on the server. */
  windowStart: string;
  mode: 'book' | 'preview';
  profileIncomplete: boolean;
  /** Jump straight to the details step for this slot (e.g. picked from the routine tab). */
  initialOccurrenceId?: string;
  onViewRoutine: () => void;
}) {
  const router = useRouter();

  const days = useMemo<StripDay[]>(() => {
    const start = parseDhakaDateString(windowStart);
    return Array.from({ length: BOOKING_WINDOW_DAYS }, (_, i) => {
      const date = addDays(start, i);
      const key = toDateKey(date);
      return { key, date, occurrences: occurrences.filter((o) => toDateKey(o.date) === key) };
    });
  }, [occurrences, windowStart]);

  const initialPick = initialOccurrenceId ? occurrences.find((o) => o.id === initialOccurrenceId) : undefined;
  const [selectedKey, setSelectedKey] = useState(() => {
    if (initialPick) return toDateKey(initialPick.date);
    const firstOpen = days.find((d) => d.occurrences.some((o) => o.isBookable && !o.myBookingPosition));
    const firstAny = days.find((d) => d.occurrences.length > 0);
    return (firstOpen ?? firstAny ?? days[0]!).key;
  });
  const [picked, setPicked] = useState<OccurrenceForBooking | null>(initialPick?.isBookable ? initialPick : null);
  const [step, setStep] = useState<Step>(initialPick?.isBookable ? 'details' : 'slots');
  const [result, setResult] = useState<{ position: number; type: keyof typeof BOOKING_TYPE_LABELS } | null>(null);

  const selectedDay = days.find((d) => d.key === selectedKey) ?? days[0]!;
  const weekHasSlots = days.some((d) => d.occurrences.length > 0);
  const pickedWhen = picked ? `${longDate(picked.date)} · ${TIME_SLOT_LABELS[picked.startSlot as TimeSlotValue]}` : '';

  const pick = (occ: OccurrenceForBooking) => {
    setPicked(occ);
    setStep('details');
  };

  const reset = () => {
    setPicked(null);
    setResult(null);
    setStep('slots');
  };

  const rangeLabel = `${format(days[0]!.date, 'd MMM', { timeZone: 'UTC' })} – ${format(days[days.length - 1]!.date, 'd MMM', { timeZone: 'UTC' })}`;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {mode === 'preview' && (
        <div className="flex items-center gap-2 border-b border-border bg-accent/50 px-5 py-2.5 text-xs font-medium text-accent-foreground">
          <Eye className="h-3.5 w-3.5" />
          Preview: this is what students see. Only students can book.
        </div>
      )}

      <div className="grid md:grid-cols-[260px_1fr] lg:grid-cols-[300px_1fr]">
        {/* Details panel */}
        <aside className="border-b border-border p-5 sm:p-6 md:border-b-0 md:border-r">
          <div className="md:sticky md:top-6">
            <Avatar className="h-12 w-12 ring-4 ring-accent sm:h-14 sm:w-14">
              <AvatarFallback className="bg-gradient-to-br from-primary to-sky-400 text-base text-primary-foreground">
                {initialsOf(faculty.fullName)}
              </AvatarFallback>
            </Avatar>
            <p className="mt-4 text-sm text-muted-foreground">Consultation with</p>
            <h2 className="text-lg font-semibold leading-tight tracking-tight">{faculty.fullName}</h2>

            <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
              <MetaItem icon={MapPin}>{faculty.seat ? `Seat ${faculty.seat}` : 'Seat not set'}</MetaItem>
              <MetaItem icon={Globe}>Dhaka time (GMT+6)</MetaItem>
              <MetaItem icon={CalendarRange}>Bookable {rangeLabel}</MetaItem>
            </ul>

            <AnimatePresence>
              {picked && step !== 'slots' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-5 rounded-xl border border-primary/25 bg-accent/50 p-3.5">
                    <p className="flex items-center gap-2 text-sm font-semibold text-accent-foreground">
                      <CalendarDays className="h-4 w-4" />
                      {longDate(picked.date)}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-sm text-accent-foreground/80">
                      <Clock className="h-4 w-4" />
                      {TIME_SLOT_LABELS[picked.startSlot as TimeSlotValue]}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </aside>

        {/* Flow */}
        <section className="min-h-[440px] p-5 sm:p-6">
          {step === 'slots' && (
            <motion.div key="slots" {...stepMotion}>
              {!weekHasSlots ? (
                <EmptyWeek onViewRoutine={onViewRoutine} />
              ) : (
                <>
                  <div className="mb-3 flex items-baseline justify-between">
                    <h3 className="font-semibold">Select a day</h3>
                    <span className="text-xs text-muted-foreground">Next 7 days</span>
                  </div>
                  <WeekStrip days={days} selectedKey={selectedKey} onSelect={setSelectedKey} />

                  <div className="mb-3 mt-7 flex items-baseline justify-between">
                    <h3 className="font-semibold">{longDate(selectedDay.date)}</h3>
                    <span className="text-xs text-muted-foreground">
                      {selectedDay.occurrences.length} slot{selectedDay.occurrences.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  {selectedDay.occurrences.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                      No consultations on this day.
                    </p>
                  ) : (
                    <SlotList
                      key={selectedDay.key}
                      occurrences={selectedDay.occurrences}
                      interactive={mode === 'book'}
                      onPick={pick}
                    />
                  )}
                </>
              )}
            </motion.div>
          )}

          {step === 'details' && picked && (
            <motion.div key="details" {...stepMotion}>
              <button
                type="button"
                onClick={reset}
                className="mb-4 inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <h3 className="text-lg font-semibold tracking-tight">Enter details</h3>
              <p className="mb-6 text-sm text-muted-foreground">{pickedWhen}</p>
              <BookingForm
                occurrenceId={picked.id}
                profileIncomplete={profileIncomplete}
                onStale={() => router.refresh()}
                onBooked={(res) => {
                  setResult(res);
                  setStep('done');
                  router.refresh();
                }}
              />
            </motion.div>
          )}

          {step === 'done' && picked && result && (
            <motion.div key="done" {...stepMotion}>
              <BookingSuccess
                position={result.position}
                facultyName={faculty.fullName}
                when={pickedWhen}
                seat={faculty.seat}
                topic={BOOKING_TYPE_LABELS[result.type]}
                onBookAnother={reset}
              />
            </motion.div>
          )}
        </section>
      </div>
    </div>
  );
}

function MetaItem({ icon: Icon, children }: { icon: typeof MapPin; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2.5">
      <Icon className="h-4 w-4 shrink-0" />
      <span>{children}</span>
    </li>
  );
}

function EmptyWeek({ onViewRoutine }: { onViewRoutine: () => void }) {
  return (
    <div className="flex h-full min-h-[380px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <CalendarX2 className="h-5 w-5 text-muted-foreground" />
      </span>
      <p className="mt-4 font-semibold">No consultation slots this week</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        This faculty member has no consultation hours in the next 7 days.
      </p>
      <Button variant="outline" size="sm" className="mt-5" onClick={onViewRoutine}>
        View full routine
      </Button>
    </div>
  );
}
