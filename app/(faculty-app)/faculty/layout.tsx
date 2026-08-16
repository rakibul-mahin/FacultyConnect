import { requireFacultyPage } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { AppShell } from '@/components/layout/app-shell';

export default async function FacultyLayout({ children }: { children: React.ReactNode }) {
  const session = await requireFacultyPage();
  const profile = await prisma.facultyProfile.findUnique({ where: { id: session.user.facultyProfileId! } });

  return (
    <AppShell
      section="faculty"
      userLabel={profile?.fullName ?? session.user.email ?? 'Faculty'}
      userSublabel={profile?.initial ? `${profile.initial} · Seat ${profile.seat || '—'}` : 'Faculty'}
    >
      {children}
    </AppShell>
  );
}
