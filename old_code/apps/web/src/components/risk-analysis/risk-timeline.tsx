/**
 * Risk Timeline Component
 * Risk history visualization over time
 */

'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useRiskEvaluation } from '@/hooks/use-risk-analysis';
import { ErrorDisplay } from './error-display';
import type { RiskEvaluation } from '@/types/risk-analysis';

interface RiskTimelineProps {
  opportunityId: string;
  // In a full implementation, this would fetch risk snapshots from the API
  // For now, we'll use the current evaluation and show a placeholder for history
}

export function RiskTimeline({ opportunityId }: RiskTimelineProps) {
  const {
    data: evaluation,
    isLoading: evaluationLoading,
    error: evaluationError,
    refetch: refetchEvaluation,
  } = useRiskEvaluation(opportunityId);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format percentage
  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // Calculate trend (placeholder - in real implementation, compare with previous snapshots)
  const trend = useMemo(() => {
    if (!evaluation) return null;
    // This would compare with previous risk score
    // For now, we'll show a neutral trend
    return { direction: 'neutral' as 'up' | 'down' | 'neutral', value: 0 };
  }, [evaluation]);

  if (evaluationLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (evaluationError) {
    return (
      <Card>
        <CardContent className="pt-6">
          <ErrorDisplay 
            error={evaluationError} 
            onRetry={() => refetchEvaluation()}
            title="Failed to Load Risk Timeline"
          />
        </CardContent>
      </Card>
    );
  }

  if (!evaluation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Risk Timeline</CardTitle>
          <CardDescription>No risk history available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Risk Timeline
        </CardTitle>
        <CardDescription>
          Risk evaluation history and trends
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Current Evaluation */}
          <div className="relative pl-8 pb-8 border-l-2 border-primary">
            <div className="absolute -left-2 top-0 h-4 w-4 rounded-full bg-primary border-2 border-background" />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Current Evaluation</div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(evaluation.calculatedAt)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      evaluation.riskScore >= 0.7
                        ? 'destructive'
                        : evaluation.riskScore >= 0.4
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {formatPercent(evaluation.riskScore)}
                  </Badge>
                  {trend && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      {trend.direction === 'up' && <TrendingUp className="h-4 w-4 text-destructive" />}
                      {trend.direction === 'down' && <TrendingDown className="h-4 w-4 text-green-600" />}
                      {trend.direction === 'neutral' && <Minus className="h-4 w-4" />}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {evaluation.risks.length} risk{evaluation.risks.length !== 1 ? 's' : ''} detected
              </div>
              {evaluation.revenueAtRisk > 0 && (
                <div className="text-sm">
                  Revenue at Risk: ${evaluation.revenueAtRisk.toLocaleString()}
                </div>
              )}
            </div>
          </div>

          {/* Placeholder for Historical Snapshots */}
          <div className="pl-8 text-sm text-muted-foreground italic">
            Historical risk snapshots will appear here as they are captured over time.
            Risk evaluations are automatically saved when opportunities are updated.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


