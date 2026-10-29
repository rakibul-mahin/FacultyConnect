'use client';

import { Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CancelReasonDialog } from '@/components/faculty/cancel-reason-dialog';
import { cancelDayAction } from '@/app/(faculty-app)/faculty/bookings/actions';

export function CancelDayButton({ date, slotCount, bookedCount }: { date: string; slotCount: number; bookedCount: number }) {
  if (slotCount === 0) return null;

  return (
    <CancelReasonDialog
      trigger={
        <Button size="sm" variant="ghost" className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
          <Ban className="h-3.5 w-3.5" />
          Cancel day
        </Button>
      }
      title="Cancel all consultations on this day?"
      description={`This cancels ${slotCount} open slot${slotCount === 1 ? '' : 's'} on this date. The records stay in your history.`}
      affectedCount={bookedCount}
      confirmLabel={bookedCount > 0 ? 'Cancel day & notify' : 'Cancel day'}
      successMessage="Day cancelled."
      onConfirm={(reason) => cancelDayAction({ date, reason: reason || undefined })}
    />
  );
}
