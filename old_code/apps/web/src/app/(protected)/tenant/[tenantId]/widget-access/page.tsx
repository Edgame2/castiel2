/**
 * Tenant Widget Access Management Page
 * TenantAdmin interface to customize widget visibility and role-based access
 */

import { Metadata } from 'next';
import { Suspense } from 'react';
import { TenantWidgetAccessView } from '@/components/tenant/widget-access/tenant-widget-access-view';
import { TenantWidgetAccessHeader } from '@/components/tenant/widget-access/tenant-widget-access-header';

interface TenantWidgetAccessPageProps {
  params: {
    tenantId: string;
  };
}

export const metadata: Metadata = {
  title: 'Widget Access | Tenant Settings',
  description: 'Customize widget visibility and role-based access for your tenant',
};

export default function TenantWidgetAccessPage({ params }: TenantWidgetAccessPageProps) {
  return (
    <div className="space-y-6">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading header...</div>}>
        <TenantWidgetAccessHeader tenantId={params.tenantId as string} />
      </Suspense>

      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading widget configuration...</div>}>
        <TenantWidgetAccessView tenantId={params.tenantId} />
      </Suspense>
    </div>
  );
}
