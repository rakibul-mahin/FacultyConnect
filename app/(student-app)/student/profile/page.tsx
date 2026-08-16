import { requireStudentPage } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StudentProfileForm } from '@/components/profile/student-profile-form';
import { FadeIn } from '@/components/motion/fade-in';

export default async function StudentProfilePage() {
  const session = await requireStudentPage();
  const profile = await prisma.studentProfile.findUniqueOrThrow({ where: { id: session.user.studentProfileId! } });

  return (
    <FadeIn className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">Your name and email come from your verified account.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Read-only — verified via your institutional Google account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Full name" value={profile.fullName} />
          <Row label="Email" value={profile.email} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Student ID</CardTitle>
          <CardDescription>Required before you can book a consultation.</CardDescription>
        </CardHeader>
        <CardContent>
          <StudentProfileForm studentId={profile.studentId} />
        </CardContent>
      </Card>
    </FadeIn>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
