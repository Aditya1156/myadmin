'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  Copy,
  Globe,
  MapPin,
  ExternalLink,
  Plus,
  Trash2,
  Pencil,
  ChevronUp,
  Calendar,
  Clock,
  User,
  Building2,
  AlertTriangle,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  StatusBadge,
  PriorityBadge,
  OutcomeBadge,
  PaymentBadge,
} from '@/components/shared/status-badge';
import { RenewalStatusBadge } from '@/components/shared/renewal-status-badge';
import { PageHeader } from '@/components/shared/page-header';
import {
  CreateActivitySchema,
  CreateDealSchema,
  type CreateActivityInput,
  type CreateDealInput,
} from '@/lib/validations';
import {
  ACTIVITY_TYPES,
  ACTIVITY_OUTCOMES,
  SERVICE_TYPES,
  PAYMENT_STATUSES,
  BUSINESS_STATUSES,
  BUSINESS_CATEGORIES,
  WHATSAPP_TEMPLATES,
} from '@/lib/constants';
import {
  formatCurrency,
  formatDate,
  formatRelativeTime,
  generateWhatsAppLink,
  cn,
} from '@/lib/utils';
import type {
  BusinessStatus,
  Priority,
  ActivityOutcome,
  ActivityType,
  ServiceType,
  PaymentStatus,
} from '@prisma/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BusinessUser {
  id: string;
  name: string;
  email?: string;
}

interface Activity {
  id: string;
  type: ActivityType;
  outcome: ActivityOutcome;
  remark: string;
  nextFollowUpDate: string | null;
  createdAt: string;
  user: BusinessUser;
}

interface Deal {
  id: string;
  service: ServiceType;
  amount: number;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  signedDate: string | null;
  deliveryDate: string | null;
  invoiceNumber: string | null;
  notes: string | null;
  createdAt: string;
  contractDurationMonths: number;
  renewalDate: string | null;
  renewalStatus: string;
  renewalNotes: string | null;
  parentDealId: string | null;
  parentDeal?: { id: string; service: string; signedDate: string; amount: number } | null;
  renewedDeals?: { id: string; service: string; signedDate: string; amount: number; renewalStatus: string }[];
  user: BusinessUser;
}

interface Business {
  id: string;
  familyId: string | null;
  businessName: string;
  ownerName: string;
  phone: string;
  alternatePhone: string | null;
  category: string;
  address: string | null;
  googleMapsLink: string | null;
  hasWebsite: boolean;
  existingWebsite: string | null;
  hasGBP: boolean;
  services: ServiceType[];
  priority: Priority;
  status: BusinessStatus;
  visitType: string | null;
  followUpDate: string | null;
  failureReason: string | null;
  estimatedValue: number | null;
  notes: string | null;
  mistakeNotes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  cityId: string;
  areaId: string | null;
  createdById: string;
  city: { id: string; name: string; state?: string };
  area: { id: string; name: string } | null;
  createdBy: BusinessUser;
  activities: Activity[];
  deals: Deal[];
  _count: { activities: number; deals: number };
}

// ---------------------------------------------------------------------------
// Helper: activity type icon label
// ---------------------------------------------------------------------------

function getActivityIcon(type: ActivityType) {
  const map: Record<ActivityType, string> = {
    CALL: 'Phone Call',
    VISIT: 'In-Person Visit',
    FOLLOW_UP: 'Follow Up',
    WHATSAPP: 'WhatsApp',
    EMAIL: 'Email',
    DEMO: 'Demo',
  };
  return map[type] ?? type;
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function BusinessDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-9" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 grid gap-4 md:grid-cols-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-32" />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function BusinessDetailPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.id as string;

  const [business, setBusiness] = useState<Business | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityFormOpen, setActivityFormOpen] = useState(false);
  const [dealDialogOpen, setDealDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  const fetchBusiness = useCallback(async () => {
    try {
      const res = await fetch(`/api/businesses/${businessId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setBusiness(json.data);
      setActivities(json.data.activities ?? []);
      setDeals(json.data.deals ?? []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load business');
      router.push('/businesses');
    } finally {
      setLoading(false);
    }
  }, [businessId, router]);

  const fetchActivities = useCallback(async () => {
    try {
      const res = await fetch(`/api/activities?businessId=${businessId}`);
      const json = await res.json();
      if (json.success) setActivities(json.data);
    } catch {
      // silently fail; data already populated from initial load
    }
  }, [businessId]);

  const fetchDeals = useCallback(async () => {
    try {
      const res = await fetch(`/api/deals?businessId=${businessId}`);
      const json = await res.json();
      if (json.success) setDeals(json.data);
    } catch {
      // silently fail
    }
  }, [businessId]);

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  // -----------------------------------------------------------------------
  // Quick status change
  // -----------------------------------------------------------------------

  async function handleStatusChange(newStatus: string) {
    if (!business) return;
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setBusiness((prev) => (prev ? { ...prev, status: newStatus as BusinessStatus } : prev));
      toast.success('Status updated');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setStatusUpdating(false);
    }
  }

  // -----------------------------------------------------------------------
  // Copy phone
  // -----------------------------------------------------------------------

  async function copyPhone() {
    if (!business) return;
    try {
      await navigator.clipboard.writeText(business.phone);
      toast.success('Phone number copied');
    } catch {
      toast.error('Failed to copy');
    }
  }

  // -----------------------------------------------------------------------
  // Delete deal
  // -----------------------------------------------------------------------

  async function handleDeleteDeal(dealId: string) {
    if (!confirm('Are you sure you want to delete this deal?')) return;
    try {
      const res = await fetch(`/api/deals/${dealId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success('Deal deleted');
      fetchDeals();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete deal');
    }
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <BusinessDetailSkeleton />
      </div>
    );
  }

  if (!business) return null;

  const categoryLabel =
    BUSINESS_CATEGORIES.find((c) => c.value === business.category)?.label ?? business.category;

  const lastActivity = activities.length > 0 ? activities[0] : null;
  const daysSinceLastContact = lastActivity
    ? Math.floor(
        (Date.now() - new Date(lastActivity.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      )
    : null;

  // Deal aggregates
  const totalDealCount = deals.length;
  const totalRevenue = deals.reduce((sum, d) => sum + d.amount, 0);
  const totalPaid = deals.reduce((sum, d) => sum + d.paidAmount, 0);
  const outstanding = totalRevenue - totalPaid;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Link href="/businesses">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <PageHeader
          title={business.businessName}
          description={`${business.ownerName} - ${business.city.name}${business.area ? `, ${business.area.name}` : ''}`}
          action={
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/businesses/${business.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </Link>
              {/* Quick status dropdown */}
              <Select
                value={business.status}
                onValueChange={handleStatusChange}
                disabled={statusUpdating}
              >
                <SelectTrigger className="w-[180px] h-8 text-sm">
                  <SelectValue placeholder="Change status" />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* ============================================================= */}
        {/* LEFT COLUMN */}
        {/* ============================================================= */}
        <div className="space-y-6">
          {/* ---- Business Info Card ---- */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Business Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
                {/* Business Name */}
                <div className="md:col-span-2">
                  <p className="text-xs text-muted-foreground">Business Name</p>
                  <p className="text-xl font-semibold">{business.businessName}</p>
                </div>

                {/* Family ID */}
                {business.familyId && (
                  <div className="md:col-span-2">
                    <p className="text-xs text-muted-foreground">Family ID</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="font-mono text-sm tracking-wider px-3 py-1">
                        {business.familyId}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={async () => {
                          await navigator.clipboard.writeText(business.familyId!);
                          toast.success('Family ID copied');
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Link href={`/lookup?q=${business.familyId}`}>
                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                          Lookup
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

                {/* Owner */}
                <div>
                  <p className="text-xs text-muted-foreground">Owner Name</p>
                  <p className="font-medium">{business.ownerName}</p>
                </div>

                {/* Phone */}
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <a
                    href={`tel:${business.phone}`}
                    className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {business.phone}
                  </a>
                </div>

                {/* Alt Phone */}
                {business.alternatePhone && (
                  <div>
                    <p className="text-xs text-muted-foreground">Alternate Phone</p>
                    <a
                      href={`tel:${business.alternatePhone}`}
                      className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {business.alternatePhone}
                    </a>
                  </div>
                )}

                {/* Category */}
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <Badge variant="secondary" className="mt-1">
                    {categoryLabel}
                  </Badge>
                </div>

                {/* City / Area */}
                <div>
                  <p className="text-xs text-muted-foreground">City / Area</p>
                  <p className="font-medium">
                    {business.city.name}
                    {business.area ? ` - ${business.area.name}` : ''}
                  </p>
                </div>

                {/* Address */}
                {business.address && (
                  <div className="md:col-span-2">
                    <p className="text-xs text-muted-foreground">Address</p>
                    <p className="font-medium">{business.address}</p>
                  </div>
                )}

                {/* Google Maps */}
                {business.googleMapsLink && (
                  <div>
                    <p className="text-xs text-muted-foreground">Google Maps</p>
                    <a
                      href={business.googleMapsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      View on Maps
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {/* Has Website */}
                <div>
                  <p className="text-xs text-muted-foreground">Has Website</p>
                  <Badge
                    variant={business.hasWebsite ? 'default' : 'secondary'}
                    className="mt-1"
                  >
                    {business.hasWebsite ? 'Yes' : 'No'}
                  </Badge>
                  {business.hasWebsite && business.existingWebsite && (
                    <a
                      href={business.existingWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <Globe className="h-3 w-3" />
                      Visit
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                {/* Has GBP */}
                <div>
                  <p className="text-xs text-muted-foreground">Has GBP</p>
                  <Badge
                    variant={business.hasGBP ? 'default' : 'secondary'}
                    className="mt-1"
                  >
                    {business.hasGBP ? 'Yes' : 'No'}
                  </Badge>
                </div>

                {/* Services */}
                <div className="md:col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Services</p>
                  <div className="flex flex-wrap gap-1.5">
                    {business.services.map((svc) => {
                      const svcDef = SERVICE_TYPES.find((s) => s.value === svc);
                      return (
                        <Badge
                          key={svc}
                          variant="outline"
                          className="text-xs"
                        >
                          {svcDef?.label ?? svc}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                <Separator className="md:col-span-2" />

                {/* Status */}
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <div className="mt-1">
                    <StatusBadge status={business.status} />
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <p className="text-xs text-muted-foreground">Priority</p>
                  <div className="mt-1">
                    <PriorityBadge priority={business.priority} />
                  </div>
                </div>

                {/* Estimated Value */}
                {business.estimatedValue != null && business.estimatedValue > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground">Estimated Value</p>
                    <p className="font-semibold text-green-700 dark:text-green-400">
                      {formatCurrency(business.estimatedValue)}
                    </p>
                  </div>
                )}

                {/* Follow-up Date */}
                {business.followUpDate && (
                  <div>
                    <p className="text-xs text-muted-foreground">Follow-up Date</p>
                    <p className="font-medium">{formatDate(business.followUpDate)}</p>
                  </div>
                )}

                {/* Notes */}
                {business.notes && (
                  <div className="md:col-span-2">
                    <p className="text-xs text-muted-foreground">Notes</p>
                    <p className="text-sm whitespace-pre-line">{business.notes}</p>
                  </div>
                )}

                {/* Mistake Notes (only for CLOSED_LOST) */}
                {business.status === 'CLOSED_LOST' && business.mistakeNotes && (
                  <div className="md:col-span-2">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-red-500" />
                      Mistake Notes
                    </p>
                    <p className="text-sm whitespace-pre-line text-red-700 dark:text-red-400">
                      {business.mistakeNotes}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ---- Activity Timeline ---- */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg">Activity Timeline</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActivityFormOpen((v) => !v)}
              >
                {activityFormOpen ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Close
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1" />
                    Log Activity
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Inline log activity form */}
              {activityFormOpen && (
                <LogActivityForm
                  businessId={businessId}
                  onSuccess={() => {
                    setActivityFormOpen(false);
                    fetchActivities();
                    fetchBusiness();
                  }}
                />
              )}

              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No activities logged yet.
                </p>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex gap-3 p-3 rounded-lg border bg-card"
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            <ActivityIcon type={activity.type} />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">
                              {getActivityIcon(activity.type)}
                            </span>
                            <OutcomeBadge outcome={activity.outcome} />
                          </div>
                          {activity.remark && (
                            <p className="text-sm text-muted-foreground whitespace-pre-line">
                              {activity.remark}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {activity.user.name}
                            </span>
                            <span>{formatRelativeTime(activity.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* ---- Deals Section ---- */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg">Deals</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingDeal(null);
                  setDealDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Deal
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Running totals */}
              {totalDealCount > 0 && (
                <div className="grid grid-cols-3 gap-4 p-3 rounded-lg bg-muted/50">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Total Deals</p>
                    <p className="text-lg font-bold">{totalDealCount}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Total Revenue</p>
                    <p className="text-lg font-bold text-green-700 dark:text-green-400">
                      {formatCurrency(totalRevenue)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Outstanding</p>
                    <p
                      className={cn(
                        'text-lg font-bold',
                        outstanding > 0
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-green-700 dark:text-green-400'
                      )}
                    >
                      {formatCurrency(outstanding)}
                    </p>
                  </div>
                </div>
              )}

              {deals.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No deals yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Service</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Signed</TableHead>
                        <TableHead>Renewal</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deals.map((deal) => {
                        const svcDef = SERVICE_TYPES.find(
                          (s) => s.value === deal.service
                        );
                        return (
                          <TableRow key={deal.id}>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {svcDef?.label ?? deal.service}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(deal.amount)}
                            </TableCell>
                            <TableCell>
                              <PaymentBadge status={deal.paymentStatus} />
                            </TableCell>
                            <TableCell>{formatCurrency(deal.paidAmount)}</TableCell>
                            <TableCell className="text-sm">
                              {deal.signedDate ? formatDate(deal.signedDate) : '-'}
                            </TableCell>
                            <TableCell>
                              {deal.renewalDate ? (
                                <div className="space-y-1">
                                  <span className="text-xs">{formatDate(deal.renewalDate)}</span>
                                  <div>
                                    <RenewalStatusBadge status={deal.renewalStatus} />
                                  </div>
                                </div>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => {
                                    setEditingDeal(deal);
                                    setDealDialogOpen(true);
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteDeal(deal.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ============================================================= */}
        {/* RIGHT COLUMN (Sidebar) */}
        {/* ============================================================= */}
        <div className="space-y-6">
          {/* ---- Contact Quick Actions ---- */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-start">
                <a href={`tel:${business.phone}`}>
                  <Phone className="h-4 w-4 mr-2 text-green-600" />
                  Call {business.ownerName}
                </a>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <a
                  href={generateWhatsAppLink(business.phone, '')}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageSquare className="h-4 w-4 mr-2 text-green-600" />
                  WhatsApp
                </a>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={copyPhone}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Phone Number
              </Button>
            </CardContent>
          </Card>

          {/* ---- Business Metadata ---- */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Created by</p>
                  <p className="font-medium">{business.createdBy.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Created at</p>
                  <p className="font-medium">{formatDate(business.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Last activity</p>
                  <p className="font-medium">
                    {lastActivity
                      ? formatDate(lastActivity.createdAt)
                      : 'No activities yet'}
                  </p>
                </div>
              </div>
              {daysSinceLastContact !== null && (
                <div className="flex items-center gap-2">
                  <AlertTriangle
                    className={cn(
                      'h-4 w-4',
                      daysSinceLastContact > 14
                        ? 'text-red-500'
                        : 'text-muted-foreground'
                    )}
                  />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Days since last contact
                    </p>
                    <p
                      className={cn(
                        'font-medium',
                        daysSinceLastContact > 14 && 'text-red-600 dark:text-red-400'
                      )}
                    >
                      {daysSinceLastContact} days
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ---- Service Renewals Panel ---- */}
          {deals.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Service Renewals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {deals
                    .filter((d) => d.renewalStatus !== 'NOT_APPLICABLE' && d.renewalDate)
                    .map((deal) => {
                      const svc = SERVICE_TYPES.find((s) => s.value === deal.service);
                      return (
                        <div
                          key={deal.id}
                          className="flex items-center justify-between p-2 rounded-lg border"
                        >
                          <div>
                            <Badge variant="outline" className="text-xs">
                              {svc?.label ?? deal.service}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {deal.renewalDate ? formatDate(deal.renewalDate) : 'N/A'}
                            </p>
                          </div>
                          <RenewalStatusBadge status={deal.renewalStatus} />
                        </div>
                      );
                    })}
                  {deals.filter((d) => d.renewalStatus !== 'NOT_APPLICABLE' && d.renewalDate).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      No active renewals
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ---- WhatsApp Templates Panel ---- */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">WhatsApp Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[350px]">
                <div className="space-y-2">
                  {WHATSAPP_TEMPLATES.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="flex items-center justify-between p-2 rounded-lg border"
                    >
                      <span className="text-sm font-medium truncate mr-2">
                        {tpl.label}
                      </span>
                      <Button asChild variant="outline" size="sm" className="shrink-0">
                        <a
                          href={generateWhatsAppLink(
                            business.phone,
                            tpl.message(business.ownerName, business.businessName)
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <MessageSquare className="h-3.5 w-3.5 mr-1" />
                          Send
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ---- Deal Dialog ---- */}
      <DealDialog
        open={dealDialogOpen}
        onOpenChange={setDealDialogOpen}
        businessId={businessId}
        deal={editingDeal}
        onSuccess={() => {
          setDealDialogOpen(false);
          setEditingDeal(null);
          fetchDeals();
          fetchBusiness();
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity Icon helper component
// ---------------------------------------------------------------------------

function ActivityIcon({ type }: { type: ActivityType }) {
  switch (type) {
    case 'CALL':
      return <Phone className="h-4 w-4 text-blue-600" />;
    case 'VISIT':
      return <MapPin className="h-4 w-4 text-purple-600" />;
    case 'FOLLOW_UP':
      return <Clock className="h-4 w-4 text-orange-600" />;
    case 'WHATSAPP':
      return <MessageSquare className="h-4 w-4 text-green-600" />;
    case 'EMAIL':
      return <Globe className="h-4 w-4 text-gray-600" />;
    case 'DEMO':
      return <Building2 className="h-4 w-4 text-indigo-600" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

// ---------------------------------------------------------------------------
// Log Activity Inline Form
// ---------------------------------------------------------------------------

function LogActivityForm({
  businessId,
  onSuccess,
}: {
  businessId: string;
  onSuccess: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CreateActivityInput>({
    resolver: zodResolver(CreateActivitySchema),
    defaultValues: {
      businessId,
      type: 'CALL',
      outcome: 'NEUTRAL',
      remark: '',
      nextFollowUpDate: '',
    },
  });

  async function onSubmit(data: CreateActivityInput) {
    setSubmitting(true);
    try {
      const payload = {
        ...data,
        nextFollowUpDate: data.nextFollowUpDate || undefined,
      };
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success('Activity logged');
      form.reset();
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to log activity');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ACTIVITY_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="outcome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Outcome</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select outcome" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ACTIVITY_OUTCOMES.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="remark"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Remark</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Add notes about this activity..."
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nextFollowUpDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Next Follow-up Date (optional)</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? 'Saving...' : 'Log Activity'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Deal Dialog (Add / Edit)
// ---------------------------------------------------------------------------

function DealDialog({
  open,
  onOpenChange,
  businessId,
  deal,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  businessId: string;
  deal: Deal | null;
  onSuccess: () => void;
}) {
  const isEditing = !!deal;
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CreateDealInput>({
    resolver: zodResolver(CreateDealSchema),
    defaultValues: {
      businessId,
      service: 'WEBSITE',
      amount: 0,
      paymentStatus: 'PENDING',
      paidAmount: 0,
      signedDate: '',
      deliveryDate: '',
      invoiceNumber: '',
      notes: '',
    },
  });

  // Reset form when dialog opens with edit data or fresh data
  useEffect(() => {
    if (open) {
      if (deal) {
        form.reset({
          businessId,
          service: deal.service,
          amount: deal.amount,
          paymentStatus: deal.paymentStatus,
          paidAmount: deal.paidAmount,
          signedDate: deal.signedDate
            ? new Date(deal.signedDate).toISOString().split('T')[0]
            : '',
          deliveryDate: deal.deliveryDate
            ? new Date(deal.deliveryDate).toISOString().split('T')[0]
            : '',
          invoiceNumber: deal.invoiceNumber ?? '',
          notes: deal.notes ?? '',
        });
      } else {
        form.reset({
          businessId,
          service: 'WEBSITE',
          amount: 0,
          paymentStatus: 'PENDING',
          paidAmount: 0,
          signedDate: '',
          deliveryDate: '',
          invoiceNumber: '',
          notes: '',
        });
      }
    }
  }, [open, deal, businessId, form]);

  async function onSubmit(data: CreateDealInput) {
    setSubmitting(true);
    try {
      const payload = {
        ...data,
        signedDate: data.signedDate || undefined,
        deliveryDate: data.deliveryDate || undefined,
        invoiceNumber: data.invoiceNumber || undefined,
        notes: data.notes || undefined,
      };

      let res: Response;
      if (isEditing) {
        // For edit, omit businessId and use PUT
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { businessId: _businessId, ...editPayload } = payload;
        res = await fetch(`/api/deals/${deal.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editPayload),
        });
      } else {
        res = await fetch('/api/deals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(isEditing ? 'Deal updated' : 'Deal created');
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save deal');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Deal' : 'Add Deal'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the deal details below.'
              : 'Fill in the deal details below.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="service"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SERVICE_TYPES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paidAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paid Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="paymentStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PAYMENT_STATUSES.map((ps) => (
                        <SelectItem key={ps.value} value={ps.value}>
                          {ps.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="signedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Signed Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deliveryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="invoiceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice Number</FormLabel>
                  <FormControl>
                    <Input placeholder="INV-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional notes about this deal..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? 'Saving...'
                  : isEditing
                    ? 'Update Deal'
                    : 'Create Deal'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
