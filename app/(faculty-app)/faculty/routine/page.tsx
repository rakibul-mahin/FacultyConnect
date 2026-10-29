import Link from 'next/link';
import { requireFacultyPage } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { dhakaToday, dhakaWeekdayOf } from '@/lib/timezone';
import { FadeIn } from '@/components/motion/fade-in';
import { RoutineEditor } from '@/components/routine/routine-editor';
import { ClearRoutineButton } from '@/components/routine/clear-routine-button';

export default async function FacultyRoutinePage() {
  const session = await requireFacultyPage();
  const entries = await prisma.routineEntry.findMany({ where: { facultyId: session.user.facultyProfileId! } });

  return (
    <div className="space-y-6">
      <FadeIn className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Weekly routine</h1>
          <p className="text-sm text-muted-foreground">Click any slot to add a theory class, a lab or consultation hours.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ClearRoutineButton entryCount={entries.length} />
          <Button asChild variant="outline">
            <Link href="/faculty/routine/import">
              <Upload className="h-4 w-4" />
              Import routine
            </Link>
          </Button>
        </div>
      </FadeIn>

      <RoutineEditor
        todayDay={dhakaWeekdayOf(dhakaToday())}
        initialEntries={entries.map((e) => ({
          id: e.id,
          day: e.day,
          startSlot: e.startSlot,
          type: e.type,
          courseCode: e.courseCode,
          section: e.section,
          roomNumber: e.roomNumber,
          coFaculty: e.coFaculty,
          capacity: e.capacity,
          labGroupId: e.labGroupId,
          isLabContinuation: e.isLabContinuation,
        }))}
      />
    </div>
  );
}
