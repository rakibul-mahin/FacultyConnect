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
import { cancelDayAction } from '@/app/(faculty-app)/faculty/bookings/actions';

export function CancelDayButton({ date, slotCount }: { facultyId: string; date: string; slotCount: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (slotCount === 0) return null;

  const confirm = () => {
    startTransition(async () => {
      const res = await cancelDayAction({ date });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Cancelled ${res.data.cancelledCount} consultation slot(s) for the day.`);
      router.refresh();
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-muted-foreground">
          <Ban className="h-3.5 w-3.5" />
          Cancel day
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel all consultations on this day?</AlertDialogTitle>
          <AlertDialogDescription>
            This cancels every open consultation slot on this date. Any students who booked will lose their slot. This
            cannot be undone, but the record is kept in your history.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep slots</AlertDialogCancel>
          <AlertDialogAction onClick={confirm} disabled={pending} aria-busy={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Cancel all
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
