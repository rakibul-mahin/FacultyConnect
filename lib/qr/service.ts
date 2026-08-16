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

export async function generateQrDataUrl(token: string) {
  const url = buildFacultyQrUrl(token);
  return QRCode.toDataURL(url, {
    width: 480,
    margin: 2,
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
