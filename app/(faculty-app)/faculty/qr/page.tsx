import { requireFacultyPage } from '@/lib/auth/session';
import { getOrCreateActiveToken, generateQrDataUrl, buildFacultyQrUrl } from '@/lib/qr/service';
import { QrPanel } from '@/components/qr/qr-panel';
import { FadeIn } from '@/components/motion/fade-in';

export default async function FacultyQrPage() {
  const session = await requireFacultyPage();
  const token = await getOrCreateActiveToken(session.user.facultyProfileId!);
  const dataUrl = await generateQrDataUrl(token.token);
  const url = buildFacultyQrUrl(token.token);

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="text-2xl font-semibold tracking-tight">QR Code</h1>
        <p className="text-sm text-muted-foreground">Students can scan this to jump straight to your consultation routine.</p>
      </FadeIn>
      <FadeIn delay={0.08}>
        <QrPanel dataUrl={dataUrl} url={url} />
      </FadeIn>
    </div>
  );
}
