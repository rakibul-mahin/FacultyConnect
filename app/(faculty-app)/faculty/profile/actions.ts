'use server';

import { revalidatePath } from 'next/cache';
import { requireFacultySession } from '@/lib/auth/session';
import { facultyProfileSchema } from '@/lib/validation/profile';
import { prisma } from '@/lib/db/prisma';
import type { ActionResult } from '@/app/(faculty-app)/faculty/routine/actions';

export async function updateFacultyProfileAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const session = await requireFacultySession();
    const input = facultyProfileSchema.parse(rawInput);
    await prisma.facultyProfile.update({
      where: { id: session.user.facultyProfileId! },
      data: { initial: input.initial.toUpperCase(), seat: input.seat },
    });
    revalidatePath('/faculty/profile');
    revalidatePath('/faculty');
    return { ok: true, data: undefined };
  } catch (err) {
    console.error(err);
    return { ok: false, error: 'Could not update your profile.' };
  }
}
