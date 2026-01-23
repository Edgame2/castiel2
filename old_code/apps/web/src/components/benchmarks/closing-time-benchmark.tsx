/**
 * Closing Time Benchmark Component
 * Display closing time benchmark metrics
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock } from 'lucide-react';
import type { ClosingTimeBenchmark } from '@/types/quota';

interface ClosingTimeBenchmarkCardProps {
  benchmark: ClosingTimeBenchmark;
}

export function ClosingTimeBenchmarkCard({ benchmark }: ClosingTimeBenchmarkCardProps) {
  // Format days
  const formatDays = (days: number) => {
    if (days < 30) return `${Math.round(days)} days`;
    if (days < 365) return `${Math.round(days / 30)} months`;
    return `${Math.round(days / 365)} years`;
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
          <Calendar className="h-5 w-5" />
          Closing Time Benchmark
        </CardTitle>
        <CardDescription>
          {getScopeLabel(benchmark.scope)} • {formatDateRange()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Average */}
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Average</div>
            <div className="text-3xl font-bold">{formatDays(benchmark.metrics.avgClosingTime)}</div>
            <div className="text-xs text-muted-foreground">
              {Math.round(benchmark.metrics.avgClosingTime)} days
            </div>
          </div>

          {/* Median */}
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Median</div>
            <div className="text-3xl font-bold">{formatDays(benchmark.metrics.medianClosingTime)}</div>
            <div className="text-xs text-muted-foreground">
              {Math.round(benchmark.metrics.medianClosingTime)} days
            </div>
          </div>

          {/* 25th Percentile */}
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">25th Percentile</div>
            <div className="text-3xl font-bold">{formatDays(benchmark.metrics.p25ClosingTime)}</div>
            <div className="text-xs text-muted-foreground">
              {Math.round(benchmark.metrics.p25ClosingTime)} days
            </div>
          </div>

          {/* 75th Percentile */}
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">75th Percentile</div>
            <div className="text-3xl font-bold">{formatDays(benchmark.metrics.p75ClosingTime)}</div>
            <div className="text-xs text-muted-foreground">
              {Math.round(benchmark.metrics.p75ClosingTime)} days
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
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


