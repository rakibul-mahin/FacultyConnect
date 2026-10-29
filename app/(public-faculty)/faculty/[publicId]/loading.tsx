import { BookerPageSkeleton } from '@/components/skeletons/page-skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export default function PublicFacultyLoading() {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <Skeleton className="h-4 w-16" />
        <BookerPageSkeleton />
      </div>
    </div>
  );
}
