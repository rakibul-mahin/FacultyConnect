import { HeaderSkeleton } from '@/components/skeletons/page-skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export default function HistoryLoading() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[74px] rounded-2xl" />
        ))}
      </div>
      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex justify-between">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-[84px] rounded-xl" style={{ animationDelay: `${i * 50}ms` }} />
          ))}
        </div>
      </div>
      <Skeleton className="h-6 w-64" />
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  );
}
