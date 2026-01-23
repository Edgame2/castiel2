/**
 * Trust Level Badge Component
 * Displays trust level with appropriate styling and icon
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Shield, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';
import type { TrustLevel } from '@/types/risk-analysis';
import { cn } from '@/lib/utils';

interface TrustLevelBadgeProps {
  trustLevel: TrustLevel;
  className?: string;
  showIcon?: boolean;
}

export function TrustLevelBadge({ trustLevel, className, showIcon = true }: TrustLevelBadgeProps) {
  const config = {
    high: {
      label: 'High Trust',
      variant: 'default' as const,
      icon: ShieldCheck,
      color: 'text-green-600',
    },
    medium: {
      label: 'Medium Trust',
      variant: 'secondary' as const,
      icon: Shield,
      color: 'text-yellow-600',
    },
    low: {
      label: 'Low Trust',
      variant: 'outline' as const,
      icon: ShieldAlert,
      color: 'text-orange-600',
    },
    unreliable: {
      label: 'Unreliable',
      variant: 'destructive' as const,
      icon: ShieldX,
      color: 'text-red-600',
    },
  };

  const { label, variant, icon: Icon, color } = config[trustLevel];

  return (
    <Badge variant={variant} className={cn('flex items-center gap-1.5', className)}>
      {showIcon && <Icon className={cn('h-3.5 w-3.5', color)} />}
      <span>{label}</span>
    </Badge>
  );
}
