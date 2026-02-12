/**
 * Shared empty state for list/data pages. Per requirements: Card + message + optional CTA.
 * Use when a list or data view has zero items.
 */

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  /** Short heading (e.g. "No products yet") */
  title: string;
  /** Explanation or next step (e.g. "Create a product to get started.") */
  description?: string;
  /** Optional CTA: link */
  action?: {
    label: string;
    href: string;
  };
  /** Optional CTA: button click (use when no navigation) */
  actionButton?: {
    label: string;
    onClick: () => void;
  };
  /** Optional icon (e.g. Lucide icon) */
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  actionButton,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <Card className={cn(className)}>
      <CardContent className="flex flex-col items-center justify-center py-10 text-center">
        {icon && <div className="mb-3 text-muted-foreground">{icon}</div>}
        <h3 className="text-lg font-semibold mb-1">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mb-4 max-w-md">{description}</p>
        )}
        {action && (
          <Button asChild>
            <Link href={action.href}>{action.label}</Link>
          </Button>
        )}
        {actionButton && !action && (
          <Button type="button" onClick={actionButton.onClick}>
            {actionButton.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
