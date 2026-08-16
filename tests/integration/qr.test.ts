import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { resetDb, disconnectDb } from '../helpers/db';
import { createFaculty } from '../helpers/factories';
import { getOrCreateActiveToken, regenerateToken, resolveFacultyByToken } from '@/lib/qr/service';

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
