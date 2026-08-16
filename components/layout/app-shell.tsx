'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CalendarClock,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  CalendarRange,
  ClipboardList,
  History,
  QrCode,
  UserCog,
  Search,
  CalendarCheck2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOutAction } from '@/lib/auth/actions';
import { ThemeToggle } from '@/components/theme/theme-toggle';

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

// Icon components (functions) can't cross the Server -> Client Component
// boundary as props, so nav configs live here in client code, keyed by a
// plain string `section` passed down from the server layouts instead.
const NAV_ITEMS: Record<'faculty' | 'student', NavItem[]> = {
  faculty: [
    { href: '/faculty', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: '/faculty/routine', label: 'Routine', icon: CalendarRange },
    { href: '/faculty/bookings', label: 'Bookings', icon: ClipboardList },
    { href: '/faculty/history', label: 'History', icon: History },
    { href: '/faculty/qr', label: 'QR Code', icon: QrCode },
    { href: '/faculty/profile', label: 'Profile', icon: UserCog },
  ],
  student: [
    { href: '/student', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: '/student/search', label: 'Search Faculty', icon: Search },
    { href: '/student/bookings', label: 'My Bookings', icon: CalendarCheck2 },
    { href: '/student/profile', label: 'Profile', icon: UserCog },
  ],
};

export function AppShell({
  section,
  userLabel,
  userSublabel,
  children,
}: {
  section: 'faculty' | 'student';
  userLabel: string;
  userSublabel: string;
  children: React.ReactNode;
}) {
  const navItems = NAV_ITEMS[section];
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const initials = userLabel
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card px-4 py-6 lg:flex">
        <div className="mb-8 flex items-center justify-between px-2">
          <Link href="/" className="flex items-center gap-2 text-base font-semibold">
            <CalendarClock className="h-5 w-5 text-primary" />
            FacultyConnect
          </Link>
          <ThemeToggle />
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(pathname, item)} />
          ))}
        </nav>
        <UserMenu userLabel={userLabel} userSublabel={userSublabel} initials={initials} />
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur lg:hidden">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
          <CalendarClock className="h-5 w-5 text-primary" />
          FacultyConnect
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.22 }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-card px-4 py-6 lg:hidden"
            >
              <div className="mb-8 flex items-center justify-between px-2">
                <span className="flex items-center gap-2 text-base font-semibold">
                  <CalendarClock className="h-5 w-5 text-primary" />
                  FacultyConnect
                </span>
                <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Close menu">
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <nav className="flex flex-1 flex-col gap-1">
                {navItems.map((item) => (
                  <NavLink key={item.href} item={item} active={isActive(pathname, item)} onClick={() => setMobileOpen(false)} />
                ))}
              </nav>
              <UserMenu userLabel={userLabel} userSublabel={userSublabel} initials={initials} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 px-4 pb-16 pt-20 sm:px-6 lg:px-10 lg:pb-10 lg:pt-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + '/');
}

function NavLink({ item, active, onClick }: { item: NavItem; active: boolean; onClick?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </Link>
  );
}

function UserMenu({ userLabel, userSublabel, initials }: { userLabel: string; userSublabel: string; initials: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="mt-4 flex items-center gap-3 rounded-lg border border-border p-2 text-left transition-colors hover:bg-muted">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{userLabel}</p>
            <p className="truncate text-xs text-muted-foreground">{userSublabel}</p>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>{userLabel}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <form action={signOutAction}>
          <DropdownMenuItem asChild>
            <button type="submit" className="flex w-full items-center gap-2 text-destructive">
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
