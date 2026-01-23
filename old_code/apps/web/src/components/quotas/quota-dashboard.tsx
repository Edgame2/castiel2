/**
 * Quota Dashboard Component
 * Main quota management interface
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Target, TrendingUp, AlertCircle, ShieldOff } from 'lucide-react';
import { usePermissionCheck } from '@/hooks/use-permission-check';
import { useQuotas, useDeleteQuota, useCalculatePerformance } from '@/hooks/use-quotas';
import { QuotaCard } from './quota-card';
import { QuotaFormDialog } from './quota-form-dialog';
import { ErrorDisplay } from '@/components/risk-analysis/error-display';
import type { Quota } from '@/types/quota';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

interface QuotaDashboardProps {
  userId?: string;
  teamId?: string;
}

export function QuotaDashboard({ userId, teamId }: QuotaDashboardProps) {
  const router = useRouter();
  const [quotaTypeFilter, setQuotaTypeFilter] = useState<'individual' | 'team' | 'tenant' | 'all'>('all');
  const [periodTypeFilter, setPeriodTypeFilter] = useState<'monthly' | 'quarterly' | 'yearly' | 'all'>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedQuota, setSelectedQuota] = useState<Quota | null>(null);
  
  const deleteMutation = useDeleteQuota();
  const calculatePerformanceMutation = useCalculatePerformance();

  // Check permissions
  const canReadTeamQuotas = usePermissionCheck('quota:read:team');
  const canReadTenantQuotas = usePermissionCheck('quota:read:tenant');
  const canCreateQuotas = usePermissionCheck('shard:create:tenant');
  const canUpdateQuotas = usePermissionCheck('shard:update:all');
  const canDeleteQuotas = usePermissionCheck('shard:delete:all');
  const hasReadAccess = canReadTeamQuotas || canReadTenantQuotas;

  // Build filters
  const filters: any = {};
  if (userId) filters.targetUserId = userId;
  if (teamId) filters.teamId = teamId;
  if (quotaTypeFilter !== 'all') filters.quotaType = quotaTypeFilter;
  if (periodTypeFilter !== 'all') filters.periodType = periodTypeFilter;

  const {
    data: quotas = [],
    isLoading,
    error,
    refetch,
  } = useQuotas(filters);

  // Group quotas by type
  const quotasByType = quotas.reduce((acc, quota) => {
    if (!acc[quota.quotaType]) {
      acc[quota.quotaType] = [];
    }
    acc[quota.quotaType].push(quota);
    return acc;
  }, {} as Record<string, Quota[]>);

  // Format currency
  const formatCurrency = (value: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(value);
  };

  // Permission check
  if (!hasReadAccess) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <ShieldOff className="h-12 w-12 text-muted-foreground" />
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Access Denied</h3>
              <p className="text-sm text-muted-foreground">
                You don't have permission to view quotas. Manager or Director role required.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <ErrorDisplay 
            error={error} 
            onRetry={() => refetch()}
            title="Failed to Load Quotas"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quota Management</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage sales quotas and performance
          </p>
        </div>
        {canCreateQuotas && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Quota
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Quota Type</label>
              <Select value={quotaTypeFilter} onValueChange={(value: any) => setQuotaTypeFilter(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="tenant">Tenant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Period Type</label>
              <Select value={periodTypeFilter} onValueChange={(value: any) => setPeriodTypeFilter(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Periods</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quotas by Type */}
      {quotas.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No quotas found.</p>
              <p className="text-sm mt-2">Create a quota to get started.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All ({quotas.length})</TabsTrigger>
            {Object.entries(quotasByType).map(([type, typeQuotas]) => (
              <TabsTrigger key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)} ({typeQuotas.length})
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {quotas.map((quota) => (
                <QuotaCard
                  key={quota.id}
                  quota={quota}
                  onViewDetails={(id) => router.push(`/quotas/${id}`)}
                  onEdit={canUpdateQuotas ? (id) => {
                    const quotaToEdit = quotas.find((q) => q.id === id);
                    if (quotaToEdit) {
                      setSelectedQuota(quotaToEdit);
                      setEditDialogOpen(true);
                    }
                  } : undefined}
                  onDelete={canDeleteQuotas ? (id) => {
                    const quotaToDelete = quotas.find((q) => q.id === id);
                    if (quotaToDelete) {
                      setSelectedQuota(quotaToDelete);
                      setDeleteDialogOpen(true);
                    }
                  } : undefined}
                  onCalculatePerformance={async (id) => {
                    try {
                      await calculatePerformanceMutation.mutateAsync(id);
                    } catch (err) {
                      const errorObj = err instanceof Error ? err : new Error(String(err))
                      trackException(errorObj, 3)
                      trackTrace('Failed to calculate performance', 3, {
                        errorMessage: errorObj.message,
                        quotaId: id,
                      })
                    }
                  }}
                />
              ))}
            </div>
          </TabsContent>

          {Object.entries(quotasByType).map(([type, typeQuotas]) => (
            <TabsContent key={type} value={type} className="mt-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {typeQuotas.map((quota) => (
                  <QuotaCard
                    key={quota.id}
                    quota={quota}
                    onViewDetails={(id) => router.push(`/quotas/${id}`)}
                    onEdit={canUpdateQuotas ? (id) => {
                      const quotaToEdit = quotas.find((q) => q.id === id);
                      if (quotaToEdit) {
                        setSelectedQuota(quotaToEdit);
                        setEditDialogOpen(true);
                      }
                    } : undefined}
                    onDelete={canDeleteQuotas ? (id) => {
                      const quotaToDelete = quotas.find((q) => q.id === id);
                      if (quotaToDelete) {
                        setSelectedQuota(quotaToDelete);
                        setDeleteDialogOpen(true);
                      }
                    } : undefined}
                    onCalculatePerformance={async (id) => {
                      try {
                        await calculatePerformanceMutation.mutateAsync(id);
                      } catch (err) {
                        const errorObj = err instanceof Error ? err : new Error(String(err))
                        trackException(errorObj, 3)
                        trackTrace('Failed to calculate performance', 3, {
                          errorMessage: errorObj.message,
                          quotaId: id,
                        })
                      }
                    }}
                  />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Create Dialog */}
      <QuotaFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        mode="create"
      />

      {/* Edit Dialog */}
      <QuotaFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        quota={selectedQuota}
        mode="edit"
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quota</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this quota? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (selectedQuota) {
                  try {
                    await deleteMutation.mutateAsync(selectedQuota.id);
                    setDeleteDialogOpen(false);
                    setSelectedQuota(null);
                  } catch (err) {
                    const errorObj = err instanceof Error ? err : new Error(String(err))
                    trackException(errorObj, 3)
                    trackTrace('Failed to delete quota', 3, {
                      errorMessage: errorObj.message,
                      quotaId: selectedQuota?.id,
                    })
                  }
                }
              }}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

