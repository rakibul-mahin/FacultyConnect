import { Clock, Link2, MapPin, Users } from 'lucide-react';
import { TIME_SLOT_24H, WEEKDAY_LABELS, WEEKDAY_SHORT, type TimeSlotValue, type WeekdayValue } from '@/lib/constants';
import { entryStyleFor } from '@/lib/routine/entry-style';
import { cn } from '@/lib/utils';
import type { RoutineCellData } from '@/components/routine/routine-editor';

const LAB_MINUTES = 160;

function to12h(totalMinutes: number) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

/** "11:00 AM – 1:40 PM" for a lab starting at `slot` (labs always run 2h40m, §17). */
export function labTimeRange(slot: TimeSlotValue) {
  const [h, m] = TIME_SLOT_24H[slot].split(':').map(Number);
  const start = h! * 60 + m!;
  return `${to12h(start)} – ${to12h(start + LAB_MINUTES)}`;
}

/**
 * A routine entry as a timetable card: tinted by type, with an accent bar
 * and the details faculty scan for (course, room, co-faculty, capacity).
 */
export function RoutineBlock({
  entry,
  pairedDay,
  compact = false,
  className,
}: {
  entry: RoutineCellData;
  /** Day this theory class is mirrored on, if it actually is. */
  pairedDay?: WeekdayValue;
  /** Narrow timetable cells: drop the title icon and the pairing tag so course and room fit. */
  compact?: boolean;
  className?: string;
}) {
  const style = entryStyleFor(entry.type)!;
  const Icon = style.icon;

  return (
    <div
      className={cn(
        'relative flex h-full w-full flex-col justify-center gap-1 overflow-hidden rounded-xl border py-2.5 text-left',
        compact ? 'pl-3 pr-2' : 'px-3',
        style.bg,
        style.border,
        className
      )}
    >
      <span className={cn('absolute inset-y-2.5 left-0 w-1 rounded-r-full', style.dot)} aria-hidden />
      <div className="flex items-start justify-between gap-2">
        <p className={cn('flex min-w-0 items-center gap-1.5 font-semibold leading-tight', compact ? 'text-xs' : 'text-[13px]', style.text)}>
          {!compact && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />}
          <span className="truncate">
            {entry.type === 'CONSULTATION' ? 'Consultation' : `${entry.courseCode}-${entry.section}`}
          </span>
        </p>
        {pairedDay && !compact && <PairedTag day={pairedDay} />}
      </div>

      {entry.type === 'THEORY' && <Meta icon={MapPin}>{entry.roomNumber}</Meta>}
      {entry.type === 'LAB' && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <Meta icon={MapPin}>{entry.roomNumber}</Meta>
          <Meta icon={Users}>{entry.coFaculty}</Meta>
          <Meta icon={Clock}>{labTimeRange(entry.startSlot as TimeSlotValue)}</Meta>
        </div>
      )}
      {entry.type === 'CONSULTATION' && <Meta icon={Users}>{entry.capacity} seats</Meta>}
    </div>
  );
}

/** Marks a theory class mirrored on its paired day (Sun↔Tue, Mon↔Wed, Sat↔Thu). */
function PairedTag({ day }: { day: WeekdayValue }) {
  return (
    <span
      className="flex shrink-0 items-center gap-0.5 rounded-md bg-background/60 px-1 py-0.5 text-[10px] font-medium text-muted-foreground"
      title={`Same class on ${WEEKDAY_LABELS[day]}`}
    >
      <Link2 className="h-2.5 w-2.5" />
      {WEEKDAY_SHORT[day]}
    </span>
  );
}

function Meta({ icon: Icon, children }: { icon: typeof MapPin; children: React.ReactNode }) {
  return (
    <p className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
      <Icon className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
      <span className="truncate">{children}</span>
    </p>
  );
}
