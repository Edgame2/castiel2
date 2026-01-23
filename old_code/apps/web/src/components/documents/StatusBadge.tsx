'use client';

import { DocumentStatus } from '@/types/documents';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Trash2, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: DocumentStatus;
  className?: string;
}

/**
 * Badge component for displaying document status
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = {
    active: {
      label: 'Active',
      icon: CheckCircle2,
      className: 'bg-green-50 text-green-700 border-green-200',
    },
    deleted: {
      label: 'Deleted',
      icon: Trash2,
      className: 'bg-gray-50 text-gray-700 border-gray-200',
    },
    quarantined: {
      label: 'Quarantined',
      icon: AlertTriangle,
      className: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    scan_failed: {
      label: 'Scan Failed',
      icon: XCircle,
      className: 'bg-red-50 text-red-700 border-red-200',
    },
  };

  const { label, icon: Icon, className: colorClass } = config[status];

  return (
    <Badge variant="outline" className={cn('gap-1 text-xs', colorClass, className)}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}
