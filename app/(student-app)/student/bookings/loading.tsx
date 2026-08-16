import { HeaderSkeleton, CardListSkeleton } from '@/components/skeletons/page-skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export default function StudentBookingsLoading() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <Skeleton className="h-10 w-56 rounded-lg" />
      <CardListSkeleton count={3} />
    </div>
  );
}
