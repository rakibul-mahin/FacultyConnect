import { HeaderSkeleton } from '@/components/skeletons/page-skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export default function QrLoading() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-3xl border border-border bg-muted/40 px-4 py-8 sm:px-8">
          <Skeleton className="mx-auto h-[640px] w-full max-w-[420px] rounded-3xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-60 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
