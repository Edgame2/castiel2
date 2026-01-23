/**
 * Create New Widget Page
 * SuperAdmin form to create new widget catalog entries
 */

import { Metadata } from 'next';
import { Suspense } from 'react';
import { WidgetCatalogForm } from '@/components/admin/widget-catalog/widget-form';
import { WidgetFormHeader } from '@/components/admin/widget-catalog/widget-form-header';

export const metadata: Metadata = {
  title: 'Create Widget | Admin',
  description: 'Create a new widget type in the system catalog',
};

export default function CreateWidgetPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading header...</div>}>
        <WidgetFormHeader mode="create" />
      </Suspense>

      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading form...</div>}>
        <WidgetCatalogForm mode="create" />
      </Suspense>
    </div>
  );
}
