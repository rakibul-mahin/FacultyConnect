'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AlertTriangle, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ActionResult } from '@/app/(faculty-app)/faculty/routine/actions';

const QUICK_REASONS = ['Meeting', 'Unwell', 'Emergency', 'Other'] as const;

/**
 * One confirmation dialog for every faculty-side cancellation (a student, a
 * slot, a whole day). A reason is required whenever students are affected —
 * the server enforces the same rule.
 */
export function CancelReasonDialog({
  trigger,
  open,
  onOpenChange,
  title,
  description,
  affectedCount,
  confirmLabel,
  successMessage,
  onConfirm,
}: {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description: string;
  /** Students who will lose their seat. */
  affectedCount: number;
  confirmLabel: string;
  successMessage: string;
  onConfirm: (reason: string) => Promise<ActionResult<unknown>>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [innerOpen, setInnerOpen] = useState(false);
  const [quick, setQuick] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [showError, setShowError] = useState(false);

  const isOpen = open ?? innerOpen;
  const setOpen = (next: boolean) => {
    if (!next) {
      setQuick(null);
      setNote('');
      setShowError(false);
    }
    (onOpenChange ?? setInnerOpen)(next);
  };

  const reason = [quick && quick !== 'Other' ? quick : null, note.trim() || null].filter(Boolean).join(': ');
  const needsReason = affectedCount > 0;
  const missing = needsReason && !reason;

  const submit = () => {
    if (missing) {
      setShowError(true);
      return;
    }
    startTransition(async () => {
      const res = await onConfirm(reason);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(successMessage);
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <span className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {needsReason && (
          <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>
              <span className="font-semibold">{affectedCount}</span> student{affectedCount === 1 ? '' : 's'} will see this reason.
            </span>
          </div>
        )}

        <div className="space-y-3">
          <Label>Reason{needsReason ? '' : ' (optional)'}</Label>
          <div className="flex flex-wrap gap-2">
            {QUICK_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setQuick(quick === r ? null : r);
                  setShowError(false);
                }}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all',
                  quick === r ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'border-border hover:border-primary/50 hover:bg-muted'
                )}
              >
                {r}
              </button>
            ))}
          </div>
          <Textarea
            rows={3}
            value={note}
            maxLength={400}
            onChange={(e) => {
              setNote(e.target.value);
              setShowError(false);
            }}
            placeholder={quick === 'Other' ? 'Tell students what happened…' : 'Optional note to students…'}
          />
          {showError && <p className="text-xs text-destructive">Pick a reason or write a short note for the students.</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Keep it
          </Button>
          <Button variant="destructive" onClick={submit} loading={pending}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
