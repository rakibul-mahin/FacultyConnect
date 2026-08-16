'use server';

import { revalidatePath } from 'next/cache';
import { requireStudentSession } from '@/lib/auth/session';
import { studentProfileSchema } from '@/lib/validation/profile';
import { prisma } from '@/lib/db/prisma';
import type { ActionResult } from '@/app/(faculty-app)/faculty/routine/actions';

export async function updateStudentProfileAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const session = await requireStudentSession();
    const input = studentProfileSchema.parse(rawInput);

    const existing = await prisma.studentProfile.findUnique({ where: { studentId: input.studentId } });
    if (existing && existing.id !== session.user.studentProfileId) {
      return { ok: false, error: 'That student ID is already registered to another account.' };
    }

    await prisma.studentProfile.update({
      where: { id: session.user.studentProfileId! },
      data: { studentId: input.studentId },
    });
    revalidatePath('/student/profile');
    revalidatePath('/student');
    return { ok: true, data: undefined };
  } catch (err) {
    console.error(err);
    return { ok: false, error: 'Could not update your profile.' };
  }
}
