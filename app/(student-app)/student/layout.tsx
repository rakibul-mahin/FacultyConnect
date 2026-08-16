import { requireStudentPage } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { AppShell } from '@/components/layout/app-shell';

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await requireStudentPage();
  const profile = await prisma.studentProfile.findUnique({ where: { id: session.user.studentProfileId! } });

  return (
    <AppShell
      section="student"
      userLabel={profile?.fullName ?? session.user.email ?? 'Student'}
      userSublabel={profile?.studentId ? `ID ${profile.studentId}` : 'Complete your profile'}
    >
      {children}
    </AppShell>
  );
}
