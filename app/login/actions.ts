'use server';

import { signIn } from '@/lib/auth';
import { safeRedirectPath } from '@/lib/auth/redirect';

export async function signInWithGoogle(callbackUrl?: string | null) {
  await signIn('google', { redirectTo: safeRedirectPath(callbackUrl) });
}
