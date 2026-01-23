/**
 * Pipeline Metrics Widget
 * Widget-compatible component for displaying pipeline metrics in dashboards
 */

'use client';

import { usePipelineMetrics } from '@/hooks/use-opportunities';
import type { PipelineMetrics } from '@/lib/api/opportunities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle } from 'lucide-react';
import type { WidgetCompatibleProps } from '@/types/widget-compatible';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface PipelineMetricsWidgetConfig {
  showRevenueAtRisk?: boolean;
  showRiskAdjusted?: boolean;
  compact?: boolean;
}

export function PipelineMetricsWidget({
  data,
  config,
  isLoading,
  error,
  onRefresh,
  widgetContext,
  className,
}: WidgetCompatibleProps<PipelineMetrics, PipelineMetricsWidgetConfig>) {
  const {
    showRevenueAtRisk = true,
    showRiskAdjusted = true,
    compact = false,
  } = config || {};

  // Use hook if no data provided
  const {
    data: metricsData,
    isLoading: hookLoading,
    refetch,
  } = usePipelineMetrics({ enabled: !data });

  const metrics = data || metricsData;
  const internalLoading = hookLoading && !data;

  if (isLoading || internalLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className={cn('grid gap-4', compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4')}>
            {Array.from({ length: compact ? 2 : 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Pipeline Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Error loading metrics</p>
            {onRefresh && (
              <button onClick={onRefresh} className="text-sm text-primary mt-2">
                Retry
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Pipeline Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No metrics available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Pipeline Metrics</CardTitle>
          {(onRefresh || (typeof refetch === 'function')) && (
            <button
              onClick={() => {
                onRefresh?.();
                refetch();
              }}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Refresh
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn('grid gap-4', compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4')}>
          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              Total Value
            </div>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics.totalPipelineValue, metrics.currency)}
            </div>
            <div className="text-xs text-muted-foreground">
              {metrics.opportunityCount} opportunities
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              Expected Revenue
            </div>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics.totalExpectedRevenue, metrics.currency)}
            </div>
            <div className="text-xs text-muted-foreground">
              Based on probability
            </div>
          </div>

          {showRevenueAtRisk && (
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Revenue at Risk
              </div>
              <div className="text-2xl font-bold text-destructive">
                {formatCurrency(metrics.totalRevenueAtRisk, metrics.currency)}
              </div>
              <div className="text-xs text-muted-foreground">
                High-risk deals
              </div>
            </div>
          )}

          {showRiskAdjusted && (
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <TrendingDown className="h-4 w-4" />
                Risk-Adjusted
              </div>
              <div className="text-2xl font-bold">
                {formatCurrency(metrics.riskAdjustedValue, metrics.currency)}
              </div>
              <div className="text-xs text-muted-foreground">
                Conservative forecast
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

