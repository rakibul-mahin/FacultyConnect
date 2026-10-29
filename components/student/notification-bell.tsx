'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { format } from 'date-fns-tz';
import { Ban, Bell, BellOff, CalendarPlus, CheckCheck, UserMinus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { TIME_SLOT_LABELS, type TimeSlotValue } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { markNotificationsReadAction } from '@/app/(student-app)/student/actions';

export interface StudentNotification {
  id: string;
  type: 'OCCURRENCE_CANCELLED' | 'BOOKING_REMOVED';
  facultyName: string;
  facultyPublicId: string;
  date: Date;
  startSlot: string;
  reason: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export function notificationTitle(n: StudentNotification) {
  return n.type === 'BOOKING_REMOVED'
    ? `${n.facultyName} removed you from a consultation`
    : `${n.facultyName} cancelled your consultation`;
}

export function notificationWhen(n: StudentNotification) {
  return `${format(n.date, 'EEE, d MMM', { timeZone: 'UTC' })} · ${TIME_SLOT_LABELS[n.startSlot as TimeSlotValue]}`;
}

export function useMarkRead() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const mark = (ids?: string[]) =>
    startTransition(async () => {
      const res = await markNotificationsReadAction({ ids });
      if (res.ok) router.refresh();
    });
  return { mark, pending };
}

export function NotificationBell({ items, unread }: { items: StudentNotification[]; unread: number }) {
  const { mark, pending } = useMarkRead();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}>
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground ring-2 ring-card">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" collisionPadding={12} className="w-[calc(100vw-1.5rem)] max-w-sm p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="font-semibold">Notifications</p>
            <p className="text-xs text-muted-foreground">{unread ? `${unread} unread` : 'All caught up'}</p>
          </div>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={() => mark()} disabled={pending} className="text-primary">
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <BellOff className="h-6 w-6 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">No notifications yet</p>
            <p className="text-xs text-muted-foreground">You&apos;ll hear here if a faculty member cancels a booking.</p>
          </div>
        ) : (
          <ul className="max-h-[420px] divide-y divide-border overflow-y-auto">
            {items.map((n) => {
              const Icon = n.type === 'BOOKING_REMOVED' ? UserMinus : Ban;
              const isUnread = !n.readAt;
              return (
                <li key={n.id} className={cn('relative flex gap-3 px-4 py-3.5', isUnread && 'bg-accent/30')} onClick={() => isUnread && mark([n.id])}>
                  {isUnread && <span className="absolute left-1.5 top-5 h-1.5 w-1.5 rounded-full bg-primary" aria-label="Unread" />}
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm leading-snug', isUnread ? 'font-semibold' : 'font-medium')}>{notificationTitle(n)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{notificationWhen(n)}</p>
                    {n.reason && (
                      <p className="mt-1.5 rounded-md bg-muted/70 px-2.5 py-1.5 text-xs text-foreground/85">&ldquo;{n.reason}&rdquo;</p>
                    )}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-muted-foreground">{formatDistanceToNow(n.createdAt, { addSuffix: true })}</span>
                      <Link
                        href={`/faculty/${n.facultyPublicId}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        <CalendarPlus className="h-3 w-3" />
                        Book another slot
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {items.length > 0 && (
          <Link href="/student/bookings?tab=cancelled" className="block border-t border-border px-4 py-2.5 text-center text-xs font-medium text-primary hover:bg-muted/50">
            See cancelled bookings
          </Link>
        )}
      </PopoverContent>
    </Popover>
  );
}
