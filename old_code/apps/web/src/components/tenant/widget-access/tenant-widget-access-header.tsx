/**
 * Tenant Widget Access Header Component
 */

'use client';

interface TenantWidgetAccessHeaderProps {
  tenantId: string;
}

export function TenantWidgetAccessHeader({ tenantId }: TenantWidgetAccessHeaderProps) {
  return (
    <div className="space-y-2">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Widget Access Management</h1>
        <p className="text-muted-foreground">
          Customize which widgets are available to your tenant users. Control visibility, assign
          widgets to roles, and manage defaults.
        </p>
      </div>
    </div>
  );
}
