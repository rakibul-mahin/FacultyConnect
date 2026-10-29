import Link from 'next/link';
import { format } from 'date-fns-tz';
import { ArrowRight, CalendarClock, Clock, MapPin, Search, Sparkles } from 'lucide-react';
import { TIME_SLOT_LABELS, type TimeSlotValue } from '@/lib/constants';
import { BOOKING_TYPE_STYLES } from '@/lib/booking/type-style';
import { initialsOf } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { relativeDay, type StudentBookingRow } from '@/components/student/booking-card';

export function NextUp({ booking: b, position }: { booking: StudentBookingRow; position?: number }) {
  const type = BOOKING_TYPE_STYLES[b.type];
  const when = relativeDay(b.occurrence.date);
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 via-sky-700 to-indigo-700 p-6 text-white shadow-lg shadow-sky-900/20 sm:p-8">
      <HeroDecor />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            Next consultation{when ? ` · ${when}` : ''}
          </span>
          <div className="mt-5 flex items-center gap-3">
            <Avatar className="h-12 w-12 ring-2 ring-white/30">
              <AvatarFallback className="bg-white/20 text-white">{initialsOf(b.occurrence.faculty.fullName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-xl font-semibold sm:text-2xl">{b.occurrence.faculty.fullName}</p>
              <p className="text-sm text-white/75">{type.short}{b.type === 'COURSE' ? ` · ${b.courseCode}-${b.section}` : ''}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 text-sm">
            <HeroChip icon={CalendarClock}>{format(b.occurrence.date, 'EEEE, d MMMM', { timeZone: 'UTC' })}</HeroChip>
            <HeroChip icon={Clock}>{TIME_SLOT_LABELS[b.occurrence.startSlot as TimeSlotValue]}</HeroChip>
            <HeroChip icon={MapPin}>Seat {b.occurrence.faculty.seat || '—'}</HeroChip>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
          {position && (
            <div className="text-left sm:text-right">
              <p className="text-xs font-medium uppercase tracking-wider text-white/70">Queue</p>
              <p className="text-4xl font-bold tabular-nums">#{position}</p>
            </div>
          )}
          <Button asChild variant="secondary" className="bg-white text-sky-800 hover:bg-white/90">
            <Link href="/student/bookings">
              View booking
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function NoUpcomingHero() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 via-sky-700 to-indigo-700 p-6 text-white shadow-lg shadow-sky-900/20 sm:p-8">
      <HeroDecor />
      <div className="relative max-w-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
          <Sparkles className="h-3.5 w-3.5" />
          Nothing booked yet
        </span>
        <p className="mt-4 text-2xl font-semibold">Need help with a course or your thesis?</p>
        <p className="mt-1 text-sm text-white/75">Find your faculty member and book a consultation slot in the next 7 days.</p>
        <Button asChild variant="secondary" className="mt-5 bg-white text-sky-800 hover:bg-white/90">
          <Link href="/student/search">
            <Search className="h-4 w-4" />
            Find a faculty member
          </Link>
        </Button>
      </div>
    </div>
  );
}

/** Soft glow blobs + a faint dot grid behind the hero content. */
function HeroDecor() {
  return (
    <>
      <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-indigo-400/30 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '18px 18px' }}
      />
    </>
  );
}

function HeroChip({ icon: Icon, children }: { icon: typeof Clock; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 backdrop-blur">
      <Icon className="h-4 w-4 text-white/80" />
      {children}
    </span>
  );
}
