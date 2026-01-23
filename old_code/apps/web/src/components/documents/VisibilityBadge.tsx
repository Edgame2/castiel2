'use client';

import { DocumentVisibility } from '@/types/documents';
import { Badge } from '@/components/ui/badge';
import { Globe, Lock, Building } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VisibilityBadgeProps {
  visibility: DocumentVisibility;
  className?: string;
}

/**
 * Badge component for displaying document visibility level
 */
export function VisibilityBadge({ visibility, className }: VisibilityBadgeProps) {
  const config = {
    public: {
      label: 'Public',
      icon: Globe,
      className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
    },
    internal: {
      label: 'Internal',
      icon: Building,
      className: 'bg-muted text-muted-foreground border-border',
    },
    confidential: {
      label: 'Confidential',
      icon: Lock,
      className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    },
  };

  const defaultConfig = {
    label: 'Unknown',
    icon: Building,
    className: 'bg-muted text-muted-foreground border-border',
  };

  const { label, icon: Icon, className: colorClass } = config[visibility as keyof typeof config] || defaultConfig;

  return (
    <Badge variant="outline" className={cn('gap-1 text-xs font-normal', colorClass, className)}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}
