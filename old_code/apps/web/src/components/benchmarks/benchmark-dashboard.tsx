/**
 * Benchmark Dashboard Component
 * Main interface for viewing benchmarks
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, TrendingUp, DollarSign, Calendar, AlertCircle, ShieldOff } from 'lucide-react';
import { usePermissionCheck } from '@/hooks/use-permission-check';
import { useWinRates, useClosingTimes, useDealSizeDistribution } from '@/hooks/use-benchmarks';
import { WinRateBenchmarkCard } from './win-rate-benchmark';
import { ClosingTimeBenchmarkCard } from './closing-time-benchmark';
import { DealSizeBenchmarkCard } from './deal-size-benchmark';
import { ErrorDisplay } from '@/components/risk-analysis/error-display';

export function BenchmarkDashboard() {
  const [scope, setScope] = useState<'tenant' | 'industry' | 'peer'>('tenant');
  const [industryId, setIndustryId] = useState<string | undefined>(undefined);
  const [period, setPeriod] = useState<'30d' | '90d' | '1y' | 'all'>('90d');

  // Check permissions: require team or tenant risk read access
  const canReadTeamRisks = usePermissionCheck('risk:read:team');
  const canReadTenantRisks = usePermissionCheck('risk:read:tenant');
  const hasAccess = canReadTeamRisks || canReadTenantRisks;

  // Calculate date range
  const getDateRange = () => {
    const endDate = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'all':
        return undefined;
    }
    
    return { startDate, endDate };
  };

  const dateRange = getDateRange();

  const params = {
    scope,
    industryId,
    ...(dateRange && { startDate: dateRange.startDate, endDate: dateRange.endDate }),
  };

  const {
    data: winRates,
    isLoading: winRatesLoading,
    error: winRatesError,
    refetch: refetchWinRates,
  } = useWinRates(params);

  const {
    data: closingTimes,
    isLoading: closingTimesLoading,
    error: closingTimesError,
    refetch: refetchClosingTimes,
  } = useClosingTimes(params);

  const {
    data: dealSizes,
    isLoading: dealSizesLoading,
    error: dealSizesError,
    refetch: refetchDealSizes,
  } = useDealSizeDistribution(params);

  // Permission check
  if (!hasAccess) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <ShieldOff className="h-12 w-12 text-muted-foreground" />
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Access Denied</h3>
              <p className="text-sm text-muted-foreground">
                You don't have permission to view benchmarks. Manager or Director role required.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Benchmarks</h1>
          <p className="text-muted-foreground mt-1">
            Compare your performance against industry standards
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Scope</label>
              <Select value={scope} onValueChange={(value: any) => setScope(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tenant">Tenant</SelectItem>
                  <SelectItem value="industry">Industry</SelectItem>
                  <SelectItem value="peer">Peer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Period</label>
              <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                  <SelectItem value="1y">Last Year</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Benchmarks */}
      <Tabs defaultValue="win-rates" className="w-full">
        <TabsList>
          <TabsTrigger value="win-rates">
            <TrendingUp className="h-4 w-4 mr-2" />
            Win Rates
          </TabsTrigger>
          <TabsTrigger value="closing-times">
            <Calendar className="h-4 w-4 mr-2" />
            Closing Times
          </TabsTrigger>
          <TabsTrigger value="deal-sizes">
            <DollarSign className="h-4 w-4 mr-2" />
            Deal Sizes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="win-rates" className="mt-4">
          {winRatesLoading ? (
            <Card>
              <CardContent className="pt-6">
                <Skeleton className="h-64" />
              </CardContent>
            </Card>
          ) : winRatesError ? (
            <Card>
              <CardContent className="pt-6">
                <ErrorDisplay 
                  error={winRatesError} 
                  onRetry={() => refetchWinRates()}
                  title="Failed to Load Win Rate Benchmarks"
                />
              </CardContent>
            </Card>
          ) : winRates ? (
            <WinRateBenchmarkCard benchmark={winRates} />
          ) : null}
        </TabsContent>

        <TabsContent value="closing-times" className="mt-4">
          {closingTimesLoading ? (
            <Card>
              <CardContent className="pt-6">
                <Skeleton className="h-64" />
              </CardContent>
            </Card>
          ) : closingTimesError ? (
            <Card>
              <CardContent className="pt-6">
                <ErrorDisplay 
                  error={closingTimesError} 
                  onRetry={() => refetchClosingTimes()}
                  title="Failed to Load Closing Time Benchmarks"
                />
              </CardContent>
            </Card>
          ) : closingTimes ? (
            <ClosingTimeBenchmarkCard benchmark={closingTimes} />
          ) : null}
        </TabsContent>

        <TabsContent value="deal-sizes" className="mt-4">
          {dealSizesLoading ? (
            <Card>
              <CardContent className="pt-6">
                <Skeleton className="h-64" />
              </CardContent>
            </Card>
          ) : dealSizesError ? (
            <Card>
              <CardContent className="pt-6">
                <ErrorDisplay 
                  error={dealSizesError} 
                  onRetry={() => refetchDealSizes()}
                  title="Failed to Load Deal Size Benchmarks"
                />
              </CardContent>
            </Card>
          ) : dealSizes ? (
            <DealSizeBenchmarkCard benchmark={dealSizes} />
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}


