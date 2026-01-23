/**
 * Opportunity List Widget
 * Widget-compatible component for displaying opportunities in dashboards
 */

'use client';

import { useRouter } from 'next/navigation';
import { useOpportunities } from '@/hooks/use-opportunities';
import type { OpportunityListResult } from '@/lib/api/opportunities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { WidgetCompatibleProps } from '@/types/widget-compatible';
import type { Shard } from '@/types/api';
import { formatCurrency, cn } from '@/lib/utils';

interface OpportunityListWidgetConfig {
  limit?: number;
  showRiskBadge?: boolean;
  showValue?: boolean;
  showStage?: boolean;
  showCloseDate?: boolean;
}

export function OpportunityListWidget({
  data,
  config,
  isLoading,
  error,
  onRefresh,
  widgetContext,
  className,
}: WidgetCompatibleProps<OpportunityListResult | Shard[], OpportunityListWidgetConfig>) {
  const router = useRouter();

  const {
    limit = 10,
    showRiskBadge = true,
    showValue = true,
    showStage = true,
    showCloseDate = true,
  } = config || {};

  // Use hook if no data provided
  const {
    data: opportunitiesResult,
    isLoading: hookLoading,
    refetch,
  } = useOpportunities(
    {
      // Use widget context filters if available
      ownerId: widgetContext?.dashboardContext?.customParams?.ownerId as string | undefined,
    },
    { limit, enabled: !data }
  );

  // Determine opportunities source
  let opportunities: Shard[] = [];
  if (data) {
    if (Array.isArray(data)) {
      opportunities = data.slice(0, limit);
    } else if ('opportunities' in data) {
      opportunities = data.opportunities.slice(0, limit);
    }
  } else if (opportunitiesResult) {
    opportunities = opportunitiesResult.opportunities;
  }

  const internalLoading = hookLoading && !data;

  const getRiskBadge = (opportunity: Shard) => {
    if (!showRiskBadge) return null;

    const data = opportunity.structuredData as any;
    const riskEvaluation = data?.riskEvaluation;
    if (!riskEvaluation) return null;

    const riskScore = riskEvaluation.riskScore || 0;
    const riskLevel = riskScore >= 0.7 ? 'high' : riskScore >= 0.4 ? 'medium' : 'low';
    const variant = riskLevel === 'high' ? 'destructive' : riskLevel === 'medium' ? 'default' : 'secondary';

    return (
      <Badge variant={variant} className="ml-2">
        {riskLevel.toUpperCase()}
      </Badge>
    );
  };

  if (isLoading || internalLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: limit }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
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
          <CardTitle>Opportunities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Error loading opportunities</p>
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

  if (opportunities.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Opportunities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No opportunities found
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Opportunities</CardTitle>
          {(onRefresh || (typeof refetch === 'function')) && (
            <button
              onClick={() => {
                onRefresh && onRefresh();
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
        <div className="space-y-3">
          {opportunities.map((opportunity) => {
            const data = opportunity.structuredData as any;
            return (
              <div
                key={opportunity.id}
                className="p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                onClick={() => router.push(`/opportunities/${opportunity.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">
                        {data?.name || 'Unnamed Opportunity'}
                      </h4>
                      {getRiskBadge(opportunity)}
                      {showStage && (
                        <Badge variant="outline" className="ml-auto">
                          {data?.stage || 'Unknown'}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      {showValue && (
                        <span>
                          {formatCurrency(data?.value || 0, data?.currency || 'USD')}
                        </span>
                      )}
                      {showCloseDate && data?.closeDate && (
                        <span>
                          Close: {new Date(data.closeDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

