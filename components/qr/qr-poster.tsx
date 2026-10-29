import { MapPin, ScanLine } from 'lucide-react';
import { LogoMark } from '@/components/brand/logo';
import { POSTER_THEMES, headerBackground, type PosterStyle } from '@/lib/qr/poster-style';

export interface PosterFaculty {
  fullName: string;
  initial: string;
  seat: string;
}

const DOTS = 'radial-gradient(rgba(255,255,255,0.22) 1.5px, transparent 1.5px)';

/**
 * The printable/shareable QR poster. Colours come from the faculty's chosen
 * theme as inline hex (not theme tokens) so it prints and shares identically
 * in dark mode. `drawPoster` in qr-panel.tsx paints the same layout to PNG.
 */
export function QrPoster({
  qrSrc,
  url,
  faculty,
  hours,
  style,
}: {
  qrSrc: string;
  url: string;
  faculty: PosterFaculty;
  hours: string[];
  style: PosterStyle;
}) {
  const theme = POSTER_THEMES[style.theme];
  const showMeta = (style.showInitial && faculty.initial) || (style.showSeat && faculty.seat);

  return (
    <div
      id="qr-poster"
      className="mx-auto w-full max-w-[420px] overflow-hidden rounded-3xl bg-white text-slate-900 shadow-xl shadow-slate-900/10 ring-1 ring-slate-200 [print-color-adjust:exact] print:max-w-none print:rounded-none print:shadow-none print:ring-0"
    >
      <div
        className="relative overflow-hidden px-7 pb-16 pt-7 text-white transition-[background] duration-300"
        style={{
          background: headerBackground(style),
          ...(style.header === 'dots' && { backgroundImage: `${DOTS}, ${headerBackground(style)}`, backgroundSize: '14px 14px, auto' }),
        }}
      >
        <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/90">
            <LogoMark tone="white" className="h-5 w-5" />
            Consultly
          </p>
          {style.emoji !== 'none' && (
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 text-2xl backdrop-blur" aria-hidden>
              {style.emoji}
            </span>
          )}
        </div>
        <h2 className="mt-4 break-words text-[26px] font-bold leading-tight">{style.headline}</h2>
        {style.message && <p className="mt-1 break-words text-sm text-white/85">{style.message}</p>}
      </div>

      <div className="relative -mt-10 px-7 pb-7">
        <div className="mx-auto w-fit rounded-2xl bg-white p-3 shadow-lg shadow-slate-900/10 ring-1 ring-slate-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrSrc} alt="QR code for my consultation booking page" className="h-52 w-52 print:h-72 print:w-72" />
        </div>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: theme.text }}>
          <ScanLine className="h-4 w-4" />
          Scan with your phone camera
        </p>

        <div className="mt-6 text-center">
          <p className="text-xl font-bold leading-tight">{faculty.fullName}</p>
          {showMeta && (
            <p className="mt-1.5 flex items-center justify-center gap-3 text-sm text-slate-600">
              {style.showInitial && faculty.initial && (
                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">{faculty.initial}</span>
              )}
              {style.showSeat && faculty.seat && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  Seat {faculty.seat}
                </span>
              )}
            </p>
          )}
        </div>

        {style.showHours && hours.length > 0 && (
          <div className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
            <p className="text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Consultation hours</p>
            <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
              {hours.map((h) => (
                <span
                  key={h}
                  className="rounded-full px-2.5 py-1 text-xs font-semibold ring-1"
                  style={{ backgroundColor: theme.soft, color: theme.text, ['--tw-ring-color' as string]: theme.ring }}
                >
                  {h}
                </span>
              ))}
            </div>
          </div>
        )}

        <p className="mt-5 break-all text-center text-[11px] text-slate-400">{url.replace(/^https?:\/\//, '')}</p>
      </div>
    </div>
  );
}
