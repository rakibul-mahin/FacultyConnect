import { HeaderSkeleton } from '@/components/skeletons/page-skeletons';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export default function QrLoading() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <Card className="max-w-md">
        <CardContent className="flex flex-col items-center gap-5 pt-6">
          <Skeleton className="h-56 w-56 rounded-xl" />
          <Skeleton className="h-3 w-48" />
          <div className="flex w-full gap-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 flex-1" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
