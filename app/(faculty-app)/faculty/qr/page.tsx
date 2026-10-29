import { requireFacultyPage, getFacultyProfileById } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { getOrCreateActiveToken, generateQrDataUrl, buildFacultyQrUrl } from '@/lib/qr/service';
import { WEEKDAYS, WEEKDAY_SHORT, TIME_SLOTS, TIME_SLOT_LABELS, type TimeSlotValue, type WeekdayValue } from '@/lib/constants';
import { parsePosterStyle } from '@/lib/qr/poster-style';
import { QrPanel } from '@/components/qr/qr-panel';
import { FadeIn } from '@/components/motion/fade-in';

export default async function FacultyQrPage() {
  const session = await requireFacultyPage();
  const facultyId = session.user.facultyProfileId!;
  const [token, profile, consultations] = await Promise.all([
    getOrCreateActiveToken(facultyId),
    getFacultyProfileById(facultyId),
    prisma.routineEntry.findMany({ where: { facultyId, type: 'CONSULTATION' } }),
  ]);
  const dataUrl = await generateQrDataUrl(token.token);
  const url = buildFacultyQrUrl(token.token);

  // Weekly consultation hours in routine order, e.g. "Sun 12:30 PM".
  const hours = [...consultations]
    .sort(
      (a, b) =>
        WEEKDAYS.indexOf(a.day as WeekdayValue) - WEEKDAYS.indexOf(b.day as WeekdayValue) ||
        TIME_SLOTS.indexOf(a.startSlot as TimeSlotValue) - TIME_SLOTS.indexOf(b.startSlot as TimeSlotValue)
    )
    .map((e) => `${WEEKDAY_SHORT[e.day as WeekdayValue]} ${TIME_SLOT_LABELS[e.startSlot as TimeSlotValue]}`);

  return (
    <div className="space-y-6">
      <FadeIn className="print:hidden">
        <h1 className="text-2xl font-semibold tracking-tight">QR code</h1>
        <p className="text-sm text-muted-foreground">
          Put this on your door or share it with your sections. Students scan it to open your booking page.
        </p>
      </FadeIn>
      <FadeIn delay={0.05}>
        <QrPanel
          dataUrl={dataUrl}
          url={url}
          faculty={{ fullName: profile?.fullName ?? 'Faculty', initial: profile?.initial ?? '', seat: profile?.seat ?? '' }}
          hours={hours}
          initialStyle={parsePosterStyle(profile?.posterStyle)}
        />
      </FadeIn>
    </div>
  );
}
