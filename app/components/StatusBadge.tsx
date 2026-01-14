import { cn } from '../../lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig = {
  active: {
    label: 'Active',
    color: 'bg-status-critical/10 text-status-critical border-status-critical/20',
  },
  investigating: {
    label: 'Investigating',
    color: 'bg-status-warning/10 text-status-warning border-status-warning/20',
  },
  mitigated: {
    label: 'Mitigated',
    color: 'bg-status-info/10 text-status-info border-status-info/20',
  },
  resolved: {
    label: 'Resolved',
    color: 'bg-status-success/10 text-status-success border-status-success/20',
  },
  closed: {
    label: 'Closed',
    color: 'bg-gray-100 text-gray-600 border-gray-200',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;

  return (
    <span
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border',
        config.color,
        className
      )}
    >
      {config.label}
    </span>
  );
}
