import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { resetDb, disconnectDb } from '../helpers/db';
import { provisionUserForEmail } from '@/lib/auth/provision';
import { prisma } from '@/lib/db/prisma';

beforeEach(resetDb);
afterAll(disconnectDb);

describe('provisionUserForEmail — server-side role derivation (§8, §45)', () => {
  it('creates a FACULTY user + profile for a @bracu.ac.bd email', async () => {
    const result = await provisionUserForEmail('new.faculty@bracu.ac.bd', 'New Faculty');
    expect(result?.role).toBe('FACULTY');
    expect(result?.facultyProfile).not.toBeNull();
    expect(result?.studentProfile).toBeNull();
  });

  it('creates a STUDENT user + profile for a @g.bracu.ac.bd email', async () => {
    const result = await provisionUserForEmail('new.student@g.bracu.ac.bd', 'New Student');
    expect(result?.role).toBe('STUDENT');
    expect(result?.studentProfile).not.toBeNull();
    expect(result?.studentProfile?.studentId).toBeNull(); // must complete profile before booking
  });

  it('refuses to provision any account for an unrecognized domain', async () => {
    const result = await provisionUserForEmail('someone@gmail.com', 'Nobody');
    expect(result).toBeNull();
    const user = await prisma.user.findUnique({ where: { email: 'someone@gmail.com' } });
    expect(user).toBeNull();
  });

  it('is idempotent and does not duplicate the profile on repeated sign-in', async () => {
    await provisionUserForEmail('repeat@bracu.ac.bd', 'Repeat Faculty');
    await provisionUserForEmail('repeat@bracu.ac.bd', 'Repeat Faculty');
    const count = await prisma.facultyProfile.count({ where: { email: 'repeat@bracu.ac.bd' } });
    expect(count).toBe(1);
  });
});
