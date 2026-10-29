'use client';

import { useEffect, useState, useTransition } from 'react';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { Check, Copy, Download, ImageDown, Link2, Loader2, Printer, RefreshCw, Share2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { regenerateQrAction, savePosterStyleAction } from '@/app/(faculty-app)/faculty/qr/actions';
import { POSTER_THEMES, type PosterStyle } from '@/lib/qr/poster-style';
import { PosterCustomiser } from '@/components/qr/poster-customiser';
import { logoMarkSvg } from '@/components/brand/logo';
import { QrPoster, type PosterFaculty } from '@/components/qr/qr-poster';

const W = 1200;
const PAD = 90;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Lays chip labels into centred rows no wider than `max`. */
function chipRows(ctx: CanvasRenderingContext2D, labels: string[], max: number, padX: number, gap: number) {
  const rows: { label: string; w: number }[][] = [[]];
  let rowW = 0;
  for (const label of labels) {
    const w = ctx.measureText(label).width + padX * 2;
    if (rowW + w > max && rows[rows.length - 1]!.length > 0) {
      rows.push([]);
      rowW = 0;
    }
    rows[rows.length - 1]!.push({ label, w });
    rowW += w + gap;
  }
  return rows;
}

/** Greedy word wrap for canvas text. */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > max && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Paints the QrPoster layout onto a canvas at 1200px wide for a crisp, shareable PNG. */
async function drawPoster(qrSrc: string, url: string, faculty: PosterFaculty, hours: string[], style: PosterStyle) {
  const theme = POSTER_THEMES[style.theme];
  const font = getComputedStyle(document.body).fontFamily;
  const [qr, brandMark] = await Promise.all([
    loadImage(qrSrc),
    loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(logoMarkSvg('#ffffff'))}`),
  ]);
  const measure = document.createElement('canvas').getContext('2d')!;
  const textW = W - PAD * 2;

  measure.font = `800 76px ${font}`;
  const headlineLines = wrapLines(measure, style.headline, textW);
  measure.font = `500 34px ${font}`;
  const messageLines = style.message ? wrapLines(measure, style.message, textW) : [];
  measure.font = `600 28px ${font}`;
  const shownHours = style.showHours ? hours : [];
  const rows = shownHours.length ? chipRows(measure, shownHours, textW - 80, 22, 14) : [];
  const meta = [style.showInitial && faculty.initial, style.showSeat && faculty.seat && `Seat ${faculty.seat}`].filter(Boolean).join('  ·  ');

  const headlineTop = 240;
  const textBottom = headlineTop + (headlineLines.length - 1) * 88 + (messageLines.length ? 30 + messageLines.length * 46 : 0);
  const card = 660;
  const cardY = textBottom + 85;
  const headerH = cardY + 170;
  const hoursH = rows.length ? 110 + rows.length * 62 : 0;
  const H = cardY + card + 70 + 100 + (meta ? 62 : 0) + (rows.length ? 50 + hoursH - 20 : 0) + 130;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const spacing = (v: string) => {
    if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = v;
  };

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Header band in the chosen theme and style
  if (style.header === 'solid') ctx.fillStyle = theme.via;
  else {
    const grad = ctx.createLinearGradient(0, 0, W, headerH);
    grad.addColorStop(0, theme.from);
    grad.addColorStop(0.5, theme.via);
    grad.addColorStop(1, theme.to);
    ctx.fillStyle = grad;
  }
  ctx.fillRect(0, 0, W, headerH);
  if (style.header === 'dots') {
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    for (let y = 18; y < headerH; y += 34) {
      for (let x = 18; x < W; x += 34) {
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.drawImage(brandMark, PAD, 84, 46, 46);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = `700 28px ${font}`;
  spacing('6px');
  ctx.fillText('CONSULTLY', PAD + 60, 120);
  spacing('0px');
  if (style.emoji !== 'none') {
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.roundRect(W - PAD - 110, 62, 110, 110, 30);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.font = `64px ${font}`;
    ctx.fillStyle = '#000000'; // opaque, or Chrome draws the colour emoji at the badge's 20% alpha
    ctx.fillText(style.emoji, W - PAD - 55, 140);
    ctx.textAlign = 'left';
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 76px ${font}`;
  headlineLines.forEach((line, i) => ctx.fillText(line, PAD, headlineTop + i * 88));
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `500 34px ${font}`;
  messageLines.forEach((line, i) => ctx.fillText(line, PAD, headlineTop + (headlineLines.length - 1) * 88 + 76 + i * 46));

  // QR card overlapping the header
  const cardX = (W - card) / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(15,23,42,0.18)';
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 16;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, card, card, 44);
  ctx.fill();
  ctx.restore();
  ctx.drawImage(qr, cardX + 30, cardY + 30, card - 60, card - 60);

  ctx.textAlign = 'center';
  let y = cardY + card + 70;
  ctx.fillStyle = theme.text;
  ctx.font = `700 26px ${font}`;
  spacing('2px');
  ctx.fillText('SCAN WITH YOUR PHONE CAMERA', W / 2, y);
  spacing('0px');

  // Name, shrunk to fit on one line
  y += 100;
  let size = 60;
  ctx.font = `800 ${size}px ${font}`;
  while (ctx.measureText(faculty.fullName).width > textW && size > 36) {
    size -= 2;
    ctx.font = `800 ${size}px ${font}`;
  }
  ctx.fillStyle = '#0f172a';
  ctx.fillText(faculty.fullName, W / 2, y);
  if (meta) {
    y += 62;
    ctx.fillStyle = '#475569';
    ctx.font = `500 34px ${font}`;
    ctx.fillText(meta, W / 2, y);
  }

  if (rows.length) {
    y += 50;
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(PAD, y, textW, hoursH - 20, 32);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#64748b';
    ctx.font = `700 24px ${font}`;
    ctx.fillText('CONSULTATION HOURS', W / 2, y + 58);
    ctx.font = `600 28px ${font}`;
    let rowY = y + 90;
    for (const row of rows) {
      const rowW = row.reduce((sum, c) => sum + c.w, 0) + (row.length - 1) * 14;
      let x = (W - rowW) / 2;
      for (const chip of row) {
        ctx.fillStyle = theme.soft;
        ctx.strokeStyle = theme.ring;
        ctx.beginPath();
        ctx.roundRect(x, rowY, chip.w, 48, 24);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = theme.text;
        ctx.fillText(chip.label, x + chip.w / 2, rowY + 34);
        x += chip.w + 14;
      }
      rowY += 62;
    }
  }

  ctx.fillStyle = '#94a3b8';
  ctx.font = `500 24px ${font}`;
  ctx.fillText(url.replace(/^https?:\/\//, ''), W / 2, H - 60);

  return new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'));
}

function fileName(faculty: PosterFaculty) {
  return `consultation-qr-${(faculty.initial || faculty.fullName).toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
}

function triggerDownload(href: string, name: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  a.click();
}

export function QrPanel({
  dataUrl,
  url,
  faculty,
  hours,
  initialStyle,
}: {
  dataUrl: string;
  url: string;
  faculty: PosterFaculty;
  hours: string[];
  initialStyle: PosterStyle;
}) {
  const [pending, startTransition] = useTransition();
  const [saving, startSaving] = useTransition();
  const [saved, setSaved] = useState(initialStyle);
  const [style, setStyle] = useState(initialStyle);
  const [tintedQr, setTintedQr] = useState<string | null>(null);
  const dirty = JSON.stringify(style) !== JSON.stringify(saved);
  const ink = POSTER_THEMES[style.theme].ink;
  const qrSrc = style.tintQr && tintedQr ? tintedQr : dataUrl;

  // The plain QR comes from the server; a theme-tinted one is drawn here.
  useEffect(() => {
    if (!style.tintQr) return;
    let cancelled = false;
    QRCode.toDataURL(url, { width: 1024, margin: 1, errorCorrectionLevel: 'M', color: { dark: ink, light: '#ffffff' } })
      .then((src) => !cancelled && setTintedQr(src))
      .catch(() => !cancelled && setTintedQr(null));
    return () => {
      cancelled = true;
    };
  }, [style.tintQr, ink, url]);

  const saveStyle = () =>
    startSaving(async () => {
      const res = await savePosterStyleAction(style);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setSaved(style);
      toast.success('Poster design saved');
    });
  const [busy, setBusy] = useState<'poster' | 'share' | null>(null);
  const [copied, setCopied] = useState(false);

  const regenerate = () => {
    startTransition(async () => {
      const res = await regenerateQrAction();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      // The new QR image is rendered on the server, so reload to pick it up.
      window.location.reload();
    });
  };

  const downloadPoster = async () => {
    setBusy('poster');
    try {
      const blob = await drawPoster(qrSrc, url, faculty, hours, style);
      const href = URL.createObjectURL(blob);
      triggerDownload(href, fileName(faculty));
      setTimeout(() => URL.revokeObjectURL(href), 1000);
      toast.success('Poster saved');
    } catch {
      toast.error('Could not create the poster image');
    } finally {
      setBusy(null);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy the link');
    }
  };

  const share = async () => {
    setBusy('share');
    try {
      const blob = await drawPoster(qrSrc, url, faculty, hours, style);
      const file = new File([blob], fileName(faculty), { type: 'image/png' });
      const data = { title: `Book a consultation with ${faculty.fullName}`, text: `Book a consultation with ${faculty.fullName}: ${url}`, files: [file] };
      if (navigator.canShare?.(data)) await navigator.share(data);
      else if (navigator.share) await navigator.share({ title: data.title, text: data.text, url });
      else await copyLink();
    } catch (err) {
      if ((err as Error).name !== 'AbortError') toast.error('Sharing is not available here — link copied instead');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div
        className="rounded-3xl border border-border bg-muted/40 px-4 py-8 sm:px-8 lg:sticky lg:top-6 lg:self-start print:static print:border-0 print:bg-transparent print:p-0"
        style={{ backgroundImage: 'radial-gradient(hsl(var(--border)) 1px, transparent 1px)', backgroundSize: '16px 16px' }}
      >
        <QrPoster qrSrc={qrSrc} url={url} faculty={faculty} hours={hours} style={style} />
      </div>

      <div className="space-y-4 print:hidden">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="font-semibold">Share with students</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Print it for your door, or send the poster to your sections.</p>
          <div className="mt-4 space-y-2">
            <Button className="w-full justify-start" size="lg" onClick={downloadPoster} loading={busy === 'poster'}>
              {busy !== 'poster' && <ImageDown className="h-4 w-4" />}
              Download poster (PNG)
            </Button>
            <Button variant="outline" className="w-full justify-start" size="lg" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print poster
            </Button>
            <Button variant="outline" className="w-full justify-start" size="lg" onClick={share} loading={busy === 'share'}>
              {busy !== 'share' && <Share2 className="h-4 w-4" />}
              Share…
            </Button>
          </div>
        </section>

        <PosterCustomiser style={style} onChange={setStyle} dirty={dirty} saving={saving} onSave={saveStyle} />

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="flex items-center gap-2 font-semibold">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            Booking link
          </h2>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-1.5 pl-3">
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">{url.replace(/^https?:\/\//, '')}</span>
            <Button size="sm" variant="secondary" onClick={copyLink} aria-label="Copy booking link">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <button
            type="button"
            onClick={() => triggerDownload(qrSrc, fileName(faculty).replace('consultation-qr', 'qr-only'))}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <Download className="h-3.5 w-3.5" />
            Download the QR code only
          </button>
        </section>

        <section className="rounded-2xl border border-destructive/25 bg-destructive/[0.03] p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            Replace QR code
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Only if an old code was shared somewhere it shouldn&apos;t be. Printed and saved copies stop working.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="mt-3 text-destructive hover:bg-destructive/10 hover:text-destructive" loading={pending}>
                {!pending && <RefreshCw className="h-3.5 w-3.5" />}
                Regenerate
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Regenerate QR code?</AlertDialogTitle>
                <AlertDialogDescription>
                  This creates a new QR code and permanently invalidates the old one. Any printed or saved copies of the
                  current QR code will stop working.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={regenerate} disabled={pending} aria-busy={pending}>
                  {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  Regenerate
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      </div>
    </div>
  );
}
