'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { RenewalStatusBadge } from '@/components/shared/renewal-status-badge';
import {
  Phone,
  MessageSquare,
  RefreshCw,
  AlertTriangle,
  CalendarDays,
  Clock,
  PartyPopper,
  MapPin,
  IndianRupee,
} from 'lucide-react';
import { formatDate, formatCurrency, generateWhatsAppLink } from '@/lib/utils';
import { SERVICE_TYPES } from '@/lib/constants';

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

interface RenewalDeal {
  id: string;
  service: string;
  amount: number;
  signedDate: string;
  renewalDate: string | null;
  renewalStatus: string;
  renewalNotes: string | null;
  contractDurationMonths: number;
  paymentStatus: string;
  parentDealId: string | null;
  daysUntilRenewal: number | null;
  business: {
    id: string;
    businessName: string;
    ownerName: string;
    phone: string;
    category: string;
    city: { id: string; name: string };
    area: { id: string; name: string } | null;
  };
  user: { id: string; name: string };
}

// ────────────────────────────────────────────────────────────────
// Renewal Card
// ────────────────────────────────────────────────────────────────

function RenewalCard({
  deal,
  isOverdue,
  onStatusChange,
}: {
  deal: RenewalDeal;
  isOverdue?: boolean;
  onStatusChange: () => void;
}) {
  const [updating, setUpdating] = useState(false);
  const [showRenewDialog, setShowRenewDialog] = useState(false);
  const [renewAmount, setRenewAmount] = useState(deal.amount.toString());
  const [renewMonths, setRenewMonths] = useState('12');
  const [renewLoading, setRenewLoading] = useState(false);

  const serviceLabel =
    SERVICE_TYPES.find((s) => s.value === deal.service)?.label ?? deal.service;

  const daysText =
    deal.daysUntilRenewal !== null
      ? deal.daysUntilRenewal < 0
        ? `${Math.abs(deal.daysUntilRenewal)}d overdue`
        : deal.daysUntilRenewal === 0
          ? 'Due today'
          : `${deal.daysUntilRenewal}d remaining`
      : '';

  async function updateStatus(status: 'CONTACTED' | 'CHURNED') {
    setUpdating(true);
    try {
      const res = await fetch(`/api/deals/${deal.id}/renewal-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ renewalStatus: status }),
      });
      if (!res.ok) throw new Error('Failed to update');
      toast.success(`Marked as ${status.toLowerCase()}`);
      onStatusChange();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  }

  async function handleRenew() {
    const amount = parseFloat(renewAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    setRenewLoading(true);
    try {
      const res = await fetch(`/api/deals/${deal.id}/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          contractDurationMonths: parseInt(renewMonths, 10) || 12,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to renew');
      }
      toast.success('Deal renewed successfully!');
      setShowRenewDialog(false);
      onStatusChange();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to renew');
    } finally {
      setRenewLoading(false);
    }
  }

  return (
    <>
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href={`/businesses/${deal.business.id}`}
                  className="font-semibold hover:underline truncate"
                >
                  {deal.business.businessName}
                </Link>
                <Badge variant="outline">{serviceLabel}</Badge>
                <RenewalStatusBadge status={deal.renewalStatus} />
                {isOverdue && deal.daysUntilRenewal !== null && deal.daysUntilRenewal < 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {daysText}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {deal.business.ownerName} &middot;{' '}
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {deal.business.city.name}
                  {deal.business.area && `, ${deal.business.area.name}`}
                </span>
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <IndianRupee className="h-3 w-3" />
                  {formatCurrency(deal.amount)}
                </span>
                <span>Signed: {formatDate(deal.signedDate)}</span>
                {deal.renewalDate && (
                  <span className="font-medium">
                    Renewal: {formatDate(deal.renewalDate)}
                    {!isOverdue && daysText && ` (${daysText})`}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <a href={`tel:${deal.business.phone}`}>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Phone className="h-3.5 w-3.5" />
                </Button>
              </a>
              <a
                href={generateWhatsAppLink(
                  deal.business.phone,
                  `Hi ${deal.business.ownerName}, your ${serviceLabel} service for ${deal.business.businessName} is coming up for renewal. Would you like to discuss?`
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <MessageSquare className="h-3.5 w-3.5" />
                </Button>
              </a>
              {deal.renewalStatus === 'PENDING' && (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={updating}
                  onClick={() => updateStatus('CONTACTED')}
                >
                  Mark Contacted
                </Button>
              )}
              <Button
                size="sm"
                variant="default"
                onClick={() => setShowRenewDialog(true)}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Renew
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={updating}
                onClick={() => updateStatus('CHURNED')}
              >
                Churned
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Renew Dialog */}
      <Dialog open={showRenewDialog} onOpenChange={setShowRenewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Renew {serviceLabel} for {deal.business.businessName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Renewal Amount</Label>
              <Input
                type="number"
                min="1"
                value={renewAmount}
                onChange={(e) => setRenewAmount(e.target.value)}
                placeholder="Enter renewal amount"
              />
            </div>
            <div className="space-y-2">
              <Label>Contract Duration (months)</Label>
              <Input
                type="number"
                min="1"
                max="60"
                value={renewMonths}
                onChange={(e) => setRenewMonths(e.target.value)}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Previous deal: {formatCurrency(deal.amount)} ({deal.contractDurationMonths} months)
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowRenewDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleRenew} disabled={renewLoading}>
                {renewLoading ? 'Renewing...' : 'Create Renewal Deal'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ────────────────────────────────────────────────────────────────
// Renewals Page
// ────────────────────────────────────────────────────────────────

export default function RenewalsPage() {
  const [activeTab, setActiveTab] = useState('due_this_month');
  const [data, setData] = useState<Record<string, RenewalDeal[]>>({
    due_this_month: [],
    overdue: [],
    upcoming: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchRenewals = useCallback(async () => {
    setLoading(true);
    try {
      const [dueRes, overdueRes, upcomingRes] = await Promise.all([
        fetch('/api/renewals?type=due_this_month'),
        fetch('/api/renewals?type=overdue'),
        fetch('/api/renewals?type=upcoming'),
      ]);

      const [dueJson, overdueJson, upcomingJson] = await Promise.all([
        dueRes.json(),
        overdueRes.json(),
        upcomingRes.json(),
      ]);

      setData({
        due_this_month: dueJson.data ?? [],
        overdue: overdueJson.data ?? [],
        upcoming: upcomingJson.data ?? [],
      });
    } catch {
      toast.error('Failed to load renewals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRenewals();
  }, [fetchRenewals]);

  const renderList = (items: RenewalDeal[], isOverdue = false) => {
    if (loading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-4 w-64 mb-1" />
                <Skeleton className="h-3 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <EmptyState
          icon={isOverdue ? AlertTriangle : PartyPopper}
          title={isOverdue ? 'No overdue renewals' : 'No renewals here'}
          description={
            isOverdue
              ? 'Great! No overdue renewals to worry about.'
              : 'No renewals scheduled for this period.'
          }
        />
      );
    }

    return (
      <div className="space-y-3">
        {items.map((deal) => (
          <RenewalCard
            key={deal.id}
            deal={deal}
            isOverdue={isOverdue}
            onStatusChange={fetchRenewals}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Renewals"
        description="Track service renewals and contact businesses for re-engagement."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="due_this_month" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            Due This Month
            {data.due_this_month.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {data.due_this_month.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="overdue" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Overdue
            {data.overdue.length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {data.overdue.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="gap-2">
            <Clock className="h-4 w-4" />
            Upcoming
            {data.upcoming.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {data.upcoming.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="due_this_month" className="mt-4">
          {renderList(data.due_this_month)}
        </TabsContent>
        <TabsContent value="overdue" className="mt-4">
          {renderList(data.overdue, true)}
        </TabsContent>
        <TabsContent value="upcoming" className="mt-4">
          {renderList(data.upcoming)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
