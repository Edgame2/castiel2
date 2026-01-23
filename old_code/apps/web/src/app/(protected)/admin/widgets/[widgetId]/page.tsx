/**
 * Edit Widget Page
 * SuperAdmin form to edit existing widget catalog entry
 */

import { Metadata } from 'next';
import { Suspense } from 'react';
import { WidgetCatalogForm } from '@/components/admin/widget-catalog/widget-form';
import { WidgetFormHeader } from '@/components/admin/widget-catalog/widget-form-header';

interface EditWidgetPageProps {
  params: {
    widgetId: string;
  };
}

export const metadata: Metadata = {
  title: 'Edit Widget | Admin',
  description: 'Edit widget configuration in the system catalog',
};

export default function EditWidgetPage({ params }: EditWidgetPageProps) {
  return (
    <div className="space-y-6">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading header...</div>}>
        <WidgetFormHeader mode="edit" />
      </Suspense>

      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading form...</div>}>
        <WidgetCatalogForm mode="edit" widgetId={params.widgetId} />
      </Suspense>
    </div>
  );
}
