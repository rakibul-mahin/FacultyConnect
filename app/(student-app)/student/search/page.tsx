import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn, initialsOf } from '@/lib/utils';
import { Search as SearchIcon, ChevronRight } from 'lucide-react';
import { FadeIn } from '@/components/motion/fade-in';
import { StaggerList, StaggerItem } from '@/components/motion/stagger-list';

export default async function StudentSearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? '').trim();

  // Weekly consultation-slot counts come back with the same query.
  const consultationCount = { _count: { select: { routineEntries: { where: { type: 'CONSULTATION' as const } } } } };
  const faculty = await prisma.facultyProfile.findMany({
    where: q
      ? {
          OR: [
            { fullName: { contains: q, mode: 'insensitive' } },
            { initial: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        }
      : undefined,
    include: consultationCount,
    orderBy: { fullName: 'asc' },
    take: 30,
  });

  const links = faculty.map((f) => ({ faculty: f, href: `/faculty/${f.publicId}`, slots: f._count.routineEntries }));

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="text-2xl font-semibold tracking-tight">Search faculty</h1>
        <p className="text-sm text-muted-foreground">Search by name, initial, or email.</p>
      </FadeIn>

      <form method="get" className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="e.g. Rakibul, RKBM, rakibul.hasan@bracu.ac.bd" className="pl-9" />
        </div>
        <Button type="submit">Search</Button>
      </form>

      {links.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">No faculty found for &ldquo;{q}&rdquo;.</CardContent>
        </Card>
      ) : (
        <StaggerList as="list" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {links.map(({ faculty: f, href, slots }) => (
            <StaggerItem as="list" key={f.id}>
              <Link
                href={href}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md hover:shadow-primary/5"
              >
                <Avatar className="h-12 w-12 ring-4 ring-accent/60">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-sky-400 text-primary-foreground">
                    {initialsOf(f.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{f.fullName}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {f.initial} · Seat {f.seat || '—'}
                  </p>
                  <p
                    className={cn(
                      'mt-1 flex items-center gap-1.5 text-xs font-medium',
                      slots > 0 ? 'text-consultation' : 'text-muted-foreground'
                    )}
                  >
                    <span className={cn('h-1.5 w-1.5 rounded-full', slots > 0 ? 'bg-consultation' : 'bg-muted-foreground/40')} />
                    {slots > 0 ? `${slots} consultation slot${slots === 1 ? '' : 's'} / week` : 'No consultation hours'}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            </StaggerItem>
          ))}
        </StaggerList>
      )}
    </div>
  );
}
