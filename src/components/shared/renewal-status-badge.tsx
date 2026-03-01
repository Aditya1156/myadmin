import { Badge } from '@/components/ui/badge';
import { RENEWAL_STATUSES } from '@/lib/constants';

interface RenewalStatusBadgeProps {
  status: string;
}

export function RenewalStatusBadge({ status }: RenewalStatusBadgeProps) {
  const config = RENEWAL_STATUSES.find((s) => s.value === status);
  if (!config) return <Badge variant="outline">{status}</Badge>;

  return (
    <Badge variant="outline" className={config.color}>
      {config.label}
    </Badge>
  );
}
