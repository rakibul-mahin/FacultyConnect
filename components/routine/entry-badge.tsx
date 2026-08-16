import { entryStyleFor } from '@/lib/routine/entry-style';
import { cn } from '@/lib/utils';

export interface EntryLike {
  type: string;
  courseCode?: string | null;
  section?: string | null;
  roomNumber?: string | null;
  coFaculty?: string | null;
  capacity?: number | null;
  isLabContinuation?: boolean;
}

/**
 * Color-coded chip for a routine entry — Theory/Lab/Consultation each get a
 * distinct hue (see lib/routine/entry-style.ts) so the pattern is
 * recognizable at a glance across every grid the routine appears in.
 */
export function EntryBadge({ entry, compact }: { entry: EntryLike; compact?: boolean }) {
  const style = entryStyleFor(entry.type);
  if (!style) return <span className="text-xs text-muted-foreground">—</span>;
  const Icon = style.icon;

  return (
    <div
      className={cn(
        'w-full rounded-md border px-2 py-1.5 space-y-0.5',
        style.bg,
        style.border,
        compact && 'text-xs'
      )}
    >
      <p className={cn('flex items-center gap-1 font-semibold', style.text)}>
        <Icon className="h-3 w-3 shrink-0" aria-hidden />
        <span className="truncate">
          {entry.type === 'THEORY' && `${entry.courseCode}-${entry.section}`}
          {entry.type === 'LAB' && `${entry.courseCode}-${entry.section} (LAB)`}
          {entry.type === 'CONSULTATION' && `Consultation`}
        </span>
      </p>
      {entry.type === 'THEORY' && <p className="truncate text-muted-foreground">{entry.roomNumber}</p>}
      {entry.type === 'LAB' && (
        <p className="truncate text-muted-foreground">
          {entry.coFaculty} · {entry.roomNumber}
        </p>
      )}
      {entry.type === 'CONSULTATION' && <p className="text-muted-foreground">Capacity {entry.capacity}</p>}
    </div>
  );
}
