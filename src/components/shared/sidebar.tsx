'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser, useClerk } from '@clerk/nextjs';
import {
  LayoutDashboard,
  MapPin,
  Building2,
  Bell,
  RefreshCw,
  BarChart3,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  Inbox,
  FileBarChart,
  ScrollText,
  SearchCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useSidebarStore } from '@/stores/use-sidebar-store';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useFollowUpCount } from '@/hooks/use-follow-up-count';
import { useRenewalCount } from '@/hooks/use-renewal-count';
import { useState } from 'react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Cities', href: '/cities', icon: MapPin },
  { label: 'Businesses', href: '/businesses', icon: Building2 },
  { label: 'Follow-ups', href: '/followups', icon: Bell, showBadge: true },
  { label: 'Renewals', href: '/renewals', icon: RefreshCw, showRenewalBadge: true },
  { label: 'Client Lookup', href: '/lookup', icon: SearchCheck },
  { label: 'Website Leads', href: '/leads', icon: Inbox, adminOnly: true },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Reports', href: '/reports', icon: FileBarChart, adminOnly: true },
  { label: 'Team', href: '/team', icon: Users, adminOnly: true },
  { label: 'Activity Logs', href: '/activity-logs', icon: ScrollText, adminOnly: true },
  { label: 'Settings', href: '/settings', icon: Settings },
];

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const { dbUser } = useCurrentUser();
  const { count: overdueCount } = useFollowUpCount();
  const { count: renewalOverdueCount } = useRenewalCount();
  const { isCollapsed, setCollapsed } = useSidebarStore();

  const role = dbUser?.role ?? 'SALES';
  const filteredItems = navItems.filter(
    (item) => !item.adminOnly || role === 'ADMIN' || role === 'MANAGER'
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-4">
        {!isCollapsed && (
          <Link href="/dashboard" className="flex items-center gap-2" onClick={onNavigate}>
            <Building2 className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">TheNextURL</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:flex"
          onClick={() => setCollapsed(!isCollapsed)}
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform', isCollapsed && 'rotate-180')} />
        </Button>
      </div>

      <Separator />

      <ScrollArea className="flex-1 px-2 py-4">
        <nav className="flex flex-col gap-1">
          {filteredItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link key={item.href} href={item.href} onClick={onNavigate}>
                <span
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground',
                    isCollapsed && 'justify-center px-2'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {item.showBadge && overdueCount > 0 && (
                        <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                          {overdueCount}
                        </Badge>
                      )}
                      {item.showRenewalBadge && renewalOverdueCount > 0 && (
                        <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                          {renewalOverdueCount}
                        </Badge>
                      )}
                    </>
                  )}
                </span>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator />

      <div className={cn('p-4', isCollapsed && 'flex justify-center')}>
        {!isCollapsed ? (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={clerkUser?.imageUrl} />
              <AvatarFallback>
                {(dbUser?.name ?? clerkUser?.firstName ?? 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {dbUser?.name ?? clerkUser?.firstName ?? 'User'}
              </p>
              <Badge variant="secondary" className="text-xs">
                {role}
              </Badge>
            </div>
            <Button variant="ghost" size="icon" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="icon" onClick={() => signOut()}>
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function Sidebar() {
  const { isCollapsed } = useSidebarStore();

  return (
    <aside
      className={cn(
        'hidden lg:flex lg:flex-col border-r bg-card h-screen sticky top-0 transition-all duration-300',
        isCollapsed ? 'lg:w-16' : 'lg:w-64'
      )}
    >
      <NavContent />
    </aside>
  );
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-64">
        <NavContent onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
