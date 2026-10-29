import { z } from 'zod';

// Hex values (not Tailwind classes) because the same palette paints both the
// HTML poster and the canvas PNG export. Every `from`/`via`/`to` keeps white
// header text legible; `ink` tints the QR modules and stays dark enough to scan.
export const POSTER_THEMES = {
  ocean: { label: 'Ocean', from: '#0284c7', via: '#0369a1', to: '#4338ca', ink: '#0c4a6e', soft: '#e0f2fe', ring: '#bae6fd', text: '#0369a1' },
  sunset: { label: 'Sunset', from: '#ea580c', via: '#e11d48', to: '#be185d', ink: '#7c2d12', soft: '#fff1f2', ring: '#fecdd3', text: '#be123c' },
  forest: { label: 'Forest', from: '#059669', via: '#047857', to: '#0f766e', ink: '#064e3b', soft: '#ecfdf5', ring: '#a7f3d0', text: '#047857' },
  grape: { label: 'Grape', from: '#7c3aed', via: '#6d28d9', to: '#c026d3', ink: '#4c1d95', soft: '#f5f3ff', ring: '#ddd6fe', text: '#6d28d9' },
  rose: { label: 'Rose', from: '#ec4899', via: '#db2777', to: '#9d174d', ink: '#831843', soft: '#fdf2f8', ring: '#fbcfe8', text: '#be185d' },
  amber: { label: 'Amber', from: '#b45309', via: '#92400e', to: '#78350f', ink: '#78350f', soft: '#fffbeb', ring: '#fde68a', text: '#b45309' },
  teal: { label: 'Teal', from: '#0d9488', via: '#0f766e', to: '#155e75', ink: '#134e4a', soft: '#f0fdfa', ring: '#99f6e4', text: '#0f766e' },
  midnight: { label: 'Midnight', from: '#334155', via: '#1e293b', to: '#312e81', ink: '#0f172a', soft: '#f1f5f9', ring: '#cbd5e1', text: '#334155' },
} as const;

export type PosterThemeKey = keyof typeof POSTER_THEMES;
export type PosterTheme = (typeof POSTER_THEMES)[PosterThemeKey];

export const POSTER_EMOJIS = ['📅', '🎓', '📚', '💡', '☕', '🚀', '✨', '🤝'] as const;

export const posterStyleSchema = z.object({
  theme: z.enum(Object.keys(POSTER_THEMES) as [PosterThemeKey, ...PosterThemeKey[]]),
  header: z.enum(['gradient', 'solid', 'dots']),
  emoji: z.enum(['none', ...POSTER_EMOJIS]),
  headline: z.string().trim().min(1, 'Add a headline').max(40),
  message: z.string().trim().max(90),
  tintQr: z.boolean(),
  showHours: z.boolean(),
  showSeat: z.boolean(),
  showInitial: z.boolean(),
});

export type PosterStyle = z.infer<typeof posterStyleSchema>;

export const DEFAULT_POSTER_STYLE: PosterStyle = {
  theme: 'ocean',
  header: 'gradient',
  emoji: 'none',
  headline: 'Book a consultation',
  message: 'Scan the code to see my free slots and book one.',
  tintQr: false,
  showHours: true,
  showSeat: true,
  showInitial: true,
};

/** Stored JSON may predate a field or be hand-edited: fall back field by field. */
export function parsePosterStyle(raw: unknown): PosterStyle {
  const merged = { ...DEFAULT_POSTER_STYLE, ...(raw && typeof raw === 'object' ? raw : {}) };
  const parsed = posterStyleSchema.safeParse(merged);
  return parsed.success ? parsed.data : DEFAULT_POSTER_STYLE;
}

export function headerBackground(style: PosterStyle) {
  const t = POSTER_THEMES[style.theme];
  return style.header === 'solid' ? t.via : `linear-gradient(135deg, ${t.from}, ${t.via} 50%, ${t.to})`;
}
