'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Download, RefreshCw, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { regenerateQrAction } from '@/app/(faculty-app)/faculty/qr/actions';

export function QrPanel({ dataUrl, url }: { dataUrl: string; url: string }) {
  const [pending, startTransition] = useTransition();

  const regenerate = () => {
    startTransition(async () => {
      const res = await regenerateQrAction();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      // Re-fetch a fresh data URL for the new token client-side via the QR API isn't needed —
      // simplest: reload the page data by requesting the server component again.
      window.location.reload();
    });
  };

  return (
    <Card className="max-w-md">
      <CardContent className="flex flex-col items-center gap-5 pt-6">
        <div className="rounded-xl border border-border bg-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUrl} alt="Faculty QR code" className="h-56 w-56" />
        </div>
        <p className="break-all text-center text-xs text-muted-foreground">{url}</p>
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <Button asChild variant="outline" className="flex-1">
            <a href={dataUrl} download="faculty-consultation-qr.png">
              <Download className="h-4 w-4" />
              Download
            </a>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="flex-1 text-destructive hover:text-destructive" loading={pending}>
                <RefreshCw className="h-4 w-4" />
                Regenerate
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Regenerate QR code?</AlertDialogTitle>
                <AlertDialogDescription>
                  This creates a new QR code and permanently invalidates the old one. Any printed or saved copies of the
                  current QR code will stop working.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={regenerate} disabled={pending} aria-busy={pending}>
                  {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  Regenerate
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
