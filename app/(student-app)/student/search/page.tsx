import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';
import { getOrCreateActiveToken } from '@/lib/qr/service';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search as SearchIcon, ChevronRight } from 'lucide-react';
import { FadeIn } from '@/components/motion/fade-in';
import { StaggerList, StaggerItem } from '@/components/motion/stagger-list';

export default async function StudentSearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? '').trim();

  const faculty = q
    ? await prisma.facultyProfile.findMany({
        where: {
          OR: [
            { fullName: { contains: q, mode: 'insensitive' } },
            { initial: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        orderBy: { fullName: 'asc' },
        take: 30,
      })
    : await prisma.facultyProfile.findMany({ orderBy: { fullName: 'asc' }, take: 30 });

  // Resolve each faculty's current active QR token so search results link via the same stable route.
  const links = await Promise.all(
    faculty.map(async (f) => {
      const token = await getOrCreateActiveToken(f.id);
      return { faculty: f, href: `/faculty/${f.publicId}`, token: token.token };
    })
  );

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="text-2xl font-semibold tracking-tight">Search faculty</h1>
        <p className="text-sm text-muted-foreground">Search by name, initial, or email.</p>
      </FadeIn>

      <form method="get" className="flex gap-2">
        <div className="relative flex-1">
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
        <StaggerList as="list" className="space-y-2">
          {links.map(({ faculty: f, href }) => (
            <StaggerItem as="list" key={f.id}>
              <Link
                href={href}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-all hover:border-primary hover:bg-muted hover:scale-[1.01]"
              >
                <div>
                  <p className="font-medium">{f.fullName}</p>
                  <p className="text-sm text-muted-foreground">
                    {f.initial} · Seat {f.seat || '—'}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </StaggerItem>
          ))}
        </StaggerList>
      )}
    </div>
  );
}
