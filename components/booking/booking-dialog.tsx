'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatDhakaDate } from '@/lib/timezone';
import { TIME_SLOT_LABELS, type TimeSlotValue } from '@/lib/constants';
import { createBookingAction } from '@/app/(public-faculty)/faculty/[publicId]/actions';

const thesisSchema = z.object({ groupId: z.string().min(1, 'Required'), reason: z.string().max(1000).optional() });
const courseSchema = z.object({ courseCode: z.string().min(2, 'Required'), section: z.string().min(1, 'Required'), reason: z.string().min(1, 'Required') });
const othersSchema = z.object({ reason: z.string().min(1, 'Required') });

export function BookingDialog({
  open,
  onOpenChange,
  occurrenceId,
  date,
  startSlot,
  facultyName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  occurrenceId: string;
  date: Date;
  startSlot: string;
  facultyName: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<'THESIS_INTERNSHIP_PROJECT' | 'COURSE' | 'OTHERS'>('THESIS_INTERNSHIP_PROJECT');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Book with {facultyName}</DialogTitle>
          <DialogDescription>
            {formatDhakaDate(date)} · {TIME_SLOT_LABELS[startSlot as TimeSlotValue]}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="THESIS_INTERNSHIP_PROJECT">Thesis</TabsTrigger>
            <TabsTrigger value="COURSE">Course</TabsTrigger>
            <TabsTrigger value="OTHERS">Others</TabsTrigger>
          </TabsList>
          <TabsContent value="THESIS_INTERNSHIP_PROJECT">
            <ThesisForm occurrenceId={occurrenceId} onOpenChange={onOpenChange} onDone={() => router.refresh()} />
          </TabsContent>
          <TabsContent value="COURSE">
            <CourseForm occurrenceId={occurrenceId} onOpenChange={onOpenChange} onDone={() => router.refresh()} />
          </TabsContent>
          <TabsContent value="OTHERS">
            <OthersForm occurrenceId={occurrenceId} onOpenChange={onOpenChange} onDone={() => router.refresh()} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function submitAndReport(
  startTransition: (fn: () => void) => void,
  payload: unknown,
  onOpenChange: (v: boolean) => void,
  onDone: () => void
) {
  startTransition(async () => {
    const res = await createBookingAction(payload);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Booked! You are #${res.data.position} in the queue.`);
    onOpenChange(false);
    onDone();
  });
}

function ThesisForm({ occurrenceId, onOpenChange, onDone }: { occurrenceId: string; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const form = useForm<z.infer<typeof thesisSchema>>({ resolver: zodResolver(thesisSchema) });
  const onSubmit = form.handleSubmit((values) =>
    submitAndReport(startTransition, { occurrenceId, type: 'THESIS_INTERNSHIP_PROJECT', ...values }, onOpenChange, onDone)
  );
  return (
    <form onSubmit={onSubmit} className="space-y-3 pt-2">
      <div className="space-y-1.5">
        <Label>Group ID</Label>
        <Input placeholder="G-14" {...form.register('groupId')} />
        {form.formState.errors.groupId && <p className="text-xs text-destructive">{form.formState.errors.groupId.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>Reason (optional)</Label>
        <Textarea placeholder="What would you like to discuss?" {...form.register('reason')} />
      </div>
      <DialogFooter>
        <Button type="submit" loading={pending}>
          Confirm booking
        </Button>
      </DialogFooter>
    </form>
  );
}

function CourseForm({ occurrenceId, onOpenChange, onDone }: { occurrenceId: string; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const form = useForm<z.infer<typeof courseSchema>>({ resolver: zodResolver(courseSchema) });
  const onSubmit = form.handleSubmit((values) =>
    submitAndReport(startTransition, { occurrenceId, type: 'COURSE', ...values }, onOpenChange, onDone)
  );
  return (
    <form onSubmit={onSubmit} className="space-y-3 pt-2">
      <div className="space-y-1.5">
        <Label>Course code</Label>
        <Input placeholder="CSE110" {...form.register('courseCode')} />
        {form.formState.errors.courseCode && <p className="text-xs text-destructive">{form.formState.errors.courseCode.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>Section</Label>
        <Input placeholder="13" {...form.register('section')} />
        {form.formState.errors.section && <p className="text-xs text-destructive">{form.formState.errors.section.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>Reason</Label>
        <Textarea placeholder="What would you like to discuss?" {...form.register('reason')} />
        {form.formState.errors.reason && <p className="text-xs text-destructive">{form.formState.errors.reason.message}</p>}
      </div>
      <DialogFooter>
        <Button type="submit" loading={pending}>
          Confirm booking
        </Button>
      </DialogFooter>
    </form>
  );
}

function OthersForm({ occurrenceId, onOpenChange, onDone }: { occurrenceId: string; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const form = useForm<z.infer<typeof othersSchema>>({ resolver: zodResolver(othersSchema) });
  const onSubmit = form.handleSubmit((values) =>
    submitAndReport(startTransition, { occurrenceId, type: 'OTHERS', ...values }, onOpenChange, onDone)
  );
  return (
    <form onSubmit={onSubmit} className="space-y-3 pt-2">
      <div className="space-y-1.5">
        <Label>Reason</Label>
        <Textarea placeholder="What would you like to discuss?" {...form.register('reason')} />
        {form.formState.errors.reason && <p className="text-xs text-destructive">{form.formState.errors.reason.message}</p>}
      </div>
      <DialogFooter>
        <Button type="submit" loading={pending}>
          Confirm booking
        </Button>
      </DialogFooter>
    </form>
  );
}
