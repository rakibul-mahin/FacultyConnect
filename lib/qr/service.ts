import 'server-only';
import QRCode from 'qrcode';
import { prisma } from '@/lib/db/prisma';

/** Returns the faculty's active (non-revoked) QR token, creating one on first use. */
export async function getOrCreateActiveToken(facultyId: string) {
  const active = await prisma.qrToken.findFirst({
    where: { facultyId, revokedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (active) return active;
  return prisma.qrToken.create({ data: { facultyId } });
}

/** Rotates the token: revokes the current active one and mints a fresh one (§33). */
export async function regenerateToken(facultyId: string) {
  await prisma.qrToken.updateMany({
    where: { facultyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return prisma.qrToken.create({ data: { facultyId } });
}

export function buildFacultyQrUrl(token: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return `${base}/faculty/${token}`;
}

// Encoding a 1024px QR costs ~60ms of CPU, and the image only changes when the
// token is regenerated, so keep recent ones per server instance.
const qrCache = new Map<string, Promise<string>>();
const QR_CACHE_MAX = 200;

export async function generateQrDataUrl(token: string) {
  const url = buildFacultyQrUrl(token);
  const cached = qrCache.get(url);
  if (cached) return cached;
  if (qrCache.size >= QR_CACHE_MAX) qrCache.delete(qrCache.keys().next().value!);
  const rendered = renderQr(url).catch((err) => {
    qrCache.delete(url);
    throw err;
  });
  qrCache.set(url, rendered);
  return rendered;
}

function renderQr(url: string) {
  // Rendered large so the downloadable poster and print stay crisp; the page scales it down.
  return QRCode.toDataURL(url, {
    width: 1024,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#111827', light: '#ffffff' },
  });
}

/** Resolves a public route token to a faculty profile, honoring revocation. */
export async function resolveFacultyByToken(token: string) {
  const qr = await prisma.qrToken.findUnique({
    where: { token },
    include: { faculty: true },
  });
  if (!qr || qr.revokedAt) return null;
  return qr.faculty;
}

/**
 * Resolves a faculty page link: either the permanent publicId or an active
 * (non-revoked) QR token. Both are unique UUIDs, so one query with OR handles
 * either, loading the routine in the same round trip.
 */
export function resolveFacultyByLink(idOrToken: string) {
  return prisma.facultyProfile.findFirst({
    where: { OR: [{ publicId: idOrToken }, { qrTokens: { some: { token: idOrToken, revokedAt: null } } }] },
    include: { routineEntries: true },
  });
}
