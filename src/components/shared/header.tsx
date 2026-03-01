'use client';

import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { Moon, Sun, Search } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MobileSidebar } from './sidebar';
import { NotificationDropdown } from './notification-dropdown';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const routeLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/cities': 'Cities',
  '/businesses': 'Businesses',
  '/followups': 'Follow-ups',
  '/renewals': 'Renewals',
  '/analytics': 'Analytics',
  '/reports': 'Reports',
  '/team': 'Team',
  '/activity-logs': 'Activity Logs',
  '/settings': 'Settings',
};

function getBreadcrumb(pathname: string): { label: string; href?: string }[] {
  const parts = pathname.split('/').filter(Boolean);
  const crumbs: { label: string; href?: string }[] = [];

  if (parts.length >= 1) {
    const base = `/${parts[0]}`;
    crumbs.push({ label: routeLabels[base] ?? parts[0], href: base });
  }
  if (parts.length >= 2) {
    if (parts[1] === 'new') {
      crumbs.push({ label: 'New' });
    } else if (parts[1] !== '[id]') {
      crumbs.push({ label: 'Details' });
    }
  }
  if (parts.length >= 3 && parts[2] === 'edit') {
    crumbs.push({ label: 'Edit' });
  }

  return crumbs;
}

export function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [search, setSearch] = useState('');
  const router = useRouter();

  const breadcrumbs = getBreadcrumb(pathname);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/businesses?search=${encodeURIComponent(search.trim())}`);
      setSearch('');
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="flex h-14 items-center gap-4 px-4">
        <MobileSidebar />

        <nav className="hidden md:flex items-center gap-1 text-sm text-muted-foreground">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span>/</span>}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-foreground transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>

        <div className="flex-1" />

        <form onSubmit={handleSearch} className="hidden md:flex relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search businesses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-64"
          />
        </form>

        <NotificationDropdown />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        <UserButton afterSignOutUrl="/" />
      </div>
    </header>
  );
}
