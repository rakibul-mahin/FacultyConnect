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
import { CalendarClock, Eraser, Info, Minus, Plus } from 'lucide-react';
import { ENTRY_STYLES } from '@/lib/routine/entry-style';
import { cn } from '@/lib/utils';
import {
  TIME_SLOT_LABELS,
  WEEKDAY_LABELS,
  LAB_VALID_START_SLOTS,
  THEORY_PAIRED_DAY,
  type TimeSlotValue,
  type WeekdayValue,
} from '@/lib/constants';
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <span className="mb-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" />
            {WEEKDAY_LABELS[day]} · {TIME_SLOT_LABELS[startSlot]}
          </span>
          <DialogTitle>{existing ? 'Edit this slot' : 'Add to this slot'}</DialogTitle>
          <DialogDescription>Choose what happens here every week.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Slot type">
            {TYPE_OPTIONS.map(({ value, label, icon: Icon }) => {
              const disabled = value === 'LAB' && !isLabStart;
              const active = type === value;
              const style = value === 'EMPTY' ? null : ENTRY_STYLES[value];
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={disabled}
                  title={disabled ? 'Labs can only start at 8:00 AM, 11:00 AM or 2:00 PM' : undefined}
                  onClick={() => setType(value)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    active
                      ? style
                        ? cn(style.bg, style.border, style.text, 'shadow-sm ring-2 ring-primary/10')
                        : 'border-destructive/40 bg-destructive/5 text-destructive shadow-sm'
                      : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/60',
                    disabled && 'cursor-not-allowed opacity-40 hover:border-border hover:bg-transparent'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg',
                      active ? 'bg-background/70' : 'bg-muted'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  {label}
                </button>
              );
            })}
          </div>

          {!isLabStart && (
            <p className="text-xs text-muted-foreground">Labs can only start at 8:00 AM, 11:00 AM or 2:00 PM.</p>
          )}

          {type === 'EMPTY' && (
            <ClearForm day={day} startSlot={startSlot} existing={existing} onOpenChange={onOpenChange} onSaved={onSaved} />
          )}
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

const TYPE_OPTIONS: { value: EntryType; label: string; icon: typeof Eraser }[] = [
  { value: 'THEORY', label: 'Theory', icon: ENTRY_STYLES.THEORY.icon },
  { value: 'LAB', label: 'Lab', icon: ENTRY_STYLES.LAB.icon },
  { value: 'CONSULTATION', label: 'Consult', icon: ENTRY_STYLES.CONSULTATION.icon },
  { value: 'EMPTY', label: 'Clear', icon: Eraser },
];

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-lg bg-muted/70 px-3 py-2.5 text-xs text-muted-foreground">
      <Info className="mt-px h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

function ClearForm({
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
  const partnerDay = existing?.type === 'THEORY' ? THEORY_PAIRED_DAY[day] : undefined;
  return (
    <div className="space-y-3">
      {partnerDay && (
        <Note>
          If {WEEKDAY_LABELS[partnerDay]} {TIME_SLOT_LABELS[startSlot]} has the same theory class, it will be cleared too.
        </Note>
      )}
      <DialogFooter>
        <Button onClick={submit} loading={pending} variant="destructive">
          Clear this slot
        </Button>
      </DialogFooter>
    </div>
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
  const partnerDay = THEORY_PAIRED_DAY[day];

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const res = await saveRoutineEntry({ day, startSlot, type: 'THEORY', ...values });
      if (res.ok) {
        toast.success(
          partnerDay
            ? `Theory class saved on ${WEEKDAY_LABELS[day]} and ${WEEKDAY_LABELS[partnerDay]}.`
            : 'Theory class saved.'
        );
        onOpenChange(false);
        onSaved();
      } else {
        toast.error(res.error);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {partnerDay && (
        <Note>
          This class will also be saved on {WEEKDAY_LABELS[partnerDay]} at {TIME_SLOT_LABELS[startSlot]}.
        </Note>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Course code" error={form.formState.errors.courseCode?.message}>
          <Input placeholder="CSE110" {...form.register('courseCode')} />
        </Field>
        <Field label="Section" error={form.formState.errors.section?.message}>
          <Input placeholder="13" {...form.register('section')} />
        </Field>
      </div>
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
      <Note>Labs run 2h40m, so the next slot is reserved automatically for this lab.</Note>
      <div className="grid grid-cols-2 gap-3">
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
      </div>
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
  const step = (delta: number) => {
    const current = Number(form.getValues('capacity')) || 0;
    form.setValue('capacity', Math.min(500, Math.max(1, current + delta)), { shouldValidate: true });
  };

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
      <Field label="Seats (students per slot)" error={form.formState.errors.capacity?.message}>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon" aria-label="Fewer seats" onClick={() => step(-1)}>
            <Minus className="h-4 w-4" />
          </Button>
          <Input type="number" min={1} className="w-24 text-center text-base font-semibold tabular-nums" {...form.register('capacity')} />
          <Button type="button" variant="outline" size="icon" aria-label="More seats" onClick={() => step(1)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
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
