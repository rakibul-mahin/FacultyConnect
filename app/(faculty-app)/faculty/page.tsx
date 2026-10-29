import Link from 'next/link';
import { notFound } from 'next/navigation';
import { addDays } from 'date-fns';
import { format } from 'date-fns-tz';
import { getFacultyProfileById, requireFacultyPage } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { readWithOccurrences, BOOKING_WINDOW_DAYS } from '@/lib/booking/occurrences';
import { getFacultySlots, getFacultyAttendanceStats } from '@/lib/booking/queries';
import { dhakaNow, dhakaToday, dhakaTomorrow, dhakaWeekdayOf, formatDhakaDate } from '@/lib/timezone';
import { TIME_SLOTS, TIME_SLOT_24H, TIME_SLOT_LABELS, type TimeSlotValue } from '@/lib/constants';
import { BOOKING_TYPE_STYLES } from '@/lib/booking/type-style';
import { entryStyleFor } from '@/lib/routine/entry-style';
import { cn, initialsOf } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  ArrowRight,
  CalendarCheck2,
  CalendarRange,
  Coffee,
  History,
  QrCode,
  Upload,
  UserCog,
  Users,
  UserCheck,
  CalendarClock,
  Clock,
} from 'lucide-react';
import { FadeIn } from '@/components/motion/fade-in';
import { StaggerList, StaggerItem } from '@/components/motion/stagger-list';
import { RoutineBlock } from '@/components/routine/routine-block';
import { DateTile } from '@/components/student/booking-card';
import type { FacultySlot } from '@/components/faculty/types';

const confirmedOf = (slot: FacultySlot) => slot.bookings.filter((b) => b.status === 'CONFIRMED');

function toMinutes(slot: TimeSlotValue) {
  const [h, m] = TIME_SLOT_24H[slot].split(':').map(Number);
  return h! * 60 + m!;
}

/**
 * How long a routine block runs: labs are 2h40m (§17); other slots run 1h20m
 * or until the next official slot begins, whichever is sooner.
 */
function blockMinutes(slot: TimeSlotValue, isLab: boolean) {
  if (isLab) return 160;
  const next = TIME_SLOTS[TIME_SLOTS.indexOf(slot) + 1];
  return next ? Math.min(80, toMinutes(next) - toMinutes(slot)) : 80;
}

function greeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default async function FacultyDashboardPage() {
  const session = await requireFacultyPage();
  const facultyId = session.user.facultyProfileId!;

  const today = dhakaToday();
  const now = dhakaNow();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todayWeekday = dhakaWeekdayOf(today);

  // Everything runs in one parallel round: the routine query is shared with
  // the occurrence check, which starts on it while it is still in flight.
  // Today's slots were created on earlier days; only the coming week can
  // gain new rows, so only that read goes through readWithOccurrences.
  const entriesQuery = prisma.routineEntry.findMany({ where: { facultyId }, orderBy: [{ day: 'asc' }, { startSlot: 'asc' }] });
  const [profile, weekEntries, stats, todaySlots, weekSlots] = await Promise.all([
    getFacultyProfileById(facultyId),
    entriesQuery,
    getFacultyAttendanceStats(facultyId),
    getFacultySlots(facultyId, today, today),
    readWithOccurrences(facultyId, entriesQuery, () =>
      getFacultySlots(facultyId, dhakaTomorrow(), addDays(today, BOOKING_WINDOW_DAYS))
    ),
  ]);
  if (!profile) notFound();

  // A lab's second slot is drawn as part of its first.
  const todayEntries = weekEntries.filter((e) => e.day === todayWeekday && !e.isLabContinuation);
  const todayStudents = todaySlots
    .filter((s) => s.status === 'OPEN')
    .flatMap((s) => confirmedOf(s).map((b) => ({ booking: b, slot: s })));
  const upcoming = weekSlots.filter((s) => s.status === 'OPEN').slice(0, 5);
  const weekBooked = weekSlots.filter((s) => s.status === 'OPEN').reduce((sum, s) => sum + confirmedOf(s).length, 0);
  const marked = stats.totalPresent + stats.totalAbsent;
  const attendanceRate = marked ? `${Math.round((stats.totalPresent / marked) * 100)}%` : '—';

  // Done / Now / Next for each of today's blocks.
  const timeline = todayEntries.map((e) => {
    const start = toMinutes(e.startSlot as TimeSlotValue);
    const end = start + blockMinutes(e.startSlot as TimeSlotValue, e.type === 'LAB');
    const state: 'done' | 'now' | 'later' = nowMinutes >= end ? 'done' : nowMinutes >= start ? 'now' : 'later';
    return { entry: e, state, slot: todaySlots.find((s) => s.startSlot === e.startSlot) };
  });
  const nextIdx = timeline.findIndex((t) => t.state === 'later');
  const profileIncomplete = !profile.initial || !profile.seat;

  return (
    <div className="space-y-8">
      <FadeIn className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">{formatDhakaDate(today)}</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {greeting(now.getHours())}, {profile.fullName.split(' ')[0]}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {profile.initial || 'No initial set'} · Seat {profile.seat || '—'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/faculty/qr">
              <QrCode className="h-4 w-4" />
              Share QR
            </Link>
          </Button>
          <Button asChild>
            <Link href="/faculty/bookings">
              <CalendarCheck2 className="h-4 w-4" />
              Bookings
            </Link>
          </Button>
        </div>
      </FadeIn>

      {profileIncomplete && (
        <FadeIn>
          <Card className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
            <CardContent className="flex flex-col justify-between gap-3 pt-6 sm:flex-row sm:items-center">
              <p className="text-sm text-amber-900 dark:text-amber-200">
                Your profile is missing an initial or seat number — students see these on your public page.
              </p>
              <Button asChild size="sm" variant="outline">
                <Link href="/faculty/profile">Complete profile</Link>
              </Button>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      <StaggerList className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StaggerItem>
          <Stat icon={Clock} label="Slots today" value={todayEntries.length} tone="bg-accent text-accent-foreground" />
        </StaggerItem>
        <StaggerItem>
          <Stat icon={Users} label="Students today" value={todayStudents.length} tone="bg-consultation-bg text-consultation" />
        </StaggerItem>
        <StaggerItem>
          <Stat icon={CalendarClock} label="Booked, next 7 days" value={weekBooked} tone="bg-violet-500/10 text-violet-600 dark:text-violet-300" />
        </StaggerItem>
        <StaggerItem>
          <Stat icon={UserCheck} label="Attendance" value={attendanceRate} tone="bg-success/10 text-success" />
        </StaggerItem>
      </StaggerList>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Today's schedule */}
        <Panel
          title="Today's schedule"
          subtitle={format(today, 'EEEE', { timeZone: 'UTC' })}
          action={<PanelLink href="/faculty/routine">Routine</PanelLink>}
        >
          {timeline.length === 0 ? (
            <Empty icon={Coffee} title="Nothing scheduled today" body="Enjoy the free day." />
          ) : (
            <StaggerList as="list" className="relative space-y-3 p-5">
              <span className="absolute bottom-8 left-[113px] top-8 w-px bg-border" aria-hidden />
              {timeline.map(({ entry, state, slot }, i) => {
                const style = entryStyleFor(entry.type)!;
                const booked = slot ? confirmedOf(slot).length : 0;
                return (
                  <StaggerItem as="list" key={entry.id} className={cn('relative flex items-stretch gap-4', state === 'done' && 'opacity-55')}>
                    <div className="w-[4.5rem] shrink-0 pt-2.5 text-right">
                      <p className="text-sm font-semibold tabular-nums">{TIME_SLOT_LABELS[entry.startSlot as TimeSlotValue]}</p>
                      <StateLabel state={state} isNext={i === nextIdx} />
                    </div>
                    <span
                      className={cn(
                        'relative z-10 mt-3.5 h-3 w-3 shrink-0 rounded-full border-2 border-card',
                        state === 'now' ? 'bg-success' : style.dot
                      )}
                    >
                      {state === 'now' && <span className="absolute inset-0 animate-ping rounded-full bg-success" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      {entry.type === 'CONSULTATION' && slot ? (
                        <Link href={`/faculty/bookings/${slot.id}`} className="block transition-transform hover:-translate-y-0.5">
                          <RoutineBlock entry={entry} />
                          <p className="mt-1.5 flex items-center gap-1.5 pl-1 text-xs font-medium text-consultation">
                            <Users className="h-3.5 w-3.5" />
                            {slot.status === 'CANCELLED' ? 'Cancelled' : `${booked} of ${slot.capacity} booked`}
                            <ArrowRight className="h-3 w-3" />
                          </p>
                        </Link>
                      ) : (
                        <RoutineBlock entry={entry} />
                      )}
                    </div>
                  </StaggerItem>
                );
              })}
            </StaggerList>
          )}
        </Panel>

        <div className="space-y-6">
          {/* Students booked today */}
          <Panel
            title="Students today"
            subtitle={`${todayStudents.length} booked`}
            action={todaySlots.length > 0 ? <PanelLink href="/faculty/bookings">Roster</PanelLink> : undefined}
          >
            {todayStudents.length === 0 ? (
              <Empty icon={Users} title="No students booked today" body="Today's bookings will appear here." />
            ) : (
              <StaggerList as="list" className="divide-y divide-border">
                {todayStudents.map(({ booking: b, slot }) => {
                  const type = BOOKING_TYPE_STYLES[b.type];
                  const TypeIcon = type.icon;
                  return (
                    <StaggerItem as="list" key={b.id}>
                      <Link href={`/faculty/bookings/${slot.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-xs">{initialsOf(b.student.fullName)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{b.student.fullName}</p>
                          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="tabular-nums">{b.student.studentId ?? '—'}</span>·
                            <span className={cn('inline-flex items-center gap-1', type.text)}>
                              <TypeIcon className="h-3 w-3" />
                              {type.short}
                            </span>
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs font-semibold tabular-nums">{TIME_SLOT_LABELS[slot.startSlot as TimeSlotValue]}</p>
                          {b.attendance ? (
                            <p className={cn('text-[11px] font-medium', b.attendance === 'PRESENT' ? 'text-success' : 'text-destructive')}>
                              {b.attendance === 'PRESENT' ? 'Present' : 'Absent'}
                            </p>
                          ) : (
                            <p className="text-[11px] text-muted-foreground">#{b.position} in queue</p>
                          )}
                        </div>
                      </Link>
                    </StaggerItem>
                  );
                })}
              </StaggerList>
            )}
          </Panel>

          {/* Upcoming consultations */}
          <Panel title="Upcoming consultations" subtitle="Next 7 days" action={<PanelLink href="/faculty/bookings">All</PanelLink>}>
            {upcoming.length === 0 ? (
              <Empty icon={CalendarClock} title="No upcoming slots" body="Add consultation hours from your routine." />
            ) : (
              <StaggerList as="list" className="divide-y divide-border">
                {upcoming.map((slot) => {
                  const students = confirmedOf(slot);
                  const fill = slot.capacity ? Math.min(100, (students.length / slot.capacity) * 100) : 0;
                  const full = students.length >= slot.capacity;
                  return (
                    <StaggerItem as="list" key={slot.id}>
                      <Link href={`/faculty/bookings/${slot.id}`} className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/50">
                        <DateTile date={slot.date} tone="past" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="text-sm font-semibold tabular-nums">{TIME_SLOT_LABELS[slot.startSlot as TimeSlotValue]}</p>
                            <p className={cn('text-xs font-medium tabular-nums', full ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground')}>
                              {students.length}/{slot.capacity}
                              {full && ' · Full'}
                            </p>
                          </div>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div className={cn('h-full rounded-full', full ? 'bg-amber-500' : 'bg-primary')} style={{ width: `${fill}%` }} />
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            {students.length === 0 ? (
                              <span className="text-xs text-muted-foreground">No bookings yet</span>
                            ) : (
                              <>
                                <div className="flex -space-x-1.5">
                                  {students.slice(0, 4).map((b) => (
                                    <Avatar key={b.id} className="h-7 w-7 ring-2 ring-card" title={b.student.fullName}>
                                      <AvatarFallback className="text-[10px] font-semibold">{initialsOf(b.student.fullName)}</AvatarFallback>
                                    </Avatar>
                                  ))}
                                </div>
                                <span className="truncate text-xs text-muted-foreground">
                                  {students[0]!.student.fullName.split(' ')[0]}
                                  {students.length > 1 && ` +${students.length - 1} more`}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </Link>
                    </StaggerItem>
                  );
                })}
              </StaggerList>
            )}
          </Panel>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Quick actions</h2>
        <StaggerList className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <StaggerItem><QuickAction href="/faculty/routine" label="Edit routine" icon={CalendarRange} /></StaggerItem>
          <StaggerItem><QuickAction href="/faculty/routine/import" label="Import routine" icon={Upload} /></StaggerItem>
          <StaggerItem><QuickAction href="/faculty/bookings" label="Bookings" icon={CalendarCheck2} /></StaggerItem>
          <StaggerItem><QuickAction href="/faculty/history" label="History" icon={History} /></StaggerItem>
          <StaggerItem><QuickAction href="/faculty/qr" label="QR code" icon={QrCode} /></StaggerItem>
          <StaggerItem><QuickAction href="/faculty/profile" label="Profile" icon={UserCog} /></StaggerItem>
        </StaggerList>
      </section>
    </div>
  );
}

function Panel({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
      {children}
      <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  );
}

function StateLabel({ state, isNext }: { state: 'done' | 'now' | 'later'; isNext: boolean }) {
  if (state === 'now') return <p className="text-[11px] font-semibold uppercase tracking-wide text-success">Now</p>;
  if (state === 'done') return <p className="text-[11px] text-muted-foreground">Done</p>;
  if (isNext) return <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">Next</p>;
  return null;
}

function Stat({ icon: Icon, label, value, tone }: { icon: typeof Clock; label: string; value: number | string; tone: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tone)}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-none tabular-nums">{value}</p>
        <p className="mt-1 text-xs leading-tight text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function QuickAction({ href, label, icon: Icon }: { href: string; label: string; icon: typeof Clock }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-3 text-sm font-medium transition-all hover:border-primary/40 hover:shadow-sm"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
        <Icon className="h-4 w-4" />
      </span>
      {label}
    </Link>
  );
}

function Empty({ icon: Icon, title, body }: { icon: typeof Clock; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </span>
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{body}</p>
    </div>
  );
}

