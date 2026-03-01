'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import {
  Building2,
  Phone,
  Footprints,
  ThumbsUp,
  Handshake,
  IndianRupee,
  TrendingUp,
  Target,
  RefreshCw,
  XCircle,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/use-current-user';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts';
import { SERVICE_TYPES, FAILURE_REASONS } from '@/lib/constants';

const CHART_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

interface Overview {
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
}

type DateRange = 'today' | '7d' | '30d' | 'thisMonth' | 'lastMonth' | 'all';

function getDateRange(range: DateRange): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString();

  switch (range) {
    case 'today': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { from: start.toISOString(), to };
    }
    case '7d': {
      const start = new Date(now.getTime() - 7 * 86400000);
      return { from: start.toISOString(), to };
    }
    case '30d': {
      const start = new Date(now.getTime() - 30 * 86400000);
      return { from: start.toISOString(), to };
    }
    case 'thisMonth': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: start.toISOString(), to };
    }
    case 'lastMonth': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return { from: start.toISOString(), to: end.toISOString() };
    }
    default:
      return { from: '', to: '' };
  }
}

export default function AnalyticsPage() {
  useCurrentUser();
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [cityData, setCityData] = useState<Array<{ cityName: string; businesses: number; visited: number; won: number; revenue: number }>>([]);
  const [categoryData, setCategoryData] = useState<Array<{ category: string; count: number; won: number; conversionRate: number }>>([]);
  const [serviceData, setServiceData] = useState<Array<{ service: string; count: number; revenue: number }>>([]);
  const [trendData, setTrendData] = useState<Array<{ date: string; calls: number; visits: number; deals: number; revenue: number }>>([]);
  const [failureData, setFailureData] = useState<Array<{ reason: string; count: number; percentage: number }>>([]);
  const [statusData, setStatusData] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [renewalData, setRenewalData] = useState<{
    totalDueForRenewal: number;
    renewed: number;
    churned: number;
    pending: number;
    contacted: number;
    renewalRate: number;
    churnRate: number;
    revenueRetained: number;
    revenueLost: number;
    serviceBreakdown: Array<{ service: string; total: number; renewed: number; churned: number; renewalRate: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    const { from, to } = getDateRange(dateRange);
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString() ? `?${params.toString()}` : '';

    try {
      const [overviewRes, citiesRes, categoriesRes, servicesRes, trendsRes, failuresRes, renewalsRes] =
        await Promise.all([
          fetch(`/api/analytics/overview${qs}`),
          fetch(`/api/analytics/cities${qs}`),
          fetch(`/api/analytics/categories${qs}`),
          fetch(`/api/analytics/services${qs}`),
          fetch(`/api/analytics/trends${qs}`),
          fetch(`/api/analytics/failures${qs}`),
          fetch(`/api/analytics/renewals${qs}`),
        ]);

      const [overviewJson, citiesJson, categoriesJson, servicesJson, trendsJson, failuresJson, renewalsJson] =
        await Promise.all([
          overviewRes.json(),
          citiesRes.json(),
          categoriesRes.json(),
          servicesRes.json(),
          trendsRes.json(),
          failuresRes.json(),
          renewalsRes.json(),
        ]);

      setOverview(overviewJson.data ?? null);
      setCityData(citiesJson.data ?? []);
      setCategoryData(categoriesJson.data ?? []);
      setServiceData(
        (servicesJson.data ?? []).map((s: { service: string; count: number; revenue: number }) => ({
          ...s,
          label: SERVICE_TYPES.find((st) => st.value === s.service)?.label ?? s.service,
        }))
      );
      setTrendData(trendsJson.data ?? []);
      setFailureData(
        (failuresJson.data ?? []).map((f: { reason: string; count: number; percentage: number }) => ({
          ...f,
          label: FAILURE_REASONS.find((fr) => fr.value === f.reason)?.label ?? f.reason,
        }))
      );

      setRenewalData(renewalsJson.data ?? null);

      // Build status distribution from cities data
      if (citiesJson.data) {
        const statusCounts: Record<string, number> = {};
        (citiesJson.data as Array<{ visited: number; won: number; businesses: number }>).forEach((c) => {
          statusCounts['Visited'] = (statusCounts['Visited'] || 0) + c.visited;
          statusCounts['Won'] = (statusCounts['Won'] || 0) + c.won;
          statusCounts['Other'] = (statusCounts['Other'] || 0) + (c.businesses - c.visited);
        });
        setStatusData([
          { name: 'Visited', value: statusCounts['Visited'] || 0, color: '#3b82f6' },
          { name: 'Won', value: statusCounts['Won'] || 0, color: '#22c55e' },
          { name: 'Not Visited', value: statusCounts['Other'] || 0, color: '#9ca3af' },
        ]);
      }
    } catch {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Track performance metrics and business insights."
        action={
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
              <SelectItem value="lastMonth">Last Month</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Businesses"
          value={overview?.totalBusinesses ?? 0}
          icon={Building2}
          color="blue"
          loading={loading}
        />
        <StatCard
          title="Calls Made"
          value={overview?.totalCalls ?? 0}
          icon={Phone}
          color="green"
          loading={loading}
        />
        <StatCard
          title="Visits Made"
          value={overview?.totalVisits ?? 0}
          icon={Footprints}
          color="orange"
          loading={loading}
        />
        <StatCard
          title="Positive Responses"
          value={overview?.wonThisMonth ?? 0}
          icon={ThumbsUp}
          color="purple"
          loading={loading}
        />
        <StatCard
          title="Deals Closed"
          value={overview?.totalDeals ?? 0}
          icon={Handshake}
          color="green"
          loading={loading}
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(overview?.totalRevenue ?? 0)}
          icon={IndianRupee}
          color="blue"
          loading={loading}
        />
        <StatCard
          title="Avg Deal Size"
          value={formatCurrency(overview?.avgDealSize ?? 0)}
          icon={TrendingUp}
          color="purple"
          loading={loading}
        />
        <StatCard
          title="Conversion Rate"
          value={`${(overview?.conversionRate ?? 0).toFixed(1)}%`}
          icon={Target}
          color="orange"
          loading={loading}
        />
      </div>

      {/* Activity Trend & Status Distribution */}
      <div className="grid md:grid-cols-5 gap-4">
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Activity Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => {
                      const date = new Date(d);
                      return `${date.getDate()}/${date.getMonth() + 1}`;
                    }}
                    fontSize={12}
                  />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="calls" stroke="#3b82f6" strokeWidth={2} name="Calls" />
                  <Line type="monotone" dataKey="visits" stroke="#f59e0b" strokeWidth={2} name="Visits" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* City Performance & Service Demand */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">City Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={cityData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={12} />
                  <YAxis type="category" dataKey="cityName" fontSize={12} width={80} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="visited" fill="#3b82f6" name="Visited" stackId="a" />
                  <Bar dataKey="won" fill="#22c55e" name="Won" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Service Demand</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={serviceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" fontSize={11} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" name="Demand">
                    {serviceData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Analysis & Failure Reasons */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Category Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : categoryData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium">Category</th>
                      <th className="text-right py-2 font-medium">Total</th>
                      <th className="text-right py-2 font-medium">Won</th>
                      <th className="text-right py-2 font-medium">Conv %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryData.map((cat) => (
                      <tr key={cat.category} className="border-b last:border-0">
                        <td className="py-2">{cat.category.replace(/_/g, ' ')}</td>
                        <td className="py-2 text-right">{cat.count}</td>
                        <td className="py-2 text-right">{cat.won}</td>
                        <td className="py-2 text-right">{cat.conversionRate.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Failure Reasons</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : failureData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No lost deals yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium">Reason</th>
                      <th className="text-right py-2 font-medium">Count</th>
                      <th className="text-right py-2 font-medium">% of Lost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {failureData.map((f: { reason: string; label?: string; count: number; percentage: number }) => (
                      <tr key={f.reason} className="border-b last:border-0">
                        <td className="py-2">{f.label ?? f.reason.replace(/_/g, ' ')}</td>
                        <td className="py-2 text-right">{f.count}</td>
                        <td className="py-2 text-right">{f.percentage.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Renewal Analytics */}
      <h2 className="text-lg font-semibold pt-2">Renewal Analytics</h2>

      {/* Renewal KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Renewal Rate"
          value={`${renewalData?.renewalRate ?? 0}%`}
          icon={RefreshCw}
          color="green"
          loading={loading}
        />
        <StatCard
          title="Churn Rate"
          value={`${renewalData?.churnRate ?? 0}%`}
          icon={XCircle}
          color="red"
          loading={loading}
        />
        <StatCard
          title="Revenue Retained"
          value={formatCurrency(renewalData?.revenueRetained ?? 0)}
          icon={ShieldCheck}
          color="blue"
          loading={loading}
        />
        <StatCard
          title="Revenue Lost"
          value={formatCurrency(renewalData?.revenueLost ?? 0)}
          icon={AlertTriangle}
          color="orange"
          loading={loading}
        />
      </div>

      {/* Renewal Status Breakdown & Service Renewal */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Renewal Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : !renewalData || renewalData.totalDueForRenewal === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No renewal data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Renewed', value: renewalData.renewed, color: '#22c55e' },
                      { name: 'Churned', value: renewalData.churned, color: '#ef4444' },
                      { name: 'Pending', value: renewalData.pending, color: '#f59e0b' },
                      { name: 'Contacted', value: renewalData.contacted, color: '#3b82f6' },
                    ].filter((d) => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {[
                      { name: 'Renewed', value: renewalData.renewed, color: '#22c55e' },
                      { name: 'Churned', value: renewalData.churned, color: '#ef4444' },
                      { name: 'Pending', value: renewalData.pending, color: '#f59e0b' },
                      { name: 'Contacted', value: renewalData.contacted, color: '#3b82f6' },
                    ]
                      .filter((d) => d.value > 0)
                      .map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Service-wise Renewal</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : !renewalData || renewalData.serviceBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No renewal data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={renewalData.serviceBreakdown.map((s) => ({
                    ...s,
                    label: SERVICE_TYPES.find((st) => st.value === s.service)?.label ?? s.service,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" fontSize={11} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="renewed" fill="#22c55e" name="Renewed" stackId="a" />
                  <Bar dataKey="churned" fill="#ef4444" name="Churned" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
