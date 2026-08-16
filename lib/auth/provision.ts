import { prisma } from '@/lib/db/prisma';
import { FACULTY_EMAIL_DOMAIN, STUDENT_EMAIL_DOMAIN } from '@/lib/constants';
import type { Role } from '@prisma/client';

/**
 * Derives role from a verified email domain. Never trust a client-supplied
 * role — this is the single source of truth (§8, §45).
 */
export function roleForEmail(email: string): Role | null {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return null;
  if (domain === FACULTY_EMAIL_DOMAIN) return 'FACULTY';
  if (domain === STUDENT_EMAIL_DOMAIN) return 'STUDENT';
  return null;
}

function initialsFromName(name: string): string {
  const letters = name
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();
  return letters.slice(0, 4) || 'FAC';
}

/**
 * Idempotently ensures a User (+ role-appropriate profile) exists for a
 * verified email, and returns the session-shaping fields. Called from the
 * NextAuth `signIn`/`jwt` callbacks only — never reachable from client input.
 */
export async function provisionUserForEmail(email: string, displayName: string) {
  const role = roleForEmail(email);
  if (!role) return null;

  const normalizedEmail = email.toLowerCase();

  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {},
    create: { email: normalizedEmail, role },
    include: { facultyProfile: true, studentProfile: true },
  });

  if (user.role !== role) {
    // Role is immutable once created; domain determines it permanently.
    return null;
  }

  if (role === 'FACULTY' && !user.facultyProfile) {
    await prisma.facultyProfile.create({
      data: {
        userId: user.id,
        fullName: displayName || normalizedEmail,
        email: normalizedEmail,
        initial: initialsFromName(displayName || normalizedEmail),
        seat: '',
      },
    });
  }

  if (role === 'STUDENT' && !user.studentProfile) {
    await prisma.studentProfile.create({
      data: {
        userId: user.id,
        fullName: displayName || normalizedEmail,
        email: normalizedEmail,
        studentId: null,
      },
    });
  }

  const full = await prisma.user.findUnique({
    where: { id: user.id },
    include: { facultyProfile: true, studentProfile: true },
  });

  return full;
}
