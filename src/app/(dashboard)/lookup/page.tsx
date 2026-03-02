'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  Search,
  Loader2,
  Building2,
  Phone,
  MessageSquare,
  MapPin,
  IndianRupee,
  Handshake,
  Copy,
  QrCode,
  Calendar,
  User,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge, PaymentBadge } from '@/components/shared/status-badge';
import { formatCurrency, formatDate, generateWhatsAppLink } from '@/lib/utils';
import type { BusinessStatus, PaymentStatus } from '@prisma/client';

interface LookupDeal {
  id: string;
  service: string;
  amount: number;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  signedDate: string | null;
  renewalDate: string | null;
  renewalStatus: string;
  notes: string | null;
  user: { id: string; name: string };
}

interface LookupActivity {
  id: string;
  type: string;
  outcome: string;
  remark: string;
  createdAt: string;
  user: { id: string; name: string };
}

interface LookupBusiness {
  id: string;
  familyId: string;
  businessName: string;
  ownerName: string;
  phone: string;
  alternatePhone: string | null;
  category: string;
  address: string | null;
  status: BusinessStatus;
  priority: string;
  createdAt: string;
  city: { id: string; name: string; state: string };
  area: { id: string; name: string } | null;
  createdBy: { id: string; name: string };
  deals: LookupDeal[];
  activities: LookupActivity[];
}

interface LookupSummary {
  totalDeals: number;
  totalRevenue: number;
  totalPaid: number;
  outstanding: number;
  services: string[];
  activeRenewals: number;
}

function formatServiceLabel(service: string): string {
  const labels: Record<string, string> = {
    WEBSITE: 'Website',
    GBP: 'Google Business Profile',
    ERP: 'ERP',
    SOCIAL_MEDIA: 'Social Media',
    SEO: 'SEO',
    LOGO_BRANDING: 'Logo & Branding',
  };
  return labels[service] ?? service;
}

function formatActivityType(type: string): string {
  return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function LookupPage() {
  const searchParams = useSearchParams();
  const [familyId, setFamilyId] = useState(searchParams.get('q') ?? '');
  const [loading, setLoading] = useState(false);
  const [business, setBusiness] = useState<LookupBusiness | null>(null);
  const [summary, setSummary] = useState<LookupSummary | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const doLookup = useCallback(async (query: string) => {
    if (!query) return;
    setLoading(true);
    setNotFound(false);
    setBusiness(null);
    setSummary(null);

    try {
      const res = await fetch(`/api/lookup?familyId=${encodeURIComponent(query)}`);
      const json = await res.json();

      if (json.success) {
        setBusiness(json.data.business);
        setSummary(json.data.summary);
      } else {
        setNotFound(true);
      }
    } catch {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-search from URL param
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setFamilyId(q.toUpperCase());
      doLookup(q.toUpperCase());
    }
  }, [searchParams, doLookup]);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const query = familyId.trim().toUpperCase();
    if (!query) {
      toast.error('Please enter a Family ID');
      return;
    }
    doLookup(query);
  };

  const copyFamilyId = async () => {
    if (!business?.familyId) return;
    await navigator.clipboard.writeText(business.familyId);
    toast.success('Family ID copied');
  };

  // Generate QR code SVG as a simple data URL using a public API
  const qrUrl = business?.familyId
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(business.familyId)}`
    : '';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client Lookup"
        description="Search by Family ID to view complete client history, services, and deals."
      />

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter Family ID (e.g. KA-SHM-GPL-SAL-00001)"
                value={familyId}
                onChange={(e) => setFamilyId(e.target.value.toUpperCase())}
                className="pl-10 text-lg font-mono tracking-wider"
              />
            </div>
            <Button type="submit" disabled={loading} size="lg">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              {loading ? 'Searching...' : 'Lookup'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Not Found */}
      {notFound && (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">No client found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              No business matches the Family ID &quot;{familyId.trim().toUpperCase()}&quot;
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {business && summary && (
        <>
          {/* Client Header Card */}
          <Card className="border-primary/20">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold">{business.businessName}</h2>
                    <StatusBadge status={business.status} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-sm tracking-wider px-3 py-1">
                      {business.familyId}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyFamilyId}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowQR(true)}>
                      <QrCode className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" /> {business.ownerName}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {business.city.name}{business.area ? `, ${business.area.name}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <a href={`tel:${business.phone}`} className="text-sm text-primary hover:underline flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" /> {business.phone}
                    </a>
                    <a
                      href={generateWhatsAppLink(business.phone, `Hi ${business.ownerName}, this is from TheNextURL regarding your account ${business.familyId}.`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 hover:text-green-700"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </a>
                  </div>
                </div>
                <Link href={`/businesses/${business.id}`}>
                  <Button variant="outline">View Full Profile</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <Handshake className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{summary.totalDeals}</p>
                    <p className="text-xs text-muted-foreground">Total Deals</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <IndianRupee className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</p>
                    <p className="text-xs text-muted-foreground">Total Revenue</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <IndianRupee className="h-8 w-8 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(summary.outstanding)}</p>
                    <p className="text-xs text-muted-foreground">Outstanding</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-8 w-8 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold">{summary.activeRenewals}</p>
                    <p className="text-xs text-muted-foreground">Pending Renewals</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Services Provided */}
          {summary.services.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Services Provided</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {summary.services.map((svc) => (
                    <Badge key={svc} variant="secondary" className="px-3 py-1">
                      {formatServiceLabel(svc)}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Deals History */}
          <Card>
            <CardHeader><CardTitle className="text-base">Deal History</CardTitle></CardHeader>
            <CardContent>
              {business.deals.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No deals yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 pr-3 font-medium">Service</th>
                        <th className="pb-2 pr-3 font-medium text-right">Amount</th>
                        <th className="pb-2 pr-3 font-medium text-right">Paid</th>
                        <th className="pb-2 pr-3 font-medium">Payment</th>
                        <th className="pb-2 pr-3 font-medium">Signed</th>
                        <th className="pb-2 pr-3 font-medium">Renewal</th>
                        <th className="pb-2 font-medium">Closed By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {business.deals.map((deal) => (
                        <tr key={deal.id} className="border-b last:border-0">
                          <td className="py-2.5 pr-3 font-medium">{formatServiceLabel(deal.service)}</td>
                          <td className="py-2.5 pr-3 text-right">{formatCurrency(deal.amount)}</td>
                          <td className="py-2.5 pr-3 text-right">{formatCurrency(deal.paidAmount)}</td>
                          <td className="py-2.5 pr-3"><PaymentBadge status={deal.paymentStatus} /></td>
                          <td className="py-2.5 pr-3">{deal.signedDate ? formatDate(deal.signedDate) : '-'}</td>
                          <td className="py-2.5 pr-3">
                            {deal.renewalDate ? (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(deal.renewalDate)}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="py-2.5">{deal.user.name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
            <CardContent>
              {business.activities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No activity recorded.</p>
              ) : (
                <div className="space-y-3">
                  {business.activities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 border-b pb-3 last:border-0 last:pb-0">
                      <Badge variant="outline">{formatActivityType(activity.type)}</Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{activity.remark}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">by {activity.user.name}</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(activity.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* QR Code Dialog */}
          <Dialog open={showQR} onOpenChange={setShowQR}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>QR Code - {business.familyId}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrUrl} alt={`QR Code for ${business.familyId}`} width={200} height={200} className="rounded-lg border" />
                <div className="text-center">
                  <p className="font-mono text-lg font-bold tracking-wider">{business.familyId}</p>
                  <p className="text-sm text-muted-foreground">{business.businessName}</p>
                  <p className="text-xs text-muted-foreground">{business.ownerName} - {business.city.name}</p>
                </div>
                <Separator />
                <p className="text-xs text-muted-foreground text-center">
                  Print this QR and give it to the client. They can use it for future service requests, complaints, and renewals.
                </p>
                <Button onClick={() => window.print()}>Print QR Code</Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
