import { HeaderSkeleton, FormCardSkeleton } from '@/components/skeletons/page-skeletons';

export default function StudentProfileLoading() {
  return (
    <div className="max-w-lg space-y-6">
      <HeaderSkeleton />
      <FormCardSkeleton />
      <FormCardSkeleton />
    </div>
  );
}
