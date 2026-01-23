/**
 * Deal Size Benchmark Component
 * Display deal size distribution benchmark metrics
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp } from 'lucide-react';
import type { DealSizeBenchmark } from '@/types/quota';

interface DealSizeBenchmarkCardProps {
  benchmark: DealSizeBenchmark;
}

export function DealSizeBenchmarkCard({ benchmark }: DealSizeBenchmarkCardProps) {
  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
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

  const dist = benchmark.metrics.dealSizeDistribution;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Deal Size Benchmark
        </CardTitle>
        <CardDescription>
          {getScopeLabel(benchmark.scope)} • {formatDateRange()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Average Deal Size */}
        <div className="mb-6">
          <div className="text-sm text-muted-foreground mb-2">Average Deal Size</div>
          <div className="text-4xl font-bold">{formatCurrency(benchmark.metrics.avgDealSize)}</div>
        </div>

        {/* Distribution */}
        <div className="space-y-4">
          <h4 className="font-medium">Deal Size Distribution</h4>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Minimum</div>
              <div className="text-xl font-semibold">{formatCurrency(dist.min)}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">25th Percentile</div>
              <div className="text-xl font-semibold">{formatCurrency(dist.p25)}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Median</div>
              <div className="text-xl font-semibold">{formatCurrency(dist.median)}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">75th Percentile</div>
              <div className="text-xl font-semibold">{formatCurrency(dist.p75)}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Maximum</div>
              <div className="text-xl font-semibold">{formatCurrency(dist.max)}</div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
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


