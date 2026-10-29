'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { CalendarDays, MapPin, Tag, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function BookingSuccess({
  position,
  facultyName,
  when,
  seat,
  topic,
  onBookAnother,
}: {
  position: number;
  facultyName: string;
  when: string;
  seat: string;
  topic: string;
  onBookAnother: () => void;
}) {
  return (
    <div className="flex flex-col items-center py-4 text-center">
      <div className="relative">
        <motion.span
          className="absolute inset-0 rounded-full bg-success/20"
          initial={{ scale: 0.6, opacity: 0.8 }}
          animate={{ scale: 1.9, opacity: 0 }}
          transition={{ duration: 1.1, ease: 'easeOut', delay: 0.25 }}
        />
        <motion.svg
          viewBox="0 0 52 52"
          className="relative h-16 w-16 text-success"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          aria-hidden
        >
          <circle cx="26" cy="26" r="25" className="fill-success/10" />
          <motion.circle
            cx="26"
            cy="26"
            r="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
          <motion.path
            d="M15 27 l7 7 l15 -16"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.4 }}
          />
        </motion.svg>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className="mt-5"
      >
        <h3 className="text-xl font-semibold tracking-tight">You&apos;re booked!</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          You are <span className="font-semibold text-foreground">#{position}</span> in the queue.
        </p>
      </motion.div>

      <motion.dl
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.62, duration: 0.3 }}
        className="mt-6 w-full max-w-sm divide-y divide-border rounded-xl border border-border text-left text-sm"
      >
        <SummaryRow icon={User} label="Faculty" value={facultyName} />
        <SummaryRow icon={CalendarDays} label="When" value={when} />
        <SummaryRow icon={MapPin} label="Where" value={seat ? `Seat ${seat}` : '—'} />
        <SummaryRow icon={Tag} label="Topic" value={topic} />
      </motion.dl>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.75 }}
        className="mt-6 flex w-full max-w-sm flex-col gap-2 sm:flex-row"
      >
        <Button asChild className="flex-1">
          <Link href="/student/bookings">View my bookings</Link>
        </Button>
        <Button variant="outline" className="flex-1" onClick={onBookAnother}>
          Book another slot
        </Button>
      </motion.div>
    </div>
  );
}

function SummaryRow({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <dt className="w-16 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate font-medium">{value}</dd>
    </div>
  );
}
