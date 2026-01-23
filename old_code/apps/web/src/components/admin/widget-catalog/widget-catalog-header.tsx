/**
 * Widget Catalog Header Component
 * Header with title and description for widget catalog admin page
 */

'use client';

export function WidgetCatalogHeader() {
  return (
    <div className="space-y-2">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Widget Catalog</h1>
        <p className="text-muted-foreground">
          Manage system-wide widget types available across all tenants. Define widget configurations,
          visibility levels, and default permissions.
        </p>
      </div>
    </div>
  );
}
