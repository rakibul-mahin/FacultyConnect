'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { markAttendanceAction } from '@/app/(faculty-app)/faculty/bookings/actions';

export function AttendanceControl({ bookingId, current }: { bookingId: string; current: 'PRESENT' | 'ABSENT' | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingStatus, setPendingStatus] = useState<'PRESENT' | 'ABSENT' | null>(null);

  const mark = (status: 'PRESENT' | 'ABSENT') => {
    setPendingStatus(status);
    startTransition(async () => {
      const res = await markAttendanceAction({ bookingId, status });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex gap-1.5">
      <Button
        size="sm"
        variant={current === 'PRESENT' ? 'default' : 'outline'}
        className={cn(current === 'PRESENT' && 'bg-success text-success-foreground hover:bg-success/90')}
        loading={pending && pendingStatus === 'PRESENT'}
        disabled={pending}
        onClick={() => mark('PRESENT')}
      >
        <Check className="h-3.5 w-3.5" />
        Present
      </Button>
      <Button
        size="sm"
        variant={current === 'ABSENT' ? 'destructive' : 'outline'}
        loading={pending && pendingStatus === 'ABSENT'}
        disabled={pending}
        onClick={() => mark('ABSENT')}
      >
        <X className="h-3.5 w-3.5" />
        Absent
      </Button>
    </div>
  );
}
