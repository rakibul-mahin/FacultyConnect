import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

export class AuthError extends Error {}

/** Server Action/Route Handler guard: throws instead of redirecting (for JSON responses). */
export async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new AuthError('Not authenticated');
  return session;
}

export async function requireFacultySession() {
  const session = await requireSession();
  if (session.user.role !== 'FACULTY' || !session.user.facultyProfileId) {
    throw new AuthError('Faculty access required');
  }
  return session;
}

export async function requireStudentSession() {
  const session = await requireSession();
  if (session.user.role !== 'STUDENT' || !session.user.studentProfileId) {
    throw new AuthError('Student access required');
  }
  return session;
}

/** Server Component page guard: redirects instead of throwing. */
export async function requireFacultyPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'FACULTY' || !session.user.facultyProfileId) redirect('/login');
  return session;
}

export async function requireStudentPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'STUDENT' || !session.user.studentProfileId) redirect('/login');
  return session;
}

/**
 * Profile lookups shared by a layout and its page within one request — React
 * cache() dedupes them so the row is fetched from the database only once.
 */
export const getFacultyProfileById = cache((id: string) => prisma.facultyProfile.findUnique({ where: { id } }));
export const getStudentProfileById = cache((id: string) => prisma.studentProfile.findUnique({ where: { id } }));

/** Loads the full faculty profile row for the authenticated faculty session. */
export async function currentFacultyProfile() {
  const session = await requireFacultySession();
  const profile = await prisma.facultyProfile.findUnique({
    where: { id: session.user.facultyProfileId! },
  });
  if (!profile) throw new AuthError('Faculty profile not found');
  return profile;
}

export async function currentStudentProfile() {
  const session = await requireStudentSession();
  const profile = await prisma.studentProfile.findUnique({
    where: { id: session.user.studentProfileId! },
  });
  if (!profile) throw new AuthError('Student profile not found');
  return profile;
}
