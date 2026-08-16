import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { resolveFacultyByToken } from '@/lib/qr/service';
import { ensureOccurrences, BOOKING_WINDOW_DAYS } from '@/lib/booking/occurrences';
import { getBookableOccurrences } from '@/lib/booking/queries';
import { dhakaTomorrow } from '@/lib/timezone';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookableWeekGrid } from '@/components/booking/bookable-week-grid';
import { ArrowLeft } from 'lucide-react';
import { addDays } from 'date-fns';
import { FadeIn } from '@/components/motion/fade-in';

async function resolveFaculty(publicId: string) {
  const byPublicId = await prisma.facultyProfile.findUnique({ where: { publicId } });
  if (byPublicId) return byPublicId;
  return resolveFacultyByToken(publicId);
}

export default async function PublicFacultyPage({ params }: { params: { publicId: string } }) {
  const session = await auth();
  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/faculty/${params.publicId}`)}`);
  }

  const faculty = await resolveFaculty(params.publicId);
  if (!faculty) notFound();

  await ensureOccurrences(faculty.id);

  const [entries, occurrences, studentProfile] = await Promise.all([
    prisma.routineEntry.findMany({ where: { facultyId: faculty.id } }),
    getBookableOccurrences(
      faculty.id,
      dhakaTomorrow(),
      addDays(dhakaTomorrow(), BOOKING_WINDOW_DAYS - 1),
      session.user.role === 'STUDENT' ? session.user.studentProfileId ?? undefined : undefined
    ),
    session.user.role === 'STUDENT' && session.user.studentProfileId
      ? prisma.studentProfile.findUnique({ where: { id: session.user.studentProfileId } })
      : Promise.resolve(null),
  ]);

  const canBook = session.user.role === 'STUDENT';
  const profileIncomplete = canBook ? !studentProfile?.studentId : false;
  const backHref = session.user.role === 'FACULTY' ? '/faculty' : '/student/search';

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <FadeIn className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{faculty.fullName}</h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="outline">{faculty.initial}</Badge>
            <Badge variant="outline">Seat {faculty.seat || '—'}</Badge>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.08}>
        <Card>
          <CardHeader>
            <CardTitle>Weekly routine</CardTitle>
            <CardDescription>
              {canBook
                ? 'Tap a consultation slot to see upcoming dates and book. Theory and lab slots are shown for reference only.'
                : 'Theory, lab, and consultation slots. Only students can book consultation slots.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BookableWeekGrid entries={entries} occurrences={occurrences} facultyName={faculty.fullName} canBook={canBook} profileIncomplete={profileIncomplete} />
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
