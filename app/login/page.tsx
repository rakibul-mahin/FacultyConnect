import { redirect } from 'next/navigation';
import { safeRedirectPath } from '@/lib/auth/redirect';
import { auth } from '@/lib/auth';
import { LoginView } from '@/components/auth/login-view';

export default async function LoginPage({ searchParams }: { searchParams: { callbackUrl?: string } }) {
  const session = await auth();
  if (session?.user) redirect(safeRedirectPath(searchParams.callbackUrl));

  return (
    <LoginView
      googleConfigured={Boolean(process.env.GOOGLE_CLIENT_ID)}
      callbackUrl={searchParams.callbackUrl ?? null}
    />
  );
}
