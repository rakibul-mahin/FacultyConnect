import { requireFacultyPage } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { FacultyProfileForm } from '@/components/profile/faculty-profile-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FadeIn } from '@/components/motion/fade-in';

export default async function FacultyProfilePage() {
  const session = await requireFacultyPage();
  const profile = await prisma.facultyProfile.findUniqueOrThrow({ where: { id: session.user.facultyProfileId! } });

  return (
    <FadeIn className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">Your name and email come from your verified account and can&apos;t be changed here.</p>
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
          <CardTitle>Display details</CardTitle>
          <CardDescription>Shown to students on your public routine. Contractual faculty may enter a shared seat like &ldquo;4F&rdquo;.</CardDescription>
        </CardHeader>
        <CardContent>
          <FacultyProfileForm initial={profile.initial} seat={profile.seat} />
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
