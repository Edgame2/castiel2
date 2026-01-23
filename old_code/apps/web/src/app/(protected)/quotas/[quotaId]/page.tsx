/**
 * Quota Detail Page
 * Detailed view of a specific quota
 */

'use client';

import { useParams } from 'next/navigation';
import { useQuota, useQuotaPerformance, useQuotaForecast } from '@/hooks/use-quotas';
import { QuotaCard } from '@/components/quotas/quota-card';
import { QuotaPerformanceChart } from '@/components/quotas/quota-performance-chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, TrendingUp } from 'lucide-react';

export default function QuotaDetailPage() {
  const params = useParams();
  const quotaId = params.quotaId as string;

  const {
    data: quota,
    isLoading: quotaLoading,
    error: quotaError,
  } = useQuota(quotaId);

  const {
    data: performance,
    isLoading: performanceLoading,
  } = useQuotaPerformance(quotaId);

  const {
    data: forecast,
    isLoading: forecastLoading,
  } = useQuotaForecast(quotaId);

  if (quotaLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (quotaError || !quota) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>Failed to load quota. Please try again.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Quota Details</h1>
        <p className="text-muted-foreground">
          Performance tracking and forecasting for this quota
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <QuotaCard quota={quota} />
        
        {forecast && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Forecast
              </CardTitle>
              <CardDescription>
                Projected performance scenarios
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Best Case</div>
                  <div className="text-2xl font-bold text-green-600">
                    {forecast.projectedAttainment.bestCase.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Base Case</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {forecast.projectedAttainment.baseCase.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Worst Case</div>
                  <div className="text-2xl font-bold text-red-600">
                    {forecast.projectedAttainment.worstCase.toFixed(1)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <QuotaPerformanceChart quota={quota} showForecast={true} />
    </div>
  );
}


