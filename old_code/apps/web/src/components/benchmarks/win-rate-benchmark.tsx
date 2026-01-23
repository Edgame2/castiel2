/**
 * Win Rate Benchmark Component
 * Display win rate benchmark metrics
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Target } from 'lucide-react';
import type { WinRateBenchmark } from '@/types/quota';

interface WinRateBenchmarkCardProps {
  benchmark: WinRateBenchmark;
}

export function WinRateBenchmarkCard({ benchmark }: WinRateBenchmarkCardProps) {
  // Format percentage
  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // Format date range
  const formatDateRange = () => {
    const start = new Date(benchmark.period.startDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const end = new Date(benchmark.period.endDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${start} - ${end}`;
  };

  // Get scope label
  const getScopeLabel = (scope: string) => {
    const labels: Record<string, string> = {
      tenant: 'Your Organization',
      industry: 'Industry Average',
      peer: 'Peer Group',
    };
    return labels[scope] || scope;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Win Rate Benchmark
        </CardTitle>
        <CardDescription>
          {getScopeLabel(benchmark.scope)} • {formatDateRange()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-3">
          {/* Win Rate */}
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Win Rate</div>
            <div className="text-4xl font-bold">{formatPercent(benchmark.metrics.winRate)}</div>
            <Badge variant="outline" className="w-fit">
              {benchmark.metrics.opportunityCount} opportunities
            </Badge>
          </div>

          {/* Won Count */}
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Won Deals</div>
            <div className="text-4xl font-bold text-green-600">
              {benchmark.metrics.wonCount}
            </div>
            <div className="text-sm text-muted-foreground">
              {formatPercent(benchmark.metrics.wonCount / benchmark.metrics.opportunityCount)}
            </div>
          </div>

          {/* Lost Count */}
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Lost Deals</div>
            <div className="text-4xl font-bold text-red-600">
              {benchmark.metrics.lostCount}
            </div>
            <div className="text-sm text-muted-foreground">
              {formatPercent(benchmark.metrics.lostCount / benchmark.metrics.opportunityCount)}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Target className="h-4 w-4" />
            <span>
              Calculated from {benchmark.metrics.opportunityCount} closed opportunities
              {benchmark.industryId && ` in this industry`}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


