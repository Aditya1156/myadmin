'use client';

import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import {
  FileBarChart,
  Download,
  Loader2,
  IndianRupee,
  Building2,
  Handshake,
  TrendingUp,
} from 'lucide-react';
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
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { useCurrentUser } from '@/hooks/use-current-user';
import { formatCurrency } from '@/lib/utils';

interface ReportData {
  summary: {
    totalBusinesses: number;
    totalDeals: number;
    totalRevenue: number;
    monthlyDeals: number;
    monthlyRevenue: number;
  };
  statusBreakdown: { status: string; count: number }[];
  categoryBreakdown: { category: string; count: number }[];
  teamPerformance: {
    name: string;
    role: string;
    businesses: number;
    deals: number;
    activities: number;
    revenue: number;
  }[];
  recentDeals: {
    id: string;
    service: string;
    amount: number;
    paymentStatus: string;
    signedDate: string;
    business: string;
    user: string;
  }[];
}

const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

function formatLabel(str: string) {
  return str.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ReportsPage() {
  const { dbUser } = useCurrentUser();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetch('/api/reports')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setData(json.data);
      })
      .catch(() => toast.error('Failed to load report'))
      .finally(() => setLoading(false));
  }, []);

  const handleExport = () => {
    if (!data) return;
    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();

      // Summary
      const summaryWs = XLSX.utils.json_to_sheet([data.summary]);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

      // Status Breakdown
      const statusWs = XLSX.utils.json_to_sheet(data.statusBreakdown.map((s) => ({ Status: formatLabel(s.status), Count: s.count })));
      XLSX.utils.book_append_sheet(wb, statusWs, 'Status Breakdown');

      // Category Breakdown
      const catWs = XLSX.utils.json_to_sheet(data.categoryBreakdown.map((c) => ({ Category: formatLabel(c.category), Count: c.count })));
      XLSX.utils.book_append_sheet(wb, catWs, 'Categories');

      // Team Performance
      const teamWs = XLSX.utils.json_to_sheet(data.teamPerformance.map((t) => ({
        Name: t.name, Role: t.role, Businesses: t.businesses, Deals: t.deals, Activities: t.activities, Revenue: t.revenue,
      })));
      XLSX.utils.book_append_sheet(wb, teamWs, 'Team Performance');

      // Recent Deals
      const dealWs = XLSX.utils.json_to_sheet(data.recentDeals.map((d) => ({
        Business: d.business, Service: d.service, Amount: d.amount, Status: d.paymentStatus, Date: d.signedDate, 'Closed By': d.user,
      })));
      XLSX.utils.book_append_sheet(wb, dealWs, 'Recent Deals');

      XLSX.writeFile(wb, `nexcrm-report-${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Report exported');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const isAdmin = dbUser?.role === 'ADMIN' || dbUser?.role === 'MANAGER';
  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Business performance reports and data export."
        action={
          <Button onClick={handleExport} disabled={exporting || !data}>
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export Excel
          </Button>
        }
      />

      {/* KPIs */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Total Businesses" value={data.summary.totalBusinesses} icon={Building2} color="blue" />
            <StatCard title="Total Deals" value={data.summary.totalDeals} icon={Handshake} color="green" />
            <StatCard title="Total Revenue" value={formatCurrency(data.summary.totalRevenue)} icon={IndianRupee} color="purple" />
            <StatCard title="This Month" value={formatCurrency(data.summary.monthlyRevenue)} icon={TrendingUp} color="orange" />
          </div>

          {/* Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Status Breakdown Pie */}
            <Card>
              <CardHeader><CardTitle className="text-base">Status Breakdown</CardTitle></CardHeader>
              <CardContent>
                {data.statusBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={data.statusBreakdown.map((s) => ({ name: formatLabel(s.status), value: s.count }))}
                        cx="50%" cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {data.statusBreakdown.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Category Breakdown Bar */}
            <Card>
              <CardHeader><CardTitle className="text-base">Categories</CardTitle></CardHeader>
              <CardContent>
                {data.categoryBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.categoryBreakdown.map((c) => ({ name: formatLabel(c.category), count: c.count }))}>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Team Performance */}
          {data.teamPerformance.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Team Performance</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 pr-4 font-medium">Name</th>
                        <th className="pb-2 pr-4 font-medium">Role</th>
                        <th className="pb-2 pr-4 font-medium text-right">Businesses</th>
                        <th className="pb-2 pr-4 font-medium text-right">Activities</th>
                        <th className="pb-2 pr-4 font-medium text-right">Deals</th>
                        <th className="pb-2 font-medium text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.teamPerformance.sort((a, b) => b.revenue - a.revenue).map((t) => (
                        <tr key={t.name} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-medium">{t.name}</td>
                          <td className="py-2 pr-4">{t.role}</td>
                          <td className="py-2 pr-4 text-right">{t.businesses}</td>
                          <td className="py-2 pr-4 text-right">{t.activities}</td>
                          <td className="py-2 pr-4 text-right">{t.deals}</td>
                          <td className="py-2 text-right font-medium">{formatCurrency(t.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Deals */}
          {data.recentDeals.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Recent Deals</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 pr-4 font-medium">Business</th>
                        <th className="pb-2 pr-4 font-medium">Service</th>
                        <th className="pb-2 pr-4 font-medium text-right">Amount</th>
                        <th className="pb-2 pr-4 font-medium">Payment</th>
                        <th className="pb-2 pr-4 font-medium">Closed By</th>
                        <th className="pb-2 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentDeals.map((d) => (
                        <tr key={d.id} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-medium">{d.business}</td>
                          <td className="py-2 pr-4">{formatLabel(d.service)}</td>
                          <td className="py-2 pr-4 text-right">{formatCurrency(d.amount)}</td>
                          <td className="py-2 pr-4">{formatLabel(d.paymentStatus)}</td>
                          <td className="py-2 pr-4">{d.user}</td>
                          <td className="py-2">{new Date(d.signedDate).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center text-center">
              <FileBarChart className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Failed to load report data.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
