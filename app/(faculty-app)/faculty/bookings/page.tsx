import Link from 'next/link';
import { requireFacultyPage } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { ensureOccurrences } from '@/lib/booking/occurrences';
import { dhakaToday, formatDhakaDate, toDateKey } from '@/lib/timezone';
import { TIME_SLOT_LABELS, type TimeSlotValue } from '@/lib/constants';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CancelDayButton } from '@/components/booking/cancel-day-button';
import { Users } from 'lucide-react';
import { FadeIn } from '@/components/motion/fade-in';
import { StaggerList, StaggerItem } from '@/components/motion/stagger-list';

export default async function FacultyBookingsPage() {
  const session = await requireFacultyPage();
  const facultyId = session.user.facultyProfileId!;
  await ensureOccurrences(facultyId);

  const today = dhakaToday();
  const occurrences = await prisma.consultationOccurrence.findMany({
    where: { facultyId, date: { gte: today } },
    orderBy: [{ date: 'asc' }, { startSlot: 'asc' }],
    include: { bookings: { where: { status: 'CONFIRMED' } } },
  });

  const byDate = new Map<string, typeof occurrences>();
  for (const occ of occurrences) {
    const key = toDateKey(occ.date);
    const arr = byDate.get(key) ?? [];
    arr.push(occ);
    byDate.set(key, arr);
  }

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="text-2xl font-semibold tracking-tight">Bookings</h1>
        <p className="text-sm text-muted-foreground">Upcoming consultation slots and who has booked them.</p>
      </FadeIn>

      {byDate.size === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No upcoming consultation slots. Add one from your routine.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Array.from(byDate.entries()).map(([dateKey, occs], groupIdx) => (
            <FadeIn key={dateKey} delay={groupIdx * 0.05} className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-muted-foreground">{formatDhakaDate(occs[0]!.date)}</h2>
                <CancelDayButton facultyId={facultyId} date={dateKey} slotCount={occs.filter((o) => o.status === 'OPEN').length} />
              </div>
              <StaggerList className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {occs.map((occ) => (
                  <StaggerItem key={occ.id}>
                    <Link
                      href={`/faculty/bookings/${occ.id}`}
                      className="block rounded-lg border border-border bg-card p-4 transition-all hover:border-primary hover:bg-muted hover:scale-[1.02]"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{TIME_SLOT_LABELS[occ.startSlot as TimeSlotValue]}</p>
                        {occ.status === 'CANCELLED' ? (
                          <Badge variant="destructive">Cancelled</Badge>
                        ) : (
                          <Badge variant={occ.bookings.length >= occ.capacity ? 'warning' : 'secondary'}>
                            <Users className="h-3 w-3" />
                            {occ.bookings.length} / {occ.capacity}
                          </Badge>
                        )}
                      </div>
                    </Link>
                  </StaggerItem>
                ))}
              </StaggerList>
            </FadeIn>
          ))}
        </div>
      )}
    </div>
  );
}
