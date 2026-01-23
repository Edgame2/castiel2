/**
 * Widget Form Header Component
 * Header for create/edit widget forms
 */

'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WidgetFormHeaderProps {
  mode: 'create' | 'edit';
  widgetId?: string;
}

export function WidgetFormHeader({ mode, widgetId }: WidgetFormHeaderProps) {
  const isCreate = mode === 'create';

  return (
    <div className="space-y-2">
      <Link href="/admin/widgets">
        <Button variant="ghost" size="sm" className="gap-2 -ml-3">
          <ArrowLeft className="h-4 w-4" />
          Back to Catalog
        </Button>
      </Link>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {isCreate ? 'Create Widget Type' : 'Edit Widget Type'}
        </h1>
        <p className="text-muted-foreground">
          {isCreate
            ? 'Create a new widget type for use across all dashboards.'
            : 'Update widget configuration, visibility, and permissions.'}
        </p>
      </div>
    </div>
  );
}
