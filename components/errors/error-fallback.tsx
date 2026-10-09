'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

const RELOAD_KEY = 'fc:chunk-reload-at';

// After a new deploy, a tab opened earlier still references the previous
// build's JavaScript chunks, which no longer exist. Loading them fails with
// one of these errors; a full reload picks up the new build.
function isStaleDeployError(error: Error) {
  return (
    error.name === 'ChunkLoadError' ||
    /Loading (CSS )?chunk [\w-]+ failed|Failed to fetch dynamically imported module|Importing a module script failed/i.test(
      error.message
    )
  );
}

/** Reloads once for a stale-deploy error; returns false if we already tried recently (avoids a reload loop). */
function reloadOnceForStaleDeploy() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (Date.now() - last < 10_000) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // Storage unavailable (private mode etc.) — still worth one reload.
  }
  window.location.reload();
  return true;
}

export function ErrorFallback({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    if (isStaleDeployError(error)) reloadOnceForStaleDeploy();
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="rounded-full bg-destructive/10 p-3 text-destructive">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <p className="text-lg font-medium">Something went wrong</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Reloading the page usually fixes this. If you use your browser&apos;s translate feature, turn it off for this
          site.
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => window.location.reload()}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <RotateCw className="h-4 w-4" />
          Reload page
        </button>
        <button
          onClick={reset}
          className="inline-flex h-10 items-center rounded-md border border-input px-4 text-sm font-medium hover:bg-accent"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
