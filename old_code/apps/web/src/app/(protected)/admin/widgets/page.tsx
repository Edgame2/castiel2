/**
 * SuperAdmin Widget Catalog Page
 * List and manage widget types in the system catalog
 */

import { Metadata } from 'next';
import { Suspense } from 'react';
import { WidgetCatalogListView } from '@/components/admin/widget-catalog/widget-library-list';
import { WidgetCatalogHeader } from '@/components/admin/widget-catalog/widget-catalog-header';

export const metadata: Metadata = {
  title: 'Widget Catalog | Admin',
  description: 'Manage system widget types and catalog',
};

export default function WidgetCatalogPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading header...</div>}>
        <WidgetCatalogHeader />
      </Suspense>

      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading widgets...</div>}>
        <WidgetCatalogListView />
      </Suspense>
    </div>
  );
}
