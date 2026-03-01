'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
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
import { formatRelativeTime } from '@/lib/utils';
import {
  ScrollText,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  KeyRound,
  Trash2,
  Edit,
  Shield,
  Package,
  FileText,
} from 'lucide-react';

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
    role: string;
  };
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  user_created: { label: 'User Created', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  role_changed: { label: 'Role Changed', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  password_reset: { label: 'Password Reset', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
  bulk_update_status: { label: 'Bulk Status Update', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
  bulk_update_priority: { label: 'Bulk Priority Update', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
  bulk_delete: { label: 'Bulk Delete', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
  bulk_assign_user: { label: 'Bulk Assign', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300' },
  business_import: { label: 'Data Import', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300' },
  report_exported: { label: 'Report Exported', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
};

function getActionIcon(action: string) {
  if (action.includes('user_created')) return UserPlus;
  if (action.includes('password')) return KeyRound;
  if (action.includes('delete')) return Trash2;
  if (action.includes('role') || action.includes('assign')) return Shield;
  if (action.includes('bulk')) return Package;
  if (action.includes('import') || action.includes('export')) return FileText;
  return Edit;
}

export default function ActivityLogsPage() {
  const { dbUser, loading: userLoading } = useCurrentUser();
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterAction, setFilterAction] = useState('');

  useEffect(() => {
    if (!userLoading && dbUser && dbUser.role === 'SALES') {
      router.push('/dashboard');
    }
  }, [dbUser, userLoading, router]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '30');
      if (filterAction) params.set('action', filterAction);

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setLogs(json.data ?? []);
        setTotalPages(json.meta?.totalPages ?? 1);
        setTotal(json.meta?.total ?? 0);
      }
    } catch {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [page, filterAction]);

  useEffect(() => {
    if (dbUser && (dbUser.role === 'ADMIN' || dbUser.role === 'MANAGER')) {
      fetchLogs();
    }
  }, [fetchLogs, dbUser]);

  useEffect(() => {
    setPage(1);
  }, [filterAction]);

  if (userLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (dbUser?.role === 'SALES') return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity Logs"
        description="Track all system actions and changes made by team members."
      />

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select
          value={filterAction}
          onValueChange={(val) => setFilterAction(val === '__all__' ? '' : val)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All actions</SelectItem>
            {Object.entries(ACTION_LABELS).map(([key, val]) => (
              <SelectItem key={key} value={key}>
                {val.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{total} total logs</span>
      </div>

      {/* Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">System Audit Trail</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <EmptyState
              icon={ScrollText}
              title="No activity logs"
              description="System actions will be recorded here."
            />
          ) : (
            <div className="space-y-3">
              {logs.map((log) => {
                const actionInfo = ACTION_LABELS[log.action] ?? {
                  label: log.action.replace(/_/g, ' '),
                  color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
                };
                const Icon = getActionIcon(log.action);
                let details: Record<string, unknown> = {};
                try {
                  if (log.details) details = JSON.parse(log.details);
                } catch { /* ignore */ }

                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="rounded-full bg-muted p-2 shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={actionInfo.color}>
                          {actionInfo.label}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          by <span className="font-medium text-foreground">{log.user.name}</span>
                        </span>
                      </div>
                      {log.entityType && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {log.entityType}
                          {details.targetEmail ? ` — ${String(details.targetEmail)}` : null}
                          {details.name ? ` — ${String(details.name)}` : null}
                          {details.affected !== undefined ? ` — ${String(details.affected)} affected` : null}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                      {formatRelativeTime(log.createdAt)}
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
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
