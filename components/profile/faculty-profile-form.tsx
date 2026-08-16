'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { facultyProfileSchema, type FacultyProfileInput } from '@/lib/validation/profile';
import { updateFacultyProfileAction } from '@/app/(faculty-app)/faculty/profile/actions';

export function FacultyProfileForm({ initial, seat }: { initial: string; seat: string }) {
  const [pending, startTransition] = useTransition();
  const form = useForm<FacultyProfileInput>({
    resolver: zodResolver(facultyProfileSchema),
    defaultValues: { initial, seat },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const res = await updateFacultyProfileAction(values);
      if (res.ok) toast.success('Profile updated.');
      else toast.error(res.error);
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="initial">Initial</Label>
        <Input id="initial" placeholder="RKBM" {...form.register('initial')} />
        {form.formState.errors.initial && <p className="text-xs text-destructive">{form.formState.errors.initial.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="seat">Seat number</Label>
        <Input id="seat" placeholder="4M128" {...form.register('seat')} />
        {form.formState.errors.seat && <p className="text-xs text-destructive">{form.formState.errors.seat.message}</p>}
      </div>
      <Button type="submit" loading={pending}>
        Save changes
      </Button>
    </form>
  );
}
