import { HeaderSkeleton, CardListSkeleton } from '@/components/skeletons/page-skeletons';

export default function HistoryLoading() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <CardListSkeleton count={4} />
    </div>
  );
}
