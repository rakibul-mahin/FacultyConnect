'use client';

import { motion } from 'motion/react';
import { CalendarClock, GraduationCap, ShieldCheck, Users2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { signInWithGoogle } from '@/app/login/actions';
import { ThemeToggle } from '@/components/theme/theme-toggle';

export function LoginView({ googleConfigured, callbackUrl }: { googleConfigured: boolean; callbackUrl: string | null }) {
  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <div className="relative hidden flex-col justify-between overflow-hidden bg-foreground p-12 text-background lg:flex">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2 text-lg font-semibold"
        >
          <CalendarClock className="h-6 w-6" />
          FacultyConnect
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="space-y-6"
        >
          <h1 className="max-w-md text-4xl font-semibold leading-tight tracking-tight">
            Book faculty consultation time in seconds, not emails.
          </h1>
          <p className="max-w-md text-background/70">
            Faculty maintain one weekly routine. Students search, book, and show up — no spreadsheets,
            no back-and-forth.
          </p>
          <div className="grid max-w-md grid-cols-1 gap-3 pt-4 sm:grid-cols-3">
            <Feature icon={Users2} label="Live capacity" />
            <Feature icon={ShieldCheck} label="Private by design" />
            <Feature icon={GraduationCap} label="Built for BRACU" />
          </div>
        </motion.div>

        <p className="text-xs text-background/50">Developed and Maintained by· Mohammad Rakibul Hasan Mahin</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm space-y-8"
        >
          <div className="space-y-2 text-center lg:text-left">
            <div className="flex items-center justify-center gap-2 text-lg font-semibold lg:hidden">
              <CalendarClock className="h-5 w-5" />
              FacultyConnect
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
            <p className="text-sm text-muted-foreground">
              Faculty sign in with a <span className="font-medium text-foreground">@bracu.ac.bd</span> account.
              Students sign in with a <span className="font-medium text-foreground">@g.bracu.ac.bd</span> account.
            </p>
          </div>

          <Card>
            <CardContent className="space-y-4 pt-6">
              <form action={signInWithGoogle.bind(null, callbackUrl)}>
                <Button type="submit" variant="outline" size="lg" className="w-full" disabled={!googleConfigured}>
                  <GoogleIcon className="h-4 w-4" />
                  Continue with Google
                </Button>
              </form>
              {!googleConfigured && (
                <p className="text-center text-xs text-muted-foreground">
                  Google OAuth isn&apos;t configured in this environment yet. Set GOOGLE_CLIENT_ID and
                  GOOGLE_CLIENT_SECRET in your environment.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, label }: { icon: typeof Users2; label: string }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-lg border border-background/15 bg-background/5 p-3">
      <Icon className="h-4 w-4" />
      <span className="text-xs text-background/80">{label}</span>
    </div>
  );
}

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
