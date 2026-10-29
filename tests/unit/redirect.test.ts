import { describe, it, expect } from 'vitest';
import { safeRedirectPath } from '@/lib/auth/redirect';

describe('safeRedirectPath — post-login redirect', () => {
  it('keeps same-origin paths', () => {
    expect(safeRedirectPath('/faculty/abc')).toBe('/faculty/abc');
    expect(safeRedirectPath('/student/bookings?tab=cancelled')).toBe('/student/bookings?tab=cancelled');
  });

  it('refuses links to other sites', () => {
    expect(safeRedirectPath('https://evil.example')).toBe('/');
    expect(safeRedirectPath('//evil.example')).toBe('/');
    expect(safeRedirectPath('/\\evil.example')).toBe('/');
    expect(safeRedirectPath('javascript:alert(1)')).toBe('/');
  });

  it('falls back to home when missing', () => {
    expect(safeRedirectPath(undefined)).toBe('/');
    expect(safeRedirectPath('')).toBe('/');
  });
});
