/**
 * Quota Card Component
 * Individual quota card with performance metrics
 */

'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Target, TrendingUp, AlertCircle, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuotaPerformance, useQuotaForecast } from '@/hooks/use-quotas';
import { ErrorDisplay } from '@/components/risk-analysis/error-display';
import type { Quota } from '@/types/quota';

interface QuotaCardProps {
  quota: Quota;
  onViewDetails?: (quotaId: string) => void;
  onEdit?: (quotaId: string) => void;
  onDelete?: (quotaId: string) => void;
  onCalculatePerformance?: (quotaId: string) => void;
}

export function QuotaCard({
  quota,
  onViewDetails,
  onEdit,
  onDelete,
  onCalculatePerformance,
}: QuotaCardProps) {
  const {
    data: performance,
    isLoading: performanceLoading,
    error: performanceError,
    refetch: refetchPerformance,
  } = useQuotaPerformance(quota.id, false); // Don't auto-fetch, use quota.performance

  const {
    data: forecast,
    isLoading: forecastLoading,
    error: forecastError,
  } = useQuotaForecast(quota.id, false); // Optional forecast

  // Use performance from quota or fetched performance
  const currentPerformance = performance || quota.performance;
  
  // Show loading state if performance is being fetched
  if (performanceLoading && !quota.performance) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }
  
  // Show error state if performance fetch failed and no fallback
  if (performanceError && !quota.performance) {
    return (
      <Card>
        <CardContent className="pt-6">
          <ErrorDisplay 
            error={performanceError} 
            onRetry={() => refetchPerformance()}
            title="Failed to Load Quota Performance"
          />
        </CardContent>
      </Card>
    );
  }

  // Format currency
  const formatCurrency = (value: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format percentage
  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Format date range
  const formatDateRange = () => {
    const start = new Date(quota.period.startDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const end = new Date(quota.period.endDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${start} - ${end}`;
  };

  // Get attainment color
  const getAttainmentColor = (attainment: number) => {
    if (attainment >= 100) return 'text-green-600';
    if (attainment >= 80) return 'text-blue-600';
    if (attainment >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Calculate progress percentage (capped at 100% for display)
  const progressPercent = Math.min(currentPerformance.attainment, 100);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5" />
              {quota.quotaType.charAt(0).toUpperCase() + quota.quotaType.slice(1)} Quota
            </CardTitle>
            <CardDescription className="mt-1">
              {formatDateRange()} • {quota.period.type}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onViewDetails && (
                <DropdownMenuItem onClick={() => onViewDetails(quota.id)}>
                  View Details
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(quota.id)}>
                  Edit
                </DropdownMenuItem>
              )}
              {onCalculatePerformance && (
                <DropdownMenuItem onClick={() => onCalculatePerformance(quota.id)}>
                  Recalculate Performance
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(quota.id)}
                  className="text-destructive focus:text-destructive"
                >
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Target */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-muted-foreground">Target</span>
            <span className="text-sm font-semibold">
              {formatCurrency(quota.target.amount, quota.target.currency)}
            </span>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Actual</span>
            <span className="text-sm font-semibold">
              {formatCurrency(currentPerformance.actual, quota.target.currency)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Forecasted</span>
            <span className="text-sm font-semibold">
              {formatCurrency(currentPerformance.forecasted, quota.target.currency)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Risk-Adjusted</span>
            <span className="text-sm font-semibold">
              {formatCurrency(currentPerformance.riskAdjusted, quota.target.currency)}
            </span>
          </div>
        </div>

        {/* Attainment */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Attainment</span>
            <span className={`text-lg font-bold ${getAttainmentColor(currentPerformance.attainment)}`}>
              {formatPercent(currentPerformance.attainment)}
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Risk-Adjusted: {formatPercent(currentPerformance.riskAdjustedAttainment)}</span>
            {forecast && (
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Forecast: {formatPercent(forecast.projectedAttainment.baseCase)}
              </span>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Badge
            variant={
              currentPerformance.attainment >= 100
                ? 'default'
                : currentPerformance.attainment >= 80
                ? 'default'
                : currentPerformance.attainment >= 50
                ? 'secondary'
                : 'destructive'
            }
          >
            {currentPerformance.attainment >= 100
              ? 'Achieved'
              : currentPerformance.attainment >= 80
              ? 'On Track'
              : currentPerformance.attainment >= 50
              ? 'At Risk'
              : 'Behind'}
          </Badge>
          {quota.target.opportunityCount && (
            <Badge variant="outline" className="ml-auto">
              {quota.target.opportunityCount} deals
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

