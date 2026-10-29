'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

export const BRAND_NAME = 'Consultly';
export const BRAND_DEVELOPER = 'Redefyn';

// The Consultly mark on a 64×64 grid: a calendar (two binder rings) whose
// frame runs down into a chat bubble with three dots. Shared by the React
// component and the canvas PNG export so they never drift apart.
const CALENDAR = 'M20 53H16a7 7 0 0 1-7-7V21a8 8 0 0 1 8-8h31a8 8 0 0 1 8 8v4';
const RINGS = ['M22 6v11', 'M42 6v11'];
const BUBBLE = 'M33 28h18a7 7 0 0 1 7 7v11a7 7 0 0 1-7 7H37l-7 6v-6a7 7 0 0 1-4-6.3V35a7 7 0 0 1 7-7z';
const DOTS = [36.5, 42, 47.5];

/** Standalone SVG markup of the mark in one flat colour (for canvas drawing). */
export function logoMarkSvg(color: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="${CALENDAR}"/>${RINGS.map((d) => `<path d="${d}"/>`).join('')}<path d="${BUBBLE}"/>${DOTS.map((cx) => `<circle cx="${cx}" cy="40.5" r="2.6" fill="${color}" stroke="none"/>`).join('')}</svg>`;
}

/**
 * The mark. `gradient` is the brand blue; `white` is for coloured
 * backgrounds such as the QR poster header.
 */
export function LogoMark({ className, tone = 'gradient' }: { className?: string; tone?: 'gradient' | 'white' }) {
  // A unique gradient id per instance: if two marks shared one and the first
  // were hidden (desktop sidebar vs mobile header), the other would lose it.
  const id = useId().replace(/:/g, '');
  const paint = tone === 'white' ? '#ffffff' : `url(#${id}-g)`;

  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden className={cn('h-8 w-8 shrink-0', className)}>
      {tone === 'gradient' && (
        <defs>
          <linearGradient id={`${id}-g`} x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38bdf8" />
            <stop offset="0.55" stopColor="#2563eb" />
            <stop offset="1" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>
      )}
      <g stroke={paint} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round">
        <path d={CALENDAR} />
        {RINGS.map((d) => (
          <path key={d} d={d} />
        ))}
        <path d={BUBBLE} />
      </g>
      {DOTS.map((cx) => (
        <circle key={cx} cx={cx} cy={40.5} r={2.6} fill={paint} />
      ))}
    </svg>
  );
}

/** Mark + "Consultly" wordmark, with the brand gradient on "ly". */
export function Logo({ className, markClassName, textClassName }: { className?: string; markClassName?: string; textClassName?: string }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <LogoMark className={markClassName} />
      <span className={cn('text-lg font-extrabold tracking-tight', textClassName)}>
        Consult
        <span className="bg-gradient-to-br from-sky-400 via-blue-600 to-blue-700 bg-clip-text text-transparent">ly</span>
      </span>
    </span>
  );
}
