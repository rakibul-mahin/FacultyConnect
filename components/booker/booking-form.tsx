'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { BookOpen, GraduationCap, MessageSquare, UserCog, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { bookingInputSchema, type BookingInput } from '@/lib/validation/booking';
import { createBookingAction } from '@/app/(public-faculty)/faculty/[publicId]/actions';

type BookingType = BookingInput['type'];

const TYPE_OPTIONS: { value: BookingType; label: string; hint: string; icon: typeof BookOpen }[] = [
  { value: 'THESIS_INTERNSHIP_PROJECT', label: 'Thesis / Project', hint: 'Thesis, internship or project group', icon: GraduationCap },
  { value: 'COURSE', label: 'Course', hint: 'A course you are taking', icon: BookOpen },
  { value: 'OTHERS', label: 'Others', hint: 'Anything else', icon: MessageSquare },
];

// Field-level errors across the union's variants; RHF types them per-variant.
type FieldErrors = Partial<Record<'groupId' | 'courseCode' | 'section' | 'reason', { message?: string }>>;

export function BookingForm({
  occurrenceId,
  profileIncomplete,
  onBooked,
  onStale,
}: {
  occurrenceId: string;
  profileIncomplete: boolean;
  onBooked: (result: { position: number; type: BookingType }) => void;
  /** Called when the server rejects the booking, so the slot list can refresh its counts. */
  onStale: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const form = useForm<BookingInput>({
    resolver: zodResolver(bookingInputSchema),
    defaultValues: { occurrenceId, type: 'THESIS_INTERNSHIP_PROJECT' } as BookingInput,
  });
  const type = form.watch('type');
  const errors = form.formState.errors as FieldErrors;

  if (profileIncomplete) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-amber-300/60 bg-amber-50 px-6 py-10 text-center dark:border-amber-900 dark:bg-amber-950/30">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
          <UserCog className="h-6 w-6" />
        </span>
        <p className="mt-4 font-semibold">Complete your profile first</p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Faculty need your student ID to know who is coming. It only takes a moment.
        </p>
        <Button asChild className="mt-5">
          <Link href="/student/profile">Complete profile</Link>
        </Button>
      </div>
    );
  }

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const res = await createBookingAction(values);
      if (!res.ok) {
        toast.error(res.error);
        onStale();
        return;
      }
      onBooked({ position: res.data.position, type: values.type });
    });
  });

  const selectType = (value: BookingType) => {
    form.setValue('type', value);
    form.clearErrors();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <fieldset className="space-y-2.5">
        <legend className="mb-2.5 text-sm font-medium">What is this about?</legend>
        <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
          {TYPE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = type === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => selectType(option.value)}
                className={cn(
                  'relative flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-col sm:gap-2',
                  selected
                    ? 'border-primary bg-accent/60 shadow-sm ring-2 ring-primary/15'
                    : 'border-border hover:border-primary/40 hover:bg-muted/50'
                )}
              >
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                    selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span className="block text-xs text-muted-foreground">{option.hint}</span>
                </span>
                {selected && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </motion.span>
                )}
              </button>
            );
          })}
        </div>
      </fieldset>

      <motion.div
        key={type}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="space-y-4"
      >
        {type === 'THESIS_INTERNSHIP_PROJECT' && (
          <Field label="Group ID" error={errors.groupId?.message}>
            <Input placeholder="e.g. G-14" {...form.register('groupId')} />
          </Field>
        )}
        {type === 'COURSE' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Course code" error={errors.courseCode?.message}>
              <Input placeholder="e.g. CSE110" {...form.register('courseCode')} />
            </Field>
            <Field label="Section" error={errors.section?.message}>
              <Input placeholder="e.g. 13" {...form.register('section')} />
            </Field>
          </div>
        )}
        <Field label={type === 'THESIS_INTERNSHIP_PROJECT' ? 'Notes (optional)' : 'Reason'} error={errors.reason?.message}>
          <Textarea rows={4} placeholder="What would you like to discuss?" {...form.register('reason')} />
        </Field>
      </motion.div>

      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Confirm booking
      </Button>
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
