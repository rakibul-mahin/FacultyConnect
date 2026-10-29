import { BookingCardSkeleton, HeaderSkeleton } from '@/components/skeletons/page-skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export default function StudentBookingsLoading() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <Skeleton className="h-11 w-80 rounded-xl" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <BookingCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
