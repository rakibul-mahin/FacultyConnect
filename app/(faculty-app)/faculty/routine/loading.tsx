import { HeaderSkeleton, WeekGridSkeleton } from '@/components/skeletons/page-skeletons';

export default function RoutineLoading() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <WeekGridSkeleton />
    </div>
  );
}
