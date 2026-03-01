'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Building2,
  Phone,
  Footprints,
  Handshake,
  IndianRupee,
  MessageSquare,
  PartyPopper,
  RefreshCw,
  LayoutGrid,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StatCard } from '@/components/shared/stat-card';
import { PageHeader } from '@/components/shared/page-header';
import { formatCurrency, formatRelativeTime, generateWhatsAppLink } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/use-current-user';

// ── Dashboard Widget Config ─────────────────────────────────────────────────

interface WidgetConfig {
  kpiCards: boolean;
  activityFeed: boolean;
  followUps: boolean;
  cityChart: boolean;
  serviceChart: boolean;
  teamTable: boolean;
}

const DEFAULT_WIDGETS: WidgetConfig = {
  kpiCards: true,
  activityFeed: true,
  followUps: true,
  cityChart: true,
  serviceChart: true,
  teamTable: true,
};

function loadWidgetConfig(): WidgetConfig {
  if (typeof window === 'undefined') return DEFAULT_WIDGETS;
  try {
    const saved = localStorage.getItem('nexcrm-dashboard-widgets');
    if (saved) return { ...DEFAULT_WIDGETS, ...JSON.parse(saved) };
  } catch { /* ignore */ }
  return DEFAULT_WIDGETS;
}

function saveWidgetConfig(config: WidgetConfig) {
  try {
    localStorage.setItem('nexcrm-dashboard-widgets', JSON.stringify(config));
  } catch { /* ignore */ }
}

// ── Types ───────────────────────────────────────────────────────────────────

interface OverviewData {
  totalBusinesses: number;
  totalVisits: number;
  totalCalls: number;
  totalDeals: number;
  totalRevenue: number;
  avgDealSize: number;
  conversionRate: number;
  activeFollowUps: number;
  newThisMonth: number;
  wonThisMonth: number;
  renewalsDueThisMonth: number;
  renewalRevenue: number;
}

interface Activity {
  id: string;
  type: string;
  outcome: string;
  remark: string | null;
  createdAt: string;
  business: {
    id: string;
    businessName: string;
  };
  user: {
    id: string;
    name: string;
  };
}

interface FollowUp {
  id: string;
  businessName: string;
  ownerName: string;
  phone: string;
  followUpDate: string;
  city: {
    id: string;
    name: string;
  };
}

interface CityPerformance {
  cityId: string;
  cityName: string;
  businesses: number;
  visited: number;
  interested: number;
  won: number;
  revenue: number;
  conversionRate: number;
}

interface ServiceDemand {
  service: string;
  count: number;
  revenue: number;
}

interface TeamMember {
  userId: string;
  userName: string;
  role: string;
  businesses: number;
  activities: number;
  deals: number;
  revenue: number;
}

// ── Chart colors ────────────────────────────────────────────────────────────

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// ── Activity type badge color mapping ───────────────────────────────────────

function getActivityBadgeVariant(type: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (type) {
    case 'CALL':
    case 'VISIT':
      return 'default';
    case 'FOLLOW_UP':
    case 'DEMO':
      return 'secondary';
    default:
      return 'outline';
  }
}

function formatActivityType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatServiceLabel(service: string): string {
  const labels: Record<string, string> = {
    WEBSITE: 'Website',
    GBP: 'GBP',
    ERP: 'ERP',
    SOCIAL_MEDIA: 'Social Media',
    SEO: 'SEO',
    LOGO_BRANDING: 'Logo & Branding',
  };
  return labels[service] ?? service;
}

// ── Dashboard Page ──────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { dbUser } = useCurrentUser();
  const [widgets, setWidgets] = useState<WidgetConfig>(DEFAULT_WIDGETS);
  const [showWidgetConfig, setShowWidgetConfig] = useState(false);

  useEffect(() => {
    setWidgets(loadWidgetConfig());
  }, []);

  function toggleWidget(key: keyof WidgetConfig) {
    setWidgets((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      saveWidgetConfig(updated);
      return updated;
    });
  }

  // State for each data section
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [cityData, setCityData] = useState<CityPerformance[]>([]);
  const [serviceData, setServiceData] = useState<ServiceDemand[]>([]);
  const [teamData, setTeamData] = useState<TeamMember[]>([]);

  // Loading states
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [loadingFollowUps, setLoadingFollowUps] = useState(true);
  const [loadingCities, setLoadingCities] = useState(true);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingTeam, setLoadingTeam] = useState(true);

  const isAdminOrManager = dbUser?.role === 'ADMIN' || dbUser?.role === 'MANAGER';

  // ── Fetch all data on mount ─────────────────────────────────────────────

  useEffect(() => {
    // Overview KPIs
    fetch('/api/analytics/overview')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setOverview(json.data);
      })
      .catch(() => {})
      .finally(() => setLoadingOverview(false));

    // Recent activities
    fetch('/api/activities?limit=15')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setActivities(json.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoadingActivities(false));

    // Today's follow-ups
    fetch('/api/followups?type=today')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setFollowUps(json.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoadingFollowUps(false));

    // City performance
    fetch('/api/analytics/cities')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setCityData(json.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoadingCities(false));

    // Service demand
    fetch('/api/analytics/services')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setServiceData(json.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoadingServices(false));

    // Team performance (ADMIN/MANAGER only)
    if (isAdminOrManager) {
      fetch('/api/analytics/team')
        .then((res) => res.json())
        .then((json) => {
          if (json.success) setTeamData(json.data ?? []);
        })
        .catch(() => {})
        .finally(() => setLoadingTeam(false));
    } else {
      setLoadingTeam(false);
    }
  }, [isAdminOrManager]);

  // ── Computed values ─────────────────────────────────────────────────────

  const totalCities = cityData.length;

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your CRM performance and activity."
        action={
          <Button variant="outline" size="sm" onClick={() => setShowWidgetConfig(true)}>
            <LayoutGrid className="h-4 w-4 mr-2" />
            Customize
          </Button>
        }
      />

      {/* ── Section 1: KPI Stat Cards ──────────────────────────────────── */}
      {widgets.kpiCards && <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Cities"
          value={loadingOverview && loadingCities ? 0 : totalCities}
          icon={MapPin}
          color="blue"
          loading={loadingOverview && loadingCities}
        />
        <StatCard
          title="Total Businesses"
          value={overview?.totalBusinesses ?? 0}
          icon={Building2}
          color="green"
          loading={loadingOverview}
        />
        <StatCard
          title="Calls Today"
          value={overview?.totalCalls ?? 0}
          icon={Phone}
          color="orange"
          loading={loadingOverview}
        />
        <StatCard
          title="Visits Today"
          value={overview?.totalVisits ?? 0}
          icon={Footprints}
          color="purple"
          loading={loadingOverview}
        />
        <StatCard
          title="Deals This Month"
          value={overview?.wonThisMonth ?? 0}
          icon={Handshake}
          color="red"
          loading={loadingOverview}
        />
        <StatCard
          title="Revenue This Month"
          value={
            loadingOverview
              ? 0
              : formatCurrency(overview?.totalRevenue ?? 0)
          }
          icon={IndianRupee}
          color="green"
          loading={loadingOverview}
        />
        <StatCard
          title="Renewals Due"
          value={overview?.renewalsDueThisMonth ?? 0}
          icon={RefreshCw}
          color="orange"
          loading={loadingOverview}
        />
        <StatCard
          title="Renewal Revenue"
          value={
            loadingOverview
              ? 0
              : formatCurrency(overview?.renewalRevenue ?? 0)
          }
          icon={IndianRupee}
          color="purple"
          loading={loadingOverview}
        />
      </div>}

      {/* ── Section 2: Activity Feed + Follow-ups ──────────────────────── */}
      <div className="grid gap-4 md:grid-cols-5">
        {/* Left: Recent Activity (col-span-3) */}
        {widgets.activityFeed && <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingActivities ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-3 w-20" />
                  </div>
                ))}
              </div>
            ) : activities.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No recent activities found.
              </p>
            ) : (
              <ScrollArea className="h-[420px]">
                <div className="space-y-4 pr-4">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 border-b pb-3 last:border-0 last:pb-0"
                    >
                      <Badge variant={getActivityBadgeVariant(activity.type)}>
                        {formatActivityType(activity.type)}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/businesses/${activity.business.id}`}
                            className="text-sm font-medium hover:underline truncate"
                          >
                            {activity.business.businessName}
                          </Link>
                        </div>
                        {activity.remark && (
                          <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                            {activity.remark}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                          by {activity.user.name}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                        {formatRelativeTime(activity.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>}

        {/* Right: Today's Follow-ups (col-span-2) */}
        {widgets.followUps && <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Today&apos;s Follow-ups</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingFollowUps ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                ))}
              </div>
            ) : followUps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <PartyPopper className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">All caught up!</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  No follow-ups scheduled for today.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[420px]">
                <div className="space-y-4 pr-4">
                  {followUps.map((followUp) => (
                    <div
                      key={followUp.id}
                      className="rounded-lg border p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            href={`/businesses/${followUp.id}`}
                            className="text-sm font-medium hover:underline block truncate"
                          >
                            {followUp.businessName}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {followUp.ownerName}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {followUp.city.name}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${followUp.phone}`}
                          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {followUp.phone}
                        </a>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-green-600 hover:text-green-700"
                          asChild
                        >
                          <a
                            href={generateWhatsAppLink(
                              followUp.phone,
                              `Hi ${followUp.ownerName}, this is from TheNextURL. Just following up regarding ${followUp.businessName}.`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>}
      </div>

      {/* ── Section 3: Charts ──────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Left: City Performance */}
        {widgets.cityChart && <Card>
          <CardHeader>
            <CardTitle>City Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingCities ? (
              <div className="space-y-3">
                <Skeleton className="h-[300px] w-full" />
              </div>
            ) : cityData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No city data available.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={cityData}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <XAxis
                    dataKey="cityName"
                    tick={{ fontSize: 12 }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="visited" name="Visited" fill={COLORS[0]} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="won" name="Won" fill={COLORS[1]} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>}

        {/* Right: Service Demand */}
        {widgets.serviceChart && <Card>
          <CardHeader>
            <CardTitle>Service Demand</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingServices ? (
              <div className="space-y-3">
                <Skeleton className="h-[300px] w-full" />
              </div>
            ) : serviceData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No service data available.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={serviceData.map((s) => ({
                    ...s,
                    label: formatServiceLabel(s.service),
                  }))}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12 }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="Deals" fill={COLORS[4]} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>}
      </div>

      {/* ── Section 4: Top Performers (ADMIN/MANAGER only) ────────────── */}
      {widgets.teamTable && isAdminOrManager && !loadingTeam && teamData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">#</th>
                    <th className="pb-2 pr-4 font-medium">Name</th>
                    <th className="pb-2 pr-4 font-medium">Role</th>
                    <th className="pb-2 pr-4 font-medium text-right">Businesses</th>
                    <th className="pb-2 pr-4 font-medium text-right">Activities</th>
                    <th className="pb-2 pr-4 font-medium text-right">Deals</th>
                    <th className="pb-2 font-medium text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {teamData.map((member, index) => (
                    <tr key={member.userId} className="border-b last:border-0">
                      <td className="py-2.5 pr-4 text-muted-foreground">
                        {index + 1}
                      </td>
                      <td className="py-2.5 pr-4 font-medium">
                        {member.userName}
                      </td>
                      <td className="py-2.5 pr-4">
                        <Badge variant="secondary">
                          {member.role}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        {member.businesses}
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        {member.activities}
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        {member.deals}
                      </td>
                      <td className="py-2.5 text-right font-medium">
                        {formatCurrency(member.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {widgets.teamTable && isAdminOrManager && loadingTeam && (
        <Card>
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-6" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <div className="flex-1" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Widget Config Dialog */}
      <Dialog open={showWidgetConfig} onOpenChange={setShowWidgetConfig}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Customize Dashboard</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Toggle which sections are visible on your dashboard.
            </p>
            {[
              { key: 'kpiCards' as const, label: 'KPI Cards', desc: 'Revenue, deals, businesses stats' },
              { key: 'activityFeed' as const, label: 'Recent Activity', desc: 'Latest team activities' },
              { key: 'followUps' as const, label: "Today's Follow-ups", desc: 'Scheduled follow-ups' },
              { key: 'cityChart' as const, label: 'City Performance', desc: 'City-wise bar chart' },
              { key: 'serviceChart' as const, label: 'Service Demand', desc: 'Service demand chart' },
              { key: 'teamTable' as const, label: 'Top Performers', desc: 'Team leaderboard (Admin)' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch
                  checked={widgets[item.key]}
                  onCheckedChange={() => toggleWidget(item.key)}
                />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
