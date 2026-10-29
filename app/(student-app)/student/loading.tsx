import { BookingCardSkeleton, HeaderSkeleton } from '@/components/skeletons/page-skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export default function StudentDashboardLoading() {
  return (
    <div className="space-y-8">
      <HeaderSkeleton />
      <Skeleton className="h-56 rounded-3xl" />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <BookingCardSkeleton />
          <BookingCardSkeleton />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-28" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
