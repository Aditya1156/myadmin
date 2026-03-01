'use client';

import { Badge } from '@/components/ui/badge';
import { cn, getStatusColor, getPriorityColor, getOutcomeColor } from '@/lib/utils';
import type { BusinessStatus, Priority, ActivityOutcome, PaymentStatus } from '@prisma/client';
import { BUSINESS_STATUSES, PRIORITY_OPTIONS, ACTIVITY_OUTCOMES, PAYMENT_STATUSES } from '@/lib/constants';

export function StatusBadge({ status }: { status: BusinessStatus }) {
  const label = BUSINESS_STATUSES.find((s) => s.value === status)?.label ?? status;
  return <Badge className={cn('font-medium', getStatusColor(status))}>{label}</Badge>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const label = PRIORITY_OPTIONS.find((p) => p.value === priority)?.label ?? priority;
  return <Badge className={cn('font-medium', getPriorityColor(priority))}>{label}</Badge>;
}

export function OutcomeBadge({ outcome }: { outcome: ActivityOutcome }) {
  const label = ACTIVITY_OUTCOMES.find((o) => o.value === outcome)?.label ?? outcome;
  return <Badge className={cn('font-medium', getOutcomeColor(outcome))}>{label}</Badge>;
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const item = PAYMENT_STATUSES.find((p) => p.value === status);
  const colors: Record<PaymentStatus, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    PARTIAL: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    PAID: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    REFUNDED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  };
  return <Badge className={cn('font-medium', colors[status])}>{item?.label ?? status}</Badge>;
}
