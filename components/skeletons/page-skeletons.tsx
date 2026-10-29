import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function HeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-64" />
    </div>
  );
}

export function ListSkeleton({ rows = 4, withAvatar = false }: { rows?: number; withAvatar?: boolean }) {
  return (
    <Card>
      <CardContent className="divide-y divide-border pt-6">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            {withAvatar && <Skeleton className="h-9 w-9 shrink-0 rounded-full" />}
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function FormCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-56" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-9 w-28" />
      </CardContent>
    </Card>
  );
}

/** Mirrors the faculty page: avatar header, tab switcher, then the booker card. */
export function BookerPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-14 w-14 rounded-full sm:h-16 sm:w-16" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-36 rounded-full" />
          </div>
        </div>
      </div>
      <Skeleton className="h-11 w-80 rounded-xl" />
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid md:grid-cols-[260px_1fr] lg:grid-cols-[300px_1fr]">
          <div className="space-y-3 border-b border-border p-6 md:border-b-0 md:border-r">
            <Skeleton className="h-14 w-14 rounded-full" />
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-5 w-44" />
            <div className="space-y-3 pt-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
          <div className="space-y-6 p-6">
            <Skeleton className="h-5 w-28" />
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-[72px] rounded-xl" style={{ animationDelay: `${i * 60}ms` }} />
              ))}
            </div>
            <Skeleton className="h-5 w-44" />
            <div className="space-y-2.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-[66px] rounded-xl" style={{ animationDelay: `${i * 90}ms` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** One booking "ticket": date tile + text lines + status pill. */
export function BookingCardSkeleton() {
  return (
    <div className="flex gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
      <Skeleton className="h-16 w-14 shrink-0 rounded-xl sm:h-[72px] sm:w-16" />
      <div className="flex-1 space-y-2.5">
        <div className="flex justify-between gap-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
    </div>
  );
}

/** Mirrors the routine editor: four stat tiles, then the day × slot timetable. */
export function RoutineEditorSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[74px] rounded-2xl" />
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid grid-cols-[120px_repeat(9,minmax(0,1fr))] gap-2 border-b border-border p-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-5" />
          ))}
        </div>
        {Array.from({ length: 7 }).map((_, r) => (
          <div key={r} className="grid grid-cols-[120px_repeat(9,minmax(0,1fr))] gap-2 border-b border-border p-2 last:border-b-0">
            <Skeleton className="m-2 h-4 w-20" />
            {Array.from({ length: 9 }).map((_, c) => (
              <Skeleton key={c} className="h-[68px] rounded-xl opacity-60" style={{ animationDelay: `${(r * 9 + c) * 15}ms` }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
