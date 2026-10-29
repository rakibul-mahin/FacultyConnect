'use client';

import { Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CancelReasonDialog } from '@/components/faculty/cancel-reason-dialog';
import { cancelOccurrenceAction } from '@/app/(faculty-app)/faculty/bookings/actions';

export function CancelOccurrenceButton({ occurrenceId, bookedCount, compact }: { occurrenceId: string; bookedCount: number; compact?: boolean }) {
  return (
    <CancelReasonDialog
      trigger={
        <Button variant={compact ? 'ghost' : 'outline'} size={compact ? 'sm' : 'default'} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
          <Ban className="h-4 w-4" />
          {compact ? 'Cancel slot' : 'Cancel this consultation'}
        </Button>
      }
      title="Cancel this consultation?"
      description={
        bookedCount > 0
          ? 'Every booked student loses their seat. The record stays in your history.'
          : 'No one has booked this slot yet. The record stays in your history.'
      }
      affectedCount={bookedCount}
      confirmLabel={bookedCount > 0 ? 'Cancel & notify' : 'Cancel slot'}
      successMessage="Consultation cancelled."
      onConfirm={(reason) => cancelOccurrenceAction({ occurrenceId, reason: reason || undefined })}
    />
  );
}
