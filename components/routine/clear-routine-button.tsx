'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Trash2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
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
import { clearRoutineAction } from '@/app/(faculty-app)/faculty/routine/actions';

export function ClearRoutineButton({ entryCount }: { entryCount: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (entryCount === 0) return null;

  const confirm = () => {
    startTransition(async () => {
      const res = await clearRoutineAction();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success('Routine cleared. You can now enter your new schedule.');
      router.refresh();
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
          Clear routine
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear your entire routine?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes every theory, lab, and consultation slot from your weekly routine. Consultation slots are
            deleted together with their student bookings and attendance records. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep routine</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirm}
            disabled={pending}
            aria-busy={pending}
            className={buttonVariants({ variant: 'destructive' })}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Clear everything
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
