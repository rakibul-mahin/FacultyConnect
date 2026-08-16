'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { studentProfileSchema, type StudentProfileInput } from '@/lib/validation/profile';
import { updateStudentProfileAction } from '@/app/(student-app)/student/profile/actions';

export function StudentProfileForm({ studentId }: { studentId: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<StudentProfileInput>({
    resolver: zodResolver(studentProfileSchema),
    defaultValues: { studentId: studentId ?? '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const res = await updateStudentProfileAction(values);
      if (res.ok) {
        toast.success('Profile updated.');
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="studentId">Student ID</Label>
        <Input id="studentId" placeholder="20201234" {...form.register('studentId')} />
        {form.formState.errors.studentId && <p className="text-xs text-destructive">{form.formState.errors.studentId.message}</p>}
      </div>
      <Button type="submit" loading={pending}>
        Save
      </Button>
    </form>
  );
}
