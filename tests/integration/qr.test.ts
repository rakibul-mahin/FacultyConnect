import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { resetDb, disconnectDb } from '../helpers/db';
import { createFaculty } from '../helpers/factories';
import { prisma } from '@/lib/db/prisma';
import { getOrCreateActiveToken, regenerateToken, resolveFacultyByLink, resolveFacultyByToken } from '@/lib/qr/service';

beforeEach(resetDb);
afterAll(disconnectDb);

describe('QR token lifecycle (§33)', () => {
  it('creates a token on first use and resolves it back to the faculty', async () => {
    const faculty = await createFaculty();
    const token = await getOrCreateActiveToken(faculty.id);
    const resolved = await resolveFacultyByToken(token.token);
    expect(resolved?.id).toBe(faculty.id);
  });

  it('regenerating invalidates the old token while a new one resolves correctly', async () => {
    const faculty = await createFaculty();
    const original = await getOrCreateActiveToken(faculty.id);
    const rotated = await regenerateToken(faculty.id);

    expect(rotated.token).not.toBe(original.token);

    const oldResolved = await resolveFacultyByToken(original.token);
    const newResolved = await resolveFacultyByToken(rotated.token);

    expect(oldResolved).toBeNull();
    expect(newResolved?.id).toBe(faculty.id);
  });
});

describe('resolveFacultyByLink — faculty page links', () => {
  it('resolves the permanent publicId and an active QR token, but not a revoked one', async () => {
    const faculty = await createFaculty();
    const original = await getOrCreateActiveToken(faculty.id);
    const rotated = await regenerateToken(faculty.id);

    expect((await resolveFacultyByLink(faculty.publicId))?.id).toBe(faculty.id);
    expect((await resolveFacultyByLink(rotated.token))?.id).toBe(faculty.id);
    expect(await resolveFacultyByLink(original.token)).toBeNull();
    expect(await resolveFacultyByLink('00000000-0000-4000-8000-000000000000')).toBeNull();
  });

  it('loads the routine with the faculty', async () => {
    const faculty = await createFaculty();
    await prisma.routineEntry.create({ data: { facultyId: faculty.id, day: 'SUNDAY', startSlot: 'T_11_00', type: 'CONSULTATION', capacity: 3 } });
    const resolved = await resolveFacultyByLink(faculty.publicId);
    expect(resolved?.routineEntries).toHaveLength(1);
  });
});
