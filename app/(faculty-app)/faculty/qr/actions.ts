'use server';

import { revalidatePath } from 'next/cache';
import { requireFacultySession } from '@/lib/auth/session';
import { regenerateToken } from '@/lib/qr/service';
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
