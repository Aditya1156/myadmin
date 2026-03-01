'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { useCurrentUser } from '@/hooks/use-current-user';
import { formatCurrency } from '@/lib/utils';
import {
  FileDown,
  Printer,
  Building2,
  Handshake,
  IndianRupee,
  TrendingUp,
} from 'lucide-react';

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
  serviceBreakdown: { service: string; count: number; revenue: number }[];
  teamPerformance: {
    name: string;
    role: string;
    businesses: number;
    activities: number;
    deals: number;
    revenue: number;
  }[];
  renewalStats: { status: string; count: number }[];
  recentDeals: {
    id: string;
    service: string;
    amount: number;
    paymentStatus: string;
    signedDate: string;
    business: { businessName: string; ownerName: string };
    user: { name: string };
  }[];
}

function formatLabel(str: string) {
  return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ReportsPage() {
  const { dbUser, loading: userLoading } = useCurrentUser();
  const router = useRouter();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userLoading && dbUser && dbUser.role === 'SALES') {
      router.push('/dashboard');
    }
  }, [dbUser, userLoading, router]);

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch('/api/reports');
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch {
        toast.error('Failed to load report data');
      } finally {
        setLoading(false);
      }
    }
    if (dbUser && (dbUser.role === 'ADMIN' || dbUser.role === 'MANAGER')) {
      fetchReport();
    }
  }, [dbUser]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryWs = XLSX.utils.json_to_sheet([data.summary]);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

    // Status breakdown
    const statusWs = XLSX.utils.json_to_sheet(data.statusBreakdown);
    XLSX.utils.book_append_sheet(wb, statusWs, 'Status Breakdown');

    // Category breakdown
    const catWs = XLSX.utils.json_to_sheet(data.categoryBreakdown);
    XLSX.utils.book_append_sheet(wb, catWs, 'Category Breakdown');

    // Services
    const svcWs = XLSX.utils.json_to_sheet(data.serviceBreakdown);
    XLSX.utils.book_append_sheet(wb, svcWs, 'Service Revenue');

    // Team performance
    const teamWs = XLSX.utils.json_to_sheet(data.teamPerformance);
    XLSX.utils.book_append_sheet(wb, teamWs, 'Team Performance');

    // Recent deals
    const dealsWs = XLSX.utils.json_to_sheet(
      data.recentDeals.map((d) => ({
        Business: d.business.businessName,
        Owner: d.business.ownerName,
        Service: d.service,
        Amount: d.amount,
        Payment: d.paymentStatus,
        'Signed Date': d.signedDate,
        'Sales Rep': d.user.name,
      }))
    );
    XLSX.utils.book_append_sheet(wb, dealsWs, 'Recent Deals');

    XLSX.writeFile(wb, `nexcrm-report-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Report exported');
  };

  if (userLoading || dbUser?.role === 'SALES') {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Generate and export comprehensive CRM reports."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint} className="print:hidden">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button onClick={handleExportExcel} disabled={!data} className="print:hidden">
              <FileDown className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : data ? (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Total Businesses" value={data.summary.totalBusinesses} icon={Building2} color="blue" />
            <StatCard title="Total Deals" value={data.summary.totalDeals} icon={Handshake} color="green" />
            <StatCard title="Total Revenue" value={formatCurrency(data.summary.totalRevenue)} icon={IndianRupee} color="purple" />
            <StatCard title="Monthly Revenue" value={formatCurrency(data.summary.monthlyRevenue)} icon={TrendingUp} color="orange" />
          </div>

          {/* Status & Category */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Business Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.statusBreakdown.map((s) => (
                    <div key={s.status} className="flex items-center justify-between text-sm">
                      <span>{formatLabel(s.status)}</span>
                      <Badge variant="secondary">{s.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Category Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.categoryBreakdown.map((c) => (
                    <div key={c.category} className="flex items-center justify-between text-sm">
                      <span>{formatLabel(c.category)}</span>
                      <Badge variant="secondary">{c.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Service Revenue */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Service Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium">Service</th>
                      <th className="text-right py-2 font-medium">Deals</th>
                      <th className="text-right py-2 font-medium">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.serviceBreakdown.map((s) => (
                      <tr key={s.service} className="border-b last:border-0">
                        <td className="py-2">{formatLabel(s.service)}</td>
                        <td className="py-2 text-right">{s.count}</td>
                        <td className="py-2 text-right font-medium">{formatCurrency(s.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Team Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Team Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium">Name</th>
                      <th className="text-left py-2 font-medium">Role</th>
                      <th className="text-right py-2 font-medium">Businesses</th>
                      <th className="text-right py-2 font-medium">Activities</th>
                      <th className="text-right py-2 font-medium">Deals</th>
                      <th className="text-right py-2 font-medium">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.teamPerformance.map((t) => (
                      <tr key={t.name} className="border-b last:border-0">
                        <td className="py-2 font-medium">{t.name}</td>
                        <td className="py-2">
                          <Badge variant="secondary">{t.role}</Badge>
                        </td>
                        <td className="py-2 text-right">{t.businesses}</td>
                        <td className="py-2 text-right">{t.activities}</td>
                        <td className="py-2 text-right">{t.deals}</td>
                        <td className="py-2 text-right font-medium">{formatCurrency(t.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Recent Deals */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Deals (Last 20)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium">Business</th>
                      <th className="text-left py-2 font-medium">Service</th>
                      <th className="text-right py-2 font-medium">Amount</th>
                      <th className="text-left py-2 font-medium">Payment</th>
                      <th className="text-left py-2 font-medium">Sales Rep</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentDeals.map((d) => (
                      <tr key={d.id} className="border-b last:border-0">
                        <td className="py-2">
                          <div>
                            <p className="font-medium">{d.business.businessName}</p>
                            <p className="text-xs text-muted-foreground">{d.business.ownerName}</p>
                          </div>
                        </td>
                        <td className="py-2">{formatLabel(d.service)}</td>
                        <td className="py-2 text-right font-medium">{formatCurrency(d.amount)}</td>
                        <td className="py-2">
                          <Badge variant={d.paymentStatus === 'PAID' ? 'default' : 'secondary'}>
                            {d.paymentStatus}
                          </Badge>
                        </td>
                        <td className="py-2">{d.user.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Renewal Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Renewal Status Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {data.renewalStats.map((r) => (
                  <div key={r.status} className="flex items-center gap-2 rounded-lg border px-4 py-2">
                    <span className="text-sm">{formatLabel(r.status)}</span>
                    <Badge variant="secondary">{r.count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <p className="text-muted-foreground">No data available.</p>
      )}
    </div>
  );
}
