import { ENTRY_STYLES } from '@/lib/routine/entry-style';
import { cn } from '@/lib/utils';

export function EntryLegend({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground', className)}>
      {Object.values(ENTRY_STYLES).map((style) => (
        <span key={style.label} className="flex items-center gap-1.5">
          <span className={cn('h-2.5 w-2.5 rounded-full', style.dot)} aria-hidden />
          {style.label}
        </span>
      ))}
    </div>
  );
}
