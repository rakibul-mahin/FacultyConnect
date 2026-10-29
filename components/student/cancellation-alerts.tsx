'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { Ban, CalendarPlus, UserMinus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notificationTitle, notificationWhen, useMarkRead, type StudentNotification } from '@/components/student/notification-bell';

/** Unread faculty cancellations, pinned to the top of the student dashboard until dismissed. */
export function CancellationAlerts({ items }: { items: StudentNotification[] }) {
  const { mark, pending } = useMarkRead();
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      {items.map((n, i) => {
        const Icon = n.type === 'BOOKING_REMOVED' ? UserMinus : Ban;
        return (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.05 }}
            role="alert"
            className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:p-5"
          >
            <span className="absolute inset-y-0 left-0 w-1 bg-destructive" aria-hidden />
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{notificationTitle(n)}</p>
              <p className="text-sm text-muted-foreground">{notificationWhen(n)}</p>
              {n.reason && (
                <p className="mt-1.5 text-sm">
                  <span className="font-medium text-destructive">Reason: </span>
                  {n.reason}
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <Button asChild size="sm">
                <Link href={`/faculty/${n.facultyPublicId}`} onClick={() => mark([n.id])}>
                  <CalendarPlus className="h-4 w-4" />
                  Book another slot
                </Link>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => mark([n.id])} disabled={pending} aria-label="Dismiss">
                <X className="h-4 w-4" />
                <span className="sm:hidden">Dismiss</span>
              </Button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
