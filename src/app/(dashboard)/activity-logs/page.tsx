'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  ScrollText,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Pencil,
  Trash2,
  KeyRound,
  Shield,
  Package,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { useCurrentUser } from '@/hooks/use-current-user';
import { formatDate } from '@/lib/utils';

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'create_user', label: 'User Created' },
  { value: 'reset_password', label: 'Password Reset' },
  { value: 'bulk_update_status', label: 'Bulk Status Update' },
  { value: 'bulk_update_priority', label: 'Bulk Priority Update' },
  { value: 'bulk_delete', label: 'Bulk Delete' },
];

function getActionIcon(action: string) {
  if (action.includes('create')) return <UserPlus className="h-4 w-4" />;
  if (action.includes('update') || action.includes('edit')) return <Pencil className="h-4 w-4" />;
  if (action.includes('delete')) return <Trash2 className="h-4 w-4" />;
  if (action.includes('password') || action.includes('reset')) return <KeyRound className="h-4 w-4" />;
  if (action.includes('bulk')) return <Package className="h-4 w-4" />;
  return <Shield className="h-4 w-4" />;
}

function getActionColor(action: string) {
  if (action.includes('delete')) return 'destructive';
  if (action.includes('create')) return 'default';
  return 'secondary' as const;
}

export default function ActivityLogsPage() {
  const { dbUser } = useCurrentUser();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (actionFilter) params.set('action', actionFilter);

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setLogs(json.data ?? []);
        setTotalPages(json.meta?.totalPages ?? 1);
        setTotal(json.meta?.total ?? 0);
      }
    } catch {
      toast.error('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { setPage(1); }, [actionFilter]);

  const isAdmin = dbUser?.role === 'ADMIN' || dbUser?.role === 'MANAGER';
  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity Logs"
        description="Audit trail of all administrative actions."
      />

      <div className="flex items-center gap-3">
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            {ACTION_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value || '__all__'}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{total} entries</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <EmptyState
              icon={ScrollText}
              title="No activity logs"
              description="Actions like user creation, bulk operations, and password resets will be logged here."
            />
          ) : (
            <div className="space-y-3">
              {logs.map((log) => {
                let details: Record<string, unknown> = {};
                try { details = log.details ? JSON.parse(log.details) : {}; } catch { /* ignore */ }

                return (
                  <div key={log.id} className="flex items-start gap-3 border-b pb-3 last:border-0 last:pb-0">
                    <div className="mt-0.5 text-muted-foreground">
                      {getActionIcon(log.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={getActionColor(log.action)}>
                          {log.action.replace(/_/g, ' ').toUpperCase()}
                        </Badge>
                        <span className="text-sm text-muted-foreground">on {log.entityType}</span>
                        {details.targetEmail ? ` — ${String(details.targetEmail)}` : null}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        by {log.user.name} ({log.user.email})
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
