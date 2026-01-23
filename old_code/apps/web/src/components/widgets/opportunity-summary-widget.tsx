/**
 * Opportunity Summary Widget
 * Widget-compatible component for displaying opportunity summary with risk distribution
 */

'use client';

import { usePipelineSummary } from '@/hooks/use-opportunities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import type { WidgetCompatibleProps } from '@/types/widget-compatible';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface OpportunitySummaryWidgetConfig {
  showRiskDistribution?: boolean;
  showTopRisks?: boolean;
  topRisksCount?: number;
}

export function OpportunitySummaryWidget({
  data,
  config,
  isLoading,
  error,
  onRefresh,
  widgetContext,
  className,
}: WidgetCompatibleProps<any, OpportunitySummaryWidgetConfig>) {
  const {
    showRiskDistribution = true,
    showTopRisks = true,
    topRisksCount = 5,
  } = config || {};

  // Use hook if no data provided
  const {
    data: summaryData,
    isLoading: hookLoading,
    refetch,
  } = usePipelineSummary(!data);

  const summary = data || summaryData;
  const internalLoading = hookLoading && !data;

  if (isLoading || internalLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Pipeline Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Error loading summary</p>
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

  if (!summary) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Pipeline Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No summary data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const { metrics, riskDistribution, topRisks } = summary;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Pipeline Summary</CardTitle>
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
      <CardContent className="space-y-6">
        {/* Risk Distribution */}
        {showRiskDistribution && riskDistribution && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Risk Distribution</h3>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">High</Badge>
                    <span className="text-sm text-muted-foreground">
                      {riskDistribution.high.count} opportunities
                    </span>
                  </div>
                  <span className="text-sm font-medium">
                    {riskDistribution.high.percentage.toFixed(1)}%
                  </span>
                </div>
                <Progress value={riskDistribution.high.percentage} className="h-2" />
                <div className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(riskDistribution.high.value, metrics?.currency || 'USD')}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Medium</Badge>
                    <span className="text-sm text-muted-foreground">
                      {riskDistribution.medium.count} opportunities
                    </span>
                  </div>
                  <span className="text-sm font-medium">
                    {riskDistribution.medium.percentage.toFixed(1)}%
                  </span>
                </div>
                <Progress value={riskDistribution.medium.percentage} className="h-2" />
                <div className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(riskDistribution.medium.value, metrics?.currency || 'USD')}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Low</Badge>
                    <span className="text-sm text-muted-foreground">
                      {riskDistribution.low.count} opportunities
                    </span>
                  </div>
                  <span className="text-sm font-medium">
                    {riskDistribution.low.percentage.toFixed(1)}%
                  </span>
                </div>
                <Progress value={riskDistribution.low.percentage} className="h-2" />
                <div className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(riskDistribution.low.value, metrics?.currency || 'USD')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top Risks */}
        {showTopRisks && topRisks && topRisks.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Top Risks</h3>
            <div className="space-y-2">
              {topRisks.slice(0, topRisksCount).map((risk: any, index: number) => (
                <div
                  key={risk.opportunityId || index}
                  className="flex items-center justify-between p-2 border rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {risk.opportunityName || 'Unnamed Opportunity'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Risk Score: {(risk.riskScore * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-destructive ml-4">
                    {formatCurrency(risk.revenueAtRisk, metrics?.currency || 'USD')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

