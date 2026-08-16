'use server';

import { signIn } from '@/lib/auth';

function safeRedirect(callbackUrl?: string | null) {
  // Only ever follow same-origin relative paths — never an absolute/external URL.
  if (callbackUrl && callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')) return callbackUrl;
  return '/';
}

export async function signInWithGoogle(callbackUrl?: string | null) {
  await signIn('google', { redirectTo: safeRedirect(callbackUrl) });
}
