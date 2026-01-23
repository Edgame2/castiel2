/**
 * Quota Performance Chart Component
 * Performance visualization for quotas
 */

'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from 'lucide-react';
import { useQuotaPerformance } from '@/hooks/use-quotas';
import { LineChart } from '@/components/widgets/charts/line-chart';
import { ErrorDisplay } from '@/components/risk-analysis/error-display';
import type { Quota, QuotaPerformanceDetails } from '@/types/quota';

interface QuotaPerformanceChartProps {
  quota: Quota;
  showForecast?: boolean;
}

export function QuotaPerformanceChart({ quota, showForecast = false }: QuotaPerformanceChartProps) {
  const {
    data: performanceDetails,
    isLoading,
    error,
    refetch,
  } = useQuotaPerformance(quota.id);

  // Prepare chart data from trends (widget-compatible format)
  const chartData = useMemo(() => {
    if (!performanceDetails || !('trends' in performanceDetails)) {
      return [];
    }

    const details = performanceDetails as unknown as QuotaPerformanceDetails;
    const dailyTrends = details.trends?.daily || [];
    
    // Convert to widget-compatible format
    return dailyTrends.map((trend) => ({
      label: new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: trend.actual,
      // Store forecasted separately for tooltip
      forecasted: trend.forecasted,
    }));
  }, [performanceDetails]);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: quota.target.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <ErrorDisplay 
            error={error} 
            onRetry={() => refetch()}
            title="Failed to Load Performance Data"
          />
        </CardContent>
      </Card>
    );
  }

  if (!performanceDetails || chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Trends
          </CardTitle>
          <CardDescription>
            No trend data available
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Trend data will appear as performance is tracked
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Performance Trends
        </CardTitle>
        <CardDescription>
          Daily performance tracking for {quota.period.type} quota
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <LineChart
            data={chartData}
            config={{
              curved: true,
              showArea: true,
              showPoints: true,
              valueFormatter: (value) => formatCurrency(value),
            }}
            isLoading={false}
            error={null}
          />
        </div>
        {showForecast && chartData.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            Forecasted values shown in tooltip (hover over data points)
          </div>
        )}
      </CardContent>
    </Card>
  );
}

