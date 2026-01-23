/**
 * Tenant Widget Access View Component
 * TenantAdmin view for managing widget visibility and role-based access
 */

'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  useTenantWidgetConfig,
  useUpdateTenantWidgetAccess,
  useUserWidgetCatalog,
} from '@/hooks/use-widget-catalog';
import { Loader2, AlertCircle } from 'lucide-react';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

interface TenantWidgetAccessViewProps {
  tenantId: string;
}

export function TenantWidgetAccessView({ tenantId }: TenantWidgetAccessViewProps) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  // Fetch tenant config and available widgets
  const { data: config, isLoading: isLoadingConfig } = useTenantWidgetConfig(tenantId);
  const { data: widgets, isLoading: isLoadingWidgets } = useUserWidgetCatalog({
    page,
    limit: 20,
  });

  // Mutation for updating widget access
  const updateAccess = useUpdateTenantWidgetAccess(tenantId);

  const isLoading = isLoadingConfig || isLoadingWidgets;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12 gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading widget access settings...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!config || !widgets) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-900">Failed to load widget settings</p>
              <p className="text-sm text-red-800">Please try refreshing the page</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleToggleVisibility = async (widgetId: string, isCurrentlyVisible: boolean) => {
    try {
      await updateAccess.mutateAsync({
        widgetId,
        data: {
          visibleToTenant: !isCurrentlyVisible,
          version: 1, // Will be updated with actual version
        },
      });
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Failed to update widget visibility', 3, {
        errorMessage: errorObj.message,
        widgetId,
        isVisible,
      })
    }
  };

  const handleToggleFeatured = async (widgetId: string, isFeatured: boolean) => {
    try {
      await updateAccess.mutateAsync({
        widgetId,
        data: {
          featuredForTenant: !isFeatured,
          version: 1,
        },
      });
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Failed to update widget featured status', 3, {
        errorMessage: errorObj.message,
        widgetId,
        isFeatured: !isFeatured,
      })
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Summary</CardTitle>
          <CardDescription>Tenant widget settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Visible Widgets</p>
              <p className="text-2xl font-bold">{config.visibleWidgetIds.length}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Hidden Widgets</p>
              <p className="text-2xl font-bold">{config.hiddenWidgetIds.length}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Featured Widgets</p>
              <p className="text-2xl font-bold">{config.featuredWidgetIds.length}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Max Per Dashboard</p>
              <p className="text-2xl font-bold">{config.maxWidgetsPerDashboard}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Widget List */}
      <Card>
        <CardHeader>
          <CardTitle>Widget Access</CardTitle>
          <CardDescription>Toggle visibility and featured status for each widget</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Widget</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Visible</TableHead>
                  <TableHead className="text-center">Featured</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!widgets.items || widgets.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No widgets available
                    </TableCell>
                  </TableRow>
                ) : (
                  widgets.items.map((widget) => {
                    const isVisible = !config.hiddenWidgetIds.includes(widget.id);
                    const isFeatured = config.featuredWidgetIds.includes(widget.id);

                    return (
                      <TableRow key={widget.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div>
                            <p className="font-medium">{widget.displayName}</p>
                            <p className="text-sm text-muted-foreground">{widget.description}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <Badge variant="outline">{widget.category}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={isVisible}
                            onCheckedChange={() =>
                              handleToggleVisibility(widget.id, isVisible)
                            }
                            disabled={updateAccess.isPending}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={isFeatured}
                            onCheckedChange={() => handleToggleFeatured(widget.id, isFeatured)}
                            disabled={updateAccess.isPending || !isVisible}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {widgets.total > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {widgets.items.length} of {widgets.total} widgets
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1 || updateAccess.isPending}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={widgets.items.length < 20 || updateAccess.isPending}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <p className="font-medium text-blue-900">About Widget Access</p>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Toggle widget visibility for your tenant</li>
              <li>Featured widgets appear first in widget picker</li>
              <li>Hidden widgets are not shown to users</li>
              <li>Visibility overrides are applied at the tenant level</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
