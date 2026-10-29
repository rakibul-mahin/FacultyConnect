'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireStudentSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import type { ActionResult } from '@/app/(faculty-app)/faculty/routine/actions';

const markReadSchema = z.object({ ids: z.array(z.string().uuid()).max(100).optional() });

/** Marks the given notifications (or all of them) read — only ever the caller's own. */
export async function markNotificationsReadAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const session = await requireStudentSession();
    const { ids } = markReadSchema.parse(rawInput ?? {});
    await prisma.notification.updateMany({
      where: { studentId: session.user.studentProfileId!, readAt: null, ...(ids && { id: { in: ids } }) },
      data: { readAt: new Date() },
    });
    revalidatePath('/student', 'layout');
    return { ok: true, data: undefined };
  } catch (err) {
    console.error(err);
    return { ok: false, error: 'Could not update notifications.' };
  }
}
