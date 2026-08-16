'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Ban, Loader2 } from 'lucide-react';
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
import { cancelOccurrenceAction } from '@/app/(faculty-app)/faculty/bookings/actions';

export function CancelOccurrenceButton({ occurrenceId, bookedCount }: { occurrenceId: string; bookedCount: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const confirm = () => {
    startTransition(async () => {
      const res = await cancelOccurrenceAction({ occurrenceId });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success('Consultation cancelled.');
      router.refresh();
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="text-destructive hover:text-destructive">
          <Ban className="h-4 w-4" />
          Cancel this consultation
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this consultation?</AlertDialogTitle>
          <AlertDialogDescription>
            {bookedCount > 0
              ? `This consultation has ${bookedCount} student${bookedCount === 1 ? '' : 's'} booked. Cancelling it will cancel the consultation for all booked students.`
              : 'This consultation has no bookings yet.'}{' '}
            This cannot be undone, but the record is kept in your history.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction onClick={confirm} disabled={pending} aria-busy={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Cancel consultation
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
