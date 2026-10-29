/**
 * Only ever follow same-origin relative paths. "//host" and "/\host" both
 * start with "/" but browsers treat them as links to another site.
 */
export function safeRedirectPath(callbackUrl?: string | null) {
  if (!callbackUrl || !callbackUrl.startsWith('/')) return '/';
  if (callbackUrl.startsWith('//') || callbackUrl.startsWith('/\\')) return '/';
  return callbackUrl;
}
