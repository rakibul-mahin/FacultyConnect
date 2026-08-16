'use client';

import { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { TIME_SLOT_LABELS, WEEKDAY_LABELS, LAB_VALID_START_SLOTS, type TimeSlotValue, type WeekdayValue } from '@/lib/constants';
import { saveRoutineEntry } from '@/app/(faculty-app)/faculty/routine/actions';
import type { RoutineCellData } from '@/components/routine/routine-editor';

type EntryType = 'EMPTY' | 'THEORY' | 'LAB' | 'CONSULTATION';

const theorySchema = z.object({
  courseCode: z.string().min(2, 'Required'),
  section: z.string().min(1, 'Required'),
  roomNumber: z.string().min(1, 'Required'),
});
const labSchema = z.object({
  courseCode: z.string().min(2, 'Required'),
  section: z.string().min(1, 'Required'),
  coFaculty: z.string().min(1, 'Required'),
  roomNumber: z.string().min(1, 'Required'),
});
const consultationSchema = z.object({
  capacity: z.coerce.number().int().positive('Must be positive'),
});

export function EntryEditorDialog({
  open,
  onOpenChange,
  day,
  startSlot,
  existing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  day: WeekdayValue;
  startSlot: TimeSlotValue;
  existing: RoutineCellData | null;
  onSaved: () => void;
}) {
  const [type, setType] = useState<EntryType>(existing?.type ?? 'EMPTY');
  const isLabStart = LAB_VALID_START_SLOTS.includes(startSlot);

  useEffect(() => {
    if (open) setType(existing?.type ?? 'EMPTY');
  }, [open, existing]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {WEEKDAY_LABELS[day]} · {TIME_SLOT_LABELS[startSlot]}
          </DialogTitle>
          <DialogDescription>Choose what goes in this slot.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <RadioGroup value={type} onValueChange={(v) => setType(v as EntryType)} className="grid grid-cols-2 gap-2">
            {(['EMPTY', 'THEORY', 'LAB', 'CONSULTATION'] as const).map((t) => (
              <Label
                key={t}
                htmlFor={`type-${t}`}
                className={`flex min-w-0 cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm ${
                  type === t ? 'border-primary bg-accent' : 'border-input'
                } ${t === 'LAB' && !isLabStart ? 'opacity-40' : ''}`}
              >
                <RadioGroupItem value={t} id={`type-${t}`} disabled={t === 'LAB' && !isLabStart} className="shrink-0" />
                <span className="truncate">{t === 'EMPTY' ? 'Clear' : t.charAt(0) + t.slice(1).toLowerCase()}</span>
              </Label>
            ))}
          </RadioGroup>

          {type === 'LAB' && !isLabStart && (
            <p className="text-xs text-destructive">
              Labs can only start at 8:00 AM, 11:00 AM, or 2:00 PM. Choose one of those slots to start a lab.
            </p>
          )}

          {type === 'EMPTY' && <ClearForm day={day} startSlot={startSlot} onOpenChange={onOpenChange} onSaved={onSaved} />}
          {type === 'THEORY' && (
            <TheoryForm day={day} startSlot={startSlot} existing={existing} onOpenChange={onOpenChange} onSaved={onSaved} />
          )}
          {type === 'LAB' && isLabStart && (
            <LabForm day={day} startSlot={startSlot} existing={existing} onOpenChange={onOpenChange} onSaved={onSaved} />
          )}
          {type === 'CONSULTATION' && (
            <ConsultationForm day={day} startSlot={startSlot} existing={existing} onOpenChange={onOpenChange} onSaved={onSaved} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ClearForm({
  day,
  startSlot,
  onOpenChange,
  onSaved,
}: {
  day: WeekdayValue;
  startSlot: TimeSlotValue;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const submit = () => {
    startTransition(async () => {
      const res = await saveRoutineEntry({ day, startSlot, type: 'EMPTY' });
      if (res.ok) {
        toast.success('Slot cleared.');
        onOpenChange(false);
        onSaved();
      } else {
        toast.error(res.error);
      }
    });
  };
  return (
    <DialogFooter>
      <Button onClick={submit} loading={pending} variant="destructive">
        Clear this slot
      </Button>
    </DialogFooter>
  );
}

function TheoryForm({
  day,
  startSlot,
  existing,
  onOpenChange,
  onSaved,
}: {
  day: WeekdayValue;
  startSlot: TimeSlotValue;
  existing: RoutineCellData | null;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const form = useForm<z.infer<typeof theorySchema>>({
    resolver: zodResolver(theorySchema),
    defaultValues: {
      courseCode: existing?.type === 'THEORY' ? existing.courseCode ?? '' : '',
      section: existing?.type === 'THEORY' ? existing.section ?? '' : '',
      roomNumber: existing?.type === 'THEORY' ? existing.roomNumber ?? '' : '',
    },
  });
  const [pending, startTransition] = useTransition();

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const res = await saveRoutineEntry({ day, startSlot, type: 'THEORY', ...values });
      if (res.ok) {
        toast.success('Theory class saved.');
        onOpenChange(false);
        onSaved();
      } else {
        toast.error(res.error);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label="Course code" error={form.formState.errors.courseCode?.message}>
        <Input placeholder="CSE110" {...form.register('courseCode')} />
      </Field>
      <Field label="Section" error={form.formState.errors.section?.message}>
        <Input placeholder="13" {...form.register('section')} />
      </Field>
      <Field label="Room number" error={form.formState.errors.roomNumber?.message}>
        <Input placeholder="09H-35C" {...form.register('roomNumber')} />
      </Field>
      <DialogFooter>
        <Button type="submit" loading={pending}>
          Save theory class
        </Button>
      </DialogFooter>
    </form>
  );
}

function LabForm({
  day,
  startSlot,
  existing,
  onOpenChange,
  onSaved,
}: {
  day: WeekdayValue;
  startSlot: TimeSlotValue;
  existing: RoutineCellData | null;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const form = useForm<z.infer<typeof labSchema>>({
    resolver: zodResolver(labSchema),
    defaultValues: {
      courseCode: existing?.type === 'LAB' ? existing.courseCode ?? '' : '',
      section: existing?.type === 'LAB' ? existing.section ?? '' : '',
      coFaculty: existing?.type === 'LAB' ? existing.coFaculty ?? '' : '',
      roomNumber: existing?.type === 'LAB' ? existing.roomNumber ?? '' : '',
    },
  });
  const [pending, startTransition] = useTransition();

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const res = await saveRoutineEntry({ day, startSlot, type: 'LAB', ...values });
      if (res.ok) {
        toast.success('Lab saved — the next slot was automatically reserved.');
        onOpenChange(false);
        onSaved();
      } else {
        toast.error(res.error);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
        Labs run 2h40m — the next slot will be reserved automatically for this lab.
      </p>
      <Field label="Course code" error={form.formState.errors.courseCode?.message}>
        <Input placeholder="CSE427" {...form.register('courseCode')} />
      </Field>
      <Field label="Section" error={form.formState.errors.section?.message}>
        <Input placeholder="03" {...form.register('section')} />
      </Field>
      <Field label="Co-faculty initial" error={form.formState.errors.coFaculty?.message}>
        <Input placeholder="ITSSC, RKBM" {...form.register('coFaculty')} />
      </Field>
      <Field label="Room number" error={form.formState.errors.roomNumber?.message}>
        <Input placeholder="09F-27L" {...form.register('roomNumber')} />
      </Field>
      <DialogFooter>
        <Button type="submit" loading={pending}>
          Save lab
        </Button>
      </DialogFooter>
    </form>
  );
}

function ConsultationForm({
  day,
  startSlot,
  existing,
  onOpenChange,
  onSaved,
}: {
  day: WeekdayValue;
  startSlot: TimeSlotValue;
  existing: RoutineCellData | null;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const form = useForm<z.infer<typeof consultationSchema>>({
    resolver: zodResolver(consultationSchema),
    defaultValues: { capacity: existing?.type === 'CONSULTATION' ? existing.capacity ?? 10 : 10 },
  });
  const [pending, startTransition] = useTransition();

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const res = await saveRoutineEntry({ day, startSlot, type: 'CONSULTATION', ...values });
      if (res.ok) {
        toast.success('Consultation slot saved.');
        onOpenChange(false);
        onSaved();
      } else {
        toast.error(res.error);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label="Capacity" error={form.formState.errors.capacity?.message}>
        <Input type="number" min={1} {...form.register('capacity')} />
      </Field>
      <DialogFooter>
        <Button type="submit" loading={pending}>
          Save consultation
        </Button>
      </DialogFooter>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
