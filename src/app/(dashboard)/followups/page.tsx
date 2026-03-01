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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { StatusBadge } from '@/components/shared/status-badge';
import {
  Phone,
  MessageSquare,
  Clock,
  AlertTriangle,
  CalendarDays,
  PartyPopper,
  MapPin,
} from 'lucide-react';
import { formatRelativeTime, generateWhatsAppLink } from '@/lib/utils';
import { ACTIVITY_TYPES, ACTIVITY_OUTCOMES } from '@/lib/constants';

interface FollowUpBusiness {
  id: string;
  businessName: string;
  ownerName: string;
  phone: string;
  status: string;
  category: string;
  followUpDate: string;
  city: { name: string };
  area: { name: string } | null;
  createdBy: { name: string };
  lastActivity?: {
    type: string;
    outcome: string;
    remark: string;
    createdAt: string;
  } | null;
}

function FollowUpCard({
  business,
  isOverdue,
  onActivityLogged,
}: {
  business: FollowUpBusiness;
  isOverdue?: boolean;
  onActivityLogged: () => void;
}) {
  const [showLogForm, setShowLogForm] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  const [activityType, setActivityType] = useState('CALL');
  const [outcome, setOutcome] = useState('NEUTRAL');
  const [remark, setRemark] = useState('');
  const [nextDate, setNextDate] = useState('');

  const daysOverdue = isOverdue
    ? Math.floor(
        (Date.now() - new Date(business.followUpDate).getTime()) / (1000 * 60 * 60 * 24)
      )
    : 0;

  const handleLogActivity = async () => {
    if (!remark.trim()) {
      toast.error('Please add a remark');
      return;
    }
    setLogLoading(true);
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          type: activityType,
          outcome,
          remark,
          nextFollowUpDate: nextDate || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to log activity');
      }
      toast.success('Activity logged successfully');
      setShowLogForm(false);
      setRemark('');
      setNextDate('');
      onActivityLogged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to log activity');
    } finally {
      setLogLoading(false);
    }
  };

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/businesses/${business.id}`}
                className="font-semibold hover:underline truncate"
              >
                {business.businessName}
              </Link>
              <StatusBadge status={business.status as never} />
              {isOverdue && (
                <Badge variant="destructive" className="text-xs">
                  {daysOverdue}d overdue
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {business.ownerName} &middot;{' '}
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {business.city.name}
                {business.area && `, ${business.area.name}`}
              </span>
            </p>
            {business.lastActivity && (
              <p className="text-xs text-muted-foreground mt-1">
                Last: {business.lastActivity.type} - {business.lastActivity.remark.slice(0, 60)}
                {business.lastActivity.remark.length > 60 ? '...' : ''} (
                {formatRelativeTime(business.lastActivity.createdAt)})
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a href={`tel:${business.phone}`}>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <Phone className="h-3.5 w-3.5" />
              </Button>
            </a>
            <a
              href={generateWhatsAppLink(
                business.phone,
                `Hi ${business.ownerName}, following up regarding ${business.businessName}.`
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="icon" className="h-8 w-8">
                <MessageSquare className="h-3.5 w-3.5" />
              </Button>
            </a>
            <Button size="sm" variant="default" onClick={() => setShowLogForm(!showLogForm)}>
              Log Activity
            </Button>
          </div>
        </div>

        {showLogForm && (
          <div className="mt-4 pt-4 border-t space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={activityType} onValueChange={setActivityType}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Outcome</Label>
                <Select value={outcome} onValueChange={setOutcome}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_OUTCOMES.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Textarea
              placeholder="Add a remark..."
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              className="min-h-[60px]"
            />
            <div>
              <Label className="text-xs">Next Follow-up Date</Label>
              <Input
                type="date"
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="h-8"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowLogForm(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleLogActivity} disabled={logLoading}>
                {logLoading ? 'Saving...' : 'Save Activity'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function FollowUpsPage() {
  const [activeTab, setActiveTab] = useState('today');
  const [data, setData] = useState<Record<string, FollowUpBusiness[]>>({
    today: [],
    overdue: [],
    upcoming: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchFollowUps = useCallback(async () => {
    setLoading(true);
    try {
      const [todayRes, overdueRes, upcomingRes] = await Promise.all([
        fetch('/api/followups?type=today'),
        fetch('/api/followups?type=overdue'),
        fetch('/api/followups?type=upcoming'),
      ]);

      const [todayJson, overdueJson, upcomingJson] = await Promise.all([
        todayRes.json(),
        overdueRes.json(),
        upcomingRes.json(),
      ]);

      setData({
        today: todayJson.data ?? [],
        overdue: overdueJson.data ?? [],
        upcoming: upcomingJson.data ?? [],
      });
    } catch {
      toast.error('Failed to load follow-ups');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  const renderList = (items: FollowUpBusiness[], isOverdue = false) => {
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
          title={isOverdue ? 'No overdue follow-ups' : 'All caught up!'}
          description={
            isOverdue
              ? 'Great job! No overdue follow-ups.'
              : 'No follow-ups scheduled for this period.'
          }
        />
      );
    }

    return (
      <div className="space-y-3">
        {items.map((business) => (
          <FollowUpCard
            key={business.id}
            business={business}
            isOverdue={isOverdue}
            onActivityLogged={fetchFollowUps}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Follow-ups"
        description="Manage your scheduled follow-ups and never miss a callback."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="today" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            Today
            {data.today.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {data.today.length}
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

        <TabsContent value="today" className="mt-4">
          {renderList(data.today)}
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
