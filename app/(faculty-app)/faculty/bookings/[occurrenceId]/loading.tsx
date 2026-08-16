import { HeaderSkeleton, ListSkeleton } from '@/components/skeletons/page-skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export default function OccurrenceLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <HeaderSkeleton />
        <Skeleton className="h-10 w-40" />
      </div>
      <ListSkeleton rows={4} withAvatar />
    </div>
  );
}
