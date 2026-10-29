import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { resolveFacultyByLink } from '@/lib/qr/service';
import { readWithOccurrences, BOOKING_WINDOW_DAYS } from '@/lib/booking/occurrences';
import { getBookableOccurrences } from '@/lib/booking/queries';
import { dhakaTomorrow, toDateKey } from '@/lib/timezone';
import { initialsOf } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { FacultyPageView } from '@/components/booker/faculty-page-view';
import { ArrowLeft } from 'lucide-react';
import { addDays } from 'date-fns';
import { FadeIn } from '@/components/motion/fade-in';

export default async function PublicFacultyPage({
  params,
  searchParams,
}: {
  params: { publicId: string };
  searchParams: { view?: string };
}) {
  const session = await auth();
  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/faculty/${params.publicId}`)}`);
  }

  const [faculty, studentProfile] = await Promise.all([
    resolveFacultyByLink(params.publicId),
    session.user.role === 'STUDENT' && session.user.studentProfileId
      ? prisma.studentProfile.findUnique({ where: { id: session.user.studentProfileId } })
      : Promise.resolve(null),
  ]);
  if (!faculty) notFound();
  const entries = faculty.routineEntries;

  const occurrences = await readWithOccurrences(faculty.id, entries, () =>
    getBookableOccurrences(
      faculty.id,
      dhakaTomorrow(),
      addDays(dhakaTomorrow(), BOOKING_WINDOW_DAYS - 1),
      session.user.role === 'STUDENT' ? session.user.studentProfileId ?? undefined : undefined
    )
  );

  const canBook = session.user.role === 'STUDENT';
  const profileIncomplete = canBook ? !studentProfile?.studentId : false;
  const backHref = session.user.role === 'FACULTY' ? '/faculty' : '/student/search';
  const consultationsPerWeek = entries.filter((e) => e.type === 'CONSULTATION').length;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <FadeIn className="flex items-center gap-4">
          <Avatar className="h-14 w-14 ring-4 ring-background shadow-sm sm:h-16 sm:w-16">
            <AvatarFallback className="bg-gradient-to-br from-primary to-sky-400 text-lg text-primary-foreground">
              {initialsOf(faculty.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{faculty.fullName}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge variant="outline">{faculty.initial}</Badge>
              <Badge variant="outline">Seat {faculty.seat || '—'}</Badge>
              <Badge variant="secondary">
                {consultationsPerWeek} consultation slot{consultationsPerWeek === 1 ? '' : 's'} / week
              </Badge>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.06}>
          <FacultyPageView
            initialTab={searchParams.view === 'routine' ? 'routine' : 'book'}
            faculty={{ fullName: faculty.fullName, seat: faculty.seat }}
            entries={entries}
            occurrences={occurrences}
            windowStart={toDateKey(dhakaTomorrow())}
            canBook={canBook}
            profileIncomplete={profileIncomplete}
          />
        </FadeIn>
      </div>
    </div>
  );
}
