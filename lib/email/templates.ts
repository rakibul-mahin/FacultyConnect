import { format } from 'date-fns-tz';
import { TIME_SLOT_LABELS, type TimeSlotValue } from '@/lib/constants';

/**
 * The five Consultly emails (approved design: white card, brand bar, logo,
 * status pill, date card, details table, one button). Email clients ignore
 * most CSS, so the markup is table-based with inline styles; colours are
 * hex because the email is always white regardless of the reader's theme.
 * Every value that comes from a person (names, notes, reasons) is escaped.
 */

export interface BookingEmailData {
  occurrenceId: string;
  date: Date; // stored calendar date (UTC midnight for the Dhaka date)
  startSlot: string;
  type: 'THESIS_INTERNSHIP_PROJECT' | 'COURSE' | 'OTHERS';
  groupId: string | null;
  courseCode: string | null;
  section: string | null;
  reason: string | null;
  student: { fullName: string; studentId: string | null; email: string };
  faculty: { fullName: string; initial: string; seat: string; email: string; publicId: string };
  /** Confirmed seats after the change, for faculty emails. */
  seats?: { taken: number; capacity: number };
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const C = {
  canvas: '#f4f7fb',
  card: '#ffffff',
  ink: '#0f172a',
  body: '#334155',
  muted: '#64748b',
  line: '#e2e8f0',
  soft: '#f8fafc',
  brand: '#0369a1',
  brand2: '#2563eb',
  ok: '#047857',
  okBg: '#ecfdf5',
  bad: '#b91c1c',
  badBg: '#fef2f2',
  badLine: '#fecaca',
  infoBg: '#eff6ff',
  neutral: '#475569',
  neutralBg: '#f1f5f9',
};

const FONT = "'Plus Jakarta Sans', -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const TYPE_TAG: Record<BookingEmailData['type'], { label: string; color: string; bg: string }> = {
  THESIS_INTERNSHIP_PROJECT: { label: 'Thesis / Project', color: '#6d28d9', bg: '#f3e8ff' },
  COURSE: { label: 'Course', color: '#0369a1', bg: '#e0f2fe' },
  OTHERS: { label: 'Others', color: '#475569', bg: '#f1f5f9' },
};

export function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
}

export function esc(value: string | null | undefined) {
  return (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const longDate = (d: Date) => format(d, 'EEEE, d MMMM yyyy', { timeZone: 'UTC' });
const shortDate = (d: Date) => format(d, 'EEE, d MMM', { timeZone: 'UTC' });
const time = (slot: string) => TIME_SLOT_LABELS[slot as TimeSlotValue] ?? slot;
const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

function typeDetail(d: BookingEmailData) {
  if (d.type === 'COURSE') return `${d.courseCode ?? ''} · Section ${d.section ?? ''}`;
  if (d.type === 'THESIS_INTERNSHIP_PROJECT' && d.groupId) return `Group ${d.groupId}`;
  return '';
}

function facultyLabel(d: BookingEmailData) {
  return d.faculty.initial ? `${d.faculty.fullName} (${d.faculty.initial})` : d.faculty.fullName;
}

function seatsLine(d: BookingEmailData) {
  return d.seats ? `${d.seats.taken} of ${d.seats.capacity} seat${d.seats.capacity === 1 ? '' : 's'}` : '';
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

type Tone = 'ok' | 'bad' | 'info' | 'neutral';

interface LayoutParts {
  title: string; // plain text
  preheader: string;
  pill: { label: string; tone: Tone };
  heading: string; // plain text
  introHtml: string; // trusted markup built from escaped values
  date: Date;
  whenTime: string; // plain text, e.g. 11:00 AM
  whenSub: string; // plain text, under the date line
  cancelled?: boolean;
  rows?: [label: string, valueHtml: string][];
  quote?: { label: string; text: string; tone: 'soft' | 'reason' };
  cta: { label: string; href: string };
  secondary?: { label: string; href: string };
  noteHtml?: string;
  footerReason: string; // plain text
}

const PILL: Record<Tone, { color: string; bg: string }> = {
  ok: { color: C.ok, bg: C.okBg },
  bad: { color: C.bad, bg: C.badBg },
  info: { color: C.brand, bg: C.infoBg },
  neutral: { color: C.neutral, bg: C.neutralBg },
};

function layout(p: LayoutParts) {
  const base = appUrl();
  const pill = PILL[p.pill.tone];
  const dateBg = p.cancelled ? C.neutralBg : C.infoBg;
  const dateFg = p.cancelled ? C.neutral : C.brand;
  const bigDecoration = p.cancelled ? 'text-decoration:line-through;text-decoration-color:#94a3b8;' : '';

  const rows = (p.rows ?? [])
    .map(
      ([k, v], i) => `<tr>
        <td class="k" style="padding:11px 16px;${i ? `border-top:1px solid ${C.line};` : ''}font-size:14px;color:${C.muted};width:128px;vertical-align:top;font-family:${FONT};">${esc(k)}</td>
        <td style="padding:11px 16px;${i ? `border-top:1px solid ${C.line};` : ''}font-size:14px;color:${C.ink};font-weight:600;vertical-align:top;font-family:${FONT};word-break:break-word;">${v}</td>
      </tr>`
    )
    .join('');

  const quote = p.quote
    ? `<tr><td style="padding:0 0 18px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;">
          <tr><td style="padding:12px 16px;border-radius:10px;background:${p.quote.tone === 'reason' ? C.badBg : C.soft};border:1px solid ${p.quote.tone === 'reason' ? C.badLine : C.line};font-family:${FONT};">
            <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${p.quote.tone === 'reason' ? C.bad : C.muted};padding-bottom:4px;">${esc(p.quote.label)}</div>
            <div style="font-size:14px;line-height:1.6;color:${C.body};white-space:pre-wrap;">${esc(p.quote.text)}</div>
          </td></tr>
        </table>
      </td></tr>`
    : '';

  const secondary = p.secondary
    ? `<td style="padding-left:16px;font-family:${FONT};"><a href="${esc(p.secondary.href)}" style="font-size:13px;font-weight:600;color:${C.brand};text-decoration:none;">${esc(p.secondary.label)}</a></td>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(p.title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  @media (max-width: 520px) {
    .px { padding-left: 20px !important; padding-right: 20px !important; }
    .k { width: 96px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.canvas};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(p.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.canvas}" style="background:${C.canvas};">
<tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;border-collapse:separate;">
    <tr><td height="4" bgcolor="${C.brand}" style="height:4px;line-height:4px;font-size:0;background:${C.brand};border-radius:14px 14px 0 0;">&nbsp;</td></tr>
    <tr><td bgcolor="${C.card}" style="background:${C.card};border:1px solid ${C.line};border-top:0;border-radius:0 0 14px 14px;">

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td class="px" style="padding:22px 32px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="vertical-align:middle;">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="vertical-align:middle;padding-right:9px;"><img src="${base}/email/consultly-mark.png" width="30" height="30" alt="" style="display:block;border:0;width:30px;height:30px;"></td>
                <td style="vertical-align:middle;font-family:${FONT};font-size:19px;font-weight:800;letter-spacing:-.02em;color:${C.ink};">Consult<span style="color:${C.brand2};">ly</span></td>
              </tr></table>
            </td>
            <td align="right" style="vertical-align:middle;">
              <span style="display:inline-block;font-family:${FONT};font-size:12px;font-weight:700;padding:4px 10px;border-radius:999px;color:${pill.color};background:${pill.bg};white-space:nowrap;">${esc(p.pill.label)}</span>
            </td>
          </tr></table>
        </td></tr>

        <tr><td class="px" style="padding:26px 32px 30px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:0 0 12px;font-family:${FONT};font-size:22px;line-height:1.3;font-weight:800;letter-spacing:-.02em;color:${C.ink};">${esc(p.heading)}</td></tr>
            <tr><td style="padding:0 0 18px;font-family:${FONT};font-size:15px;line-height:1.6;color:${C.body};">${p.introHtml}</td></tr>

            <tr><td style="padding:0 0 18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.line};border-radius:12px;border-collapse:separate;">
                <tr>
                  <td width="56" style="padding:14px 0 14px 16px;width:56px;vertical-align:middle;">
                    <table role="presentation" width="56" cellpadding="0" cellspacing="0" style="border-radius:10px;background:${dateBg};border-collapse:separate;">
                      <tr><td align="center" style="padding:6px 0;font-family:${FONT};color:${dateFg};line-height:1.15;">
                        <div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">${esc(format(p.date, 'EEE', { timeZone: 'UTC' }))}</div>
                        <div style="font-size:22px;font-weight:800;">${esc(format(p.date, 'd', { timeZone: 'UTC' }))}</div>
                        <div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">${esc(format(p.date, 'MMM', { timeZone: 'UTC' }))}</div>
                      </td></tr>
                    </table>
                  </td>
                  <td style="padding:14px 16px;vertical-align:middle;font-family:${FONT};">
                    <div style="font-size:16px;font-weight:700;color:${C.ink};${bigDecoration}">${esc(longDate(p.date))} · ${esc(p.whenTime)}</div>
                    <div style="font-size:13px;color:${C.muted};padding-top:2px;">${esc(p.whenSub)}</div>
                  </td>
                </tr>
              </table>
            </td></tr>

            ${rows ? `<tr><td style="padding:0 0 18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.line};border-radius:12px;border-collapse:separate;">${rows}</table></td></tr>` : ''}
            ${quote}

            <tr><td style="padding:0 0 ${p.noteHtml ? '18px' : '0'};">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td bgcolor="${C.brand}" style="border-radius:10px;background:${C.brand};">
                  <a href="${esc(p.cta.href)}" style="display:inline-block;padding:12px 22px;font-family:${FONT};font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${esc(p.cta.label)}</a>
                </td>
                ${secondary}
              </tr></table>
            </td></tr>
            ${p.noteHtml ? `<tr><td style="font-family:${FONT};font-size:13px;line-height:1.6;color:${C.muted};">${p.noteHtml}</td></tr>` : ''}
          </table>
        </td></tr>
      </table>

    </td></tr>
    <tr><td align="center" style="padding:18px 8px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.muted};">
      <strong style="color:${C.neutral};">Consultly</strong> · Developed and maintained by Redefyn<br>
      ${esc(p.footerReason)}<br>
      <a href="${base}" style="color:${C.muted};word-break:break-word;">${esc(base.replace(/^https?:\/\//, ''))}</a>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

function textEmail(lines: (string | false | null | undefined)[]) {
  return [...lines.filter((l): l is string => typeof l === 'string'), '', '—', 'Consultly · Developed and maintained by Redefyn', appUrl()].join('\n');
}

function tag(d: BookingEmailData) {
  const t = TYPE_TAG[d.type];
  const detail = typeDetail(d);
  return `<span style="display:inline-block;font-size:12px;font-weight:700;padding:2px 8px;border-radius:6px;margin-right:6px;color:${t.color};background:${t.bg};">${esc(t.label)}</span>${esc(detail)}`;
}

const typeText = (d: BookingEmailData) => [TYPE_TAG[d.type].label, typeDetail(d)].filter(Boolean).join(' · ');

// ---------------------------------------------------------------------------
// 1a. Student: booking confirmed
// ---------------------------------------------------------------------------

export function bookingConfirmedForStudent(d: BookingEmailData): RenderedEmail {
  const subject = `Booked: consultation with ${d.faculty.fullName} on ${shortDate(d.date)}`;
  const url = `${appUrl()}/student/bookings`;
  const html = layout({
    title: subject,
    preheader: `${longDate(d.date)} · ${time(d.startSlot)} · Seat ${d.faculty.seat || '—'}`,
    pill: { label: 'Confirmed', tone: 'ok' },
    heading: 'Your consultation is booked',
    introHtml: `Hi ${esc(firstName(d.student.fullName))}, you have a consultation with <strong style="color:${C.ink};">${esc(d.faculty.fullName)}</strong>.`,
    date: d.date,
    whenTime: time(d.startSlot),
    whenSub: `Dhaka time (GMT+6)`,
    rows: [
      ['Faculty', esc(facultyLabel(d))],
      ['Where', `Seat ${esc(d.faculty.seat || '—')}`],
      ['Topic', tag(d)],
    ],
    quote: d.reason ? { label: 'Your note', text: d.reason, tone: 'soft' } : undefined,
    cta: { label: 'View my bookings', href: url },
    noteHtml: `Can't make it? Cancel from My bookings so another student can take your seat. Reply to this email to reach ${esc(d.faculty.fullName)} directly.`,
    footerReason: "You're receiving this because you booked a consultation with your BRACU account.",
  });
  const text = textEmail([
    'Your consultation is booked',
    '',
    `Hi ${firstName(d.student.fullName)}, you have a consultation with ${d.faculty.fullName}.`,
    '',
    `When:    ${longDate(d.date)}, ${time(d.startSlot)} (Dhaka time)`,
    `Faculty: ${facultyLabel(d)}`,
    `Where:   Seat ${d.faculty.seat || '—'}`,
    `Topic:   ${typeText(d)}`,
    d.reason ? `Your note: ${d.reason}` : null,
    '',
    `View my bookings: ${url}`,
    '',
    `Can't make it? Cancel from My bookings so another student can take your seat. Reply to this email to reach ${d.faculty.fullName} directly.`,
  ]);
  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// 1b. Faculty: new booking
// ---------------------------------------------------------------------------

export function newBookingForFaculty(d: BookingEmailData): RenderedEmail {
  const subject = `New booking: ${d.student.fullName} · ${shortDate(d.date)}, ${time(d.startSlot)}`;
  const url = `${appUrl()}/faculty/bookings/${d.occurrenceId}`;
  const seats = seatsLine(d);
  const html = layout({
    title: subject,
    preheader: [typeText(d), seats && `${seats} taken`].filter(Boolean).join(' · '),
    pill: { label: 'New booking', tone: 'info' },
    heading: `${d.student.fullName} booked a consultation`,
    introHtml: `A student booked your consultation slot.${seats ? ` <strong style="color:${C.ink};">${esc(seats)}</strong> are now taken.` : ''}`,
    date: d.date,
    whenTime: time(d.startSlot),
    whenSub: `Seat ${d.faculty.seat || '—'} · Dhaka time (GMT+6)`,
    rows: [
      ['Student', esc(d.student.fullName)],
      ['Student ID', esc(d.student.studentId ?? '—')],
      ['Email', `<a href="mailto:${esc(d.student.email)}" style="color:${C.brand};text-decoration:none;">${esc(d.student.email)}</a>`],
      ['Type', tag(d)],
    ],
    quote: d.reason ? { label: 'Reason', text: d.reason, tone: 'soft' } : undefined,
    cta: { label: 'View roster', href: url },
    noteHtml: `Reply to this email to contact ${esc(firstName(d.student.fullName))} directly.`,
    footerReason: "You're receiving this because a student booked one of your consultation slots.",
  });
  const text = textEmail([
    `${d.student.fullName} booked a consultation`,
    '',
    `When:       ${longDate(d.date)}, ${time(d.startSlot)} (Dhaka time)`,
    seats ? `Seats:      ${seats} taken` : null,
    `Student:    ${d.student.fullName}`,
    `Student ID: ${d.student.studentId ?? '—'}`,
    `Email:      ${d.student.email}`,
    `Type:       ${typeText(d)}`,
    d.reason ? `Reason:     ${d.reason}` : null,
    '',
    `View roster: ${url}`,
    '',
    `Reply to this email to contact ${firstName(d.student.fullName)} directly.`,
  ]);
  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// 2. Faculty: a student cancelled
// ---------------------------------------------------------------------------

export function studentCancelledForFaculty(d: BookingEmailData): RenderedEmail {
  const subject = `Cancelled: ${d.student.fullName} · ${shortDate(d.date)}, ${time(d.startSlot)}`;
  const url = `${appUrl()}/faculty/bookings/${d.occurrenceId}`;
  const seats = seatsLine(d);
  const html = layout({
    title: subject,
    preheader: ['A seat is free again', seats && `${seats} taken`].filter(Boolean).join(' · '),
    pill: { label: 'Cancelled by student', tone: 'neutral' },
    heading: `${d.student.fullName} cancelled their booking`,
    introHtml: `Their seat is free again.${seats ? ` <strong style="color:${C.ink};">${esc(seats)}</strong> are now taken.` : ''}`,
    date: d.date,
    whenTime: time(d.startSlot),
    whenSub: `Seat ${d.faculty.seat || '—'} · Dhaka time (GMT+6)`,
    cancelled: true,
    rows: [
      ['Student', esc(d.student.fullName)],
      ['Student ID', esc(d.student.studentId ?? '—')],
      ['Type', tag(d)],
    ],
    cta: { label: 'View roster', href: url },
    footerReason: "You're receiving this because a student cancelled a booking in one of your consultation slots.",
  });
  const text = textEmail([
    `${d.student.fullName} cancelled their booking`,
    '',
    `Their seat is free again.${seats ? ` ${seats} are now taken.` : ''}`,
    '',
    `When:       ${longDate(d.date)}, ${time(d.startSlot)} (Dhaka time)`,
    `Student:    ${d.student.fullName}`,
    `Student ID: ${d.student.studentId ?? '—'}`,
    `Type:       ${typeText(d)}`,
    '',
    `View roster: ${url}`,
  ]);
  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// 3 & 4. Student: removed, or the slot / day was cancelled
// ---------------------------------------------------------------------------

export type StudentCancellation = 'removed' | 'slot' | 'day';

export function cancelledForStudent(d: BookingEmailData, reason: string | null, kind: StudentCancellation): RenderedEmail {
  const when = `${longDate(d.date)} at ${time(d.startSlot)}`;
  const subject =
    kind === 'day' ? `Consultations on ${shortDate(d.date)} are cancelled` : `Your consultation on ${shortDate(d.date)} was cancelled`;
  const intro =
    kind === 'removed'
      ? `removed your booking for this consultation.`
      : kind === 'day'
        ? `cancelled all consultations on ${esc(format(d.date, 'EEEE, d MMMM', { timeZone: 'UTC' }))}, including yours.`
        : `cancelled the ${esc(time(d.startSlot))} consultation on ${esc(format(d.date, 'EEEE, d MMMM', { timeZone: 'UTC' }))}.`;
  const rebook = `${appUrl()}/faculty/${d.faculty.publicId}`;
  const mine = `${appUrl()}/student/bookings?tab=cancelled`;
  const html = layout({
    title: subject,
    preheader:
      kind === 'removed'
        ? `${d.faculty.fullName} removed your booking for ${time(d.startSlot)}`
        : `Your ${time(d.startSlot)} consultation with ${d.faculty.fullName} is cancelled`,
    pill: { label: 'Cancelled', tone: 'bad' },
    heading: 'Your consultation was cancelled',
    introHtml: `Hi ${esc(firstName(d.student.fullName))}, <strong style="color:${C.ink};">${esc(d.faculty.fullName)}</strong> ${intro}`,
    date: d.date,
    whenTime: time(d.startSlot),
    whenSub: `Seat ${d.faculty.seat || '—'} · Dhaka time (GMT+6)`,
    cancelled: true,
    quote: reason ? { label: 'Reason from your faculty', text: reason, tone: 'reason' } : undefined,
    cta: { label: 'Book another slot', href: rebook },
    secondary: { label: 'View my bookings', href: mine },
    noteHtml: `Reply to this email to reach ${esc(d.faculty.fullName)} directly.`,
    footerReason: "You're receiving this because you had booked this consultation with your BRACU account.",
  });
  const text = textEmail([
    'Your consultation was cancelled',
    '',
    `Hi ${firstName(d.student.fullName)}, ${d.faculty.fullName} ${
      kind === 'removed'
        ? 'removed your booking for this consultation.'
        : kind === 'day'
          ? `cancelled all consultations on ${format(d.date, 'EEEE, d MMMM', { timeZone: 'UTC' })}, including yours.`
          : `cancelled the ${time(d.startSlot)} consultation on ${format(d.date, 'EEEE, d MMMM', { timeZone: 'UTC' })}.`
    }`,
    '',
    `When:  ${when} (Dhaka time)`,
    `Where: Seat ${d.faculty.seat || '—'}`,
    reason ? `Reason from your faculty: ${reason}` : null,
    '',
    `Book another slot: ${rebook}`,
    `View my bookings:  ${mine}`,
    '',
    `Reply to this email to reach ${d.faculty.fullName} directly.`,
  ]);
  return { subject, html, text };
}
