import { HeaderSkeleton, WeekGridSkeleton } from '@/components/skeletons/page-skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export default function PublicFacultyLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="h-4 w-16" />
      <HeaderSkeleton />
      <WeekGridSkeleton />
    </div>
  );
}
