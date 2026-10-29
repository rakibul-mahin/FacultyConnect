'use server';

import { revalidatePath } from 'next/cache';
import { requireFacultySession } from '@/lib/auth/session';
import { ZodError } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { regenerateToken } from '@/lib/qr/service';
import { posterStyleSchema } from '@/lib/qr/poster-style';
import type { ActionResult } from '@/app/(faculty-app)/faculty/routine/actions';

export async function regenerateQrAction(): Promise<ActionResult<{ token: string }>> {
  try {
    const session = await requireFacultySession();
    const token = await regenerateToken(session.user.facultyProfileId!);
    revalidatePath('/faculty/qr');
    return { ok: true, data: { token: token.token } };
  } catch (err) {
    console.error(err);
    return { ok: false, error: 'Could not regenerate the QR code.' };
  }
}

export async function savePosterStyleAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const session = await requireFacultySession();
    const style = posterStyleSchema.parse(rawInput);
    await prisma.facultyProfile.update({ where: { id: session.user.facultyProfileId! }, data: { posterStyle: style } });
    revalidatePath('/faculty/qr');
    return { ok: true, data: undefined };
  } catch (err) {
    if (err instanceof ZodError) return { ok: false, error: err.issues[0]?.message ?? 'Invalid poster settings.' };
    console.error(err);
    return { ok: false, error: 'Could not save your poster.' };
  }
}
