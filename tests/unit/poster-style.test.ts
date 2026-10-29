import { describe, it, expect } from 'vitest';
import { DEFAULT_POSTER_STYLE, parsePosterStyle, posterStyleSchema } from '@/lib/qr/poster-style';

describe('parsePosterStyle — loading a saved QR poster design', () => {
  it('returns the default design when nothing is saved', () => {
    expect(parsePosterStyle(null)).toEqual(DEFAULT_POSTER_STYLE);
    expect(parsePosterStyle(undefined)).toEqual(DEFAULT_POSTER_STYLE);
  });

  it('fills fields missing from an older saved design with defaults', () => {
    const style = parsePosterStyle({ theme: 'grape', headline: 'Office hours' });
    expect(style.theme).toBe('grape');
    expect(style.headline).toBe('Office hours');
    expect(style.showHours).toBe(DEFAULT_POSTER_STYLE.showHours);
  });

  it('falls back to the default design when stored data is invalid', () => {
    expect(parsePosterStyle({ theme: 'neon-green' })).toEqual(DEFAULT_POSTER_STYLE);
    expect(parsePosterStyle('not an object')).toEqual(DEFAULT_POSTER_STYLE);
  });
});

describe('posterStyleSchema — saving a design', () => {
  it('rejects an empty or overlong headline', () => {
    expect(posterStyleSchema.safeParse({ ...DEFAULT_POSTER_STYLE, headline: '   ' }).success).toBe(false);
    expect(posterStyleSchema.safeParse({ ...DEFAULT_POSTER_STYLE, headline: 'x'.repeat(41) }).success).toBe(false);
  });

  it('only accepts the offered badges', () => {
    expect(posterStyleSchema.safeParse({ ...DEFAULT_POSTER_STYLE, emoji: '🎓' }).success).toBe(true);
    expect(posterStyleSchema.safeParse({ ...DEFAULT_POSTER_STYLE, emoji: '💀' }).success).toBe(false);
  });
});
