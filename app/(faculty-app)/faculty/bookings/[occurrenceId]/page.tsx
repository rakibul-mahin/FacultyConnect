import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireFacultyPage } from '@/lib/auth/session';
import { getFacultyOccurrenceRoster, toFacultySlot } from '@/lib/booking/queries';
import { formatDhakaDate } from '@/lib/timezone';
import { FadeIn } from '@/components/motion/fade-in';
import { SlotCard } from '@/components/faculty/bookings-board';

export default async function OccurrenceRosterPage({ params }: { params: { occurrenceId: string } }) {
  const session = await requireFacultyPage();

  let occurrence;
  try {
    occurrence = await getFacultyOccurrenceRoster(session.user.facultyProfileId!, params.occurrenceId);
  } catch {
    // Not found, or belongs to another faculty — either way, don't leak existence.
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link href="/faculty/bookings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        All bookings
      </Link>
      <FadeIn>
        <p className="text-sm text-muted-foreground">{formatDhakaDate(occurrence.date)}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Consultation roster</h1>
      </FadeIn>
      <FadeIn delay={0.05}>
        <SlotCard slot={toFacultySlot(occurrence)} standalone />
      </FadeIn>
    </div>
  );
}
