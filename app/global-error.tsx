'use client';

import './globals.css';
import { ErrorFallback } from '@/components/errors/error-fallback';

// Catches errors in the root layout itself, where app/error.tsx can't help.
// It replaces the whole document, so it renders its own <html> and <body>.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en" translate="no">
      <body className="bg-background font-sans text-foreground">
        <ErrorFallback error={error} reset={reset} />
      </body>
    </html>
  );
}
