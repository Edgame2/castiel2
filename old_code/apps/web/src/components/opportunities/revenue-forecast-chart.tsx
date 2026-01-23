/**
 * Revenue Forecast Chart Component
 * Displays revenue forecast with multiple scenarios using Recharts
 * Widget-compatible component
 */

'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, DollarSign, AlertTriangle } from 'lucide-react';
import type { RevenueForecast } from '@/lib/api/opportunities';
import type { WidgetCompatibleProps } from '@/types/widget-compatible';
import { cn } from '@/lib/utils';

interface RevenueForecastChartProps extends WidgetCompatibleProps<RevenueForecast> {
  currency?: string;
  showScenarios?: boolean;
  chartType?: 'line' | 'bar';
}

export function RevenueForecastChart({
  data,
  isLoading,
  error,
  onRefresh,
  className,
  currency = 'USD',
  showScenarios = true,
  chartType = 'line',
}: RevenueForecastChartProps) {
  // Transform forecast data for chart
  const chartData = useMemo(() => {
    if (!data?.byPeriod) return [];

    return data.byPeriod.map((period) => ({
      period: period.period,
      best: period.best,
      base: period.base,
      riskAdjusted: period.riskAdjusted,
      worstCase: period.worstCase,
      opportunityCount: period.opportunityCount,
    }));
  }, [data]);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card className={className}>
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
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Revenue Forecast
          </CardTitle>
          <CardDescription>Failed to load forecast data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            {error.message || 'Error loading chart data'}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || chartData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Revenue Forecast
          </CardTitle>
          <CardDescription>No forecast data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Forecast data will appear when opportunities are available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Revenue Forecast
            </CardTitle>
            <CardDescription>
              {data.period === 'month' && 'Monthly'}
              {data.period === 'quarter' && 'Quarterly'}
              {data.period === 'year' && 'Yearly'}
              {data.period === 'custom' && 'Custom'} forecast scenarios
            </CardDescription>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Refresh
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Scenario Summary Cards */}
        {showScenarios && data.scenarios && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {data.scenarios.map((scenario) => (
              <div
                key={scenario.name}
                className="border rounded-lg p-3 space-y-1"
              >
                <div className="text-xs font-medium text-muted-foreground uppercase">
                  {scenario.name.replace('-', ' ')}
                </div>
                <div className="text-lg font-semibold">
                  {formatCurrency(scenario.revenue)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {scenario.opportunityCount} opportunities
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Chart */}
        <Tabs defaultValue={chartType} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="line">Line Chart</TabsTrigger>
            <TabsTrigger value="bar">Bar Chart</TabsTrigger>
          </TabsList>

          <TabsContent value="line" className="mt-0">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="period"
                  className="text-xs"
                  tick={{ fill: 'currentColor' }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: 'currentColor' }}
                  tickFormatter={formatCurrency}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="best"
                  stroke="#22c55e"
                  strokeWidth={2}
                  name="Best Case"
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="base"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Base Case"
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="riskAdjusted"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name="Risk-Adjusted"
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="worstCase"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Worst Case"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="bar" className="mt-0">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="period"
                  className="text-xs"
                  tick={{ fill: 'currentColor' }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: 'currentColor' }}
                  tickFormatter={formatCurrency}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="best" fill="#22c55e" name="Best Case" />
                <Bar dataKey="base" fill="#3b82f6" name="Base Case" />
                <Bar dataKey="riskAdjusted" fill="#f59e0b" name="Risk-Adjusted" />
                <Bar dataKey="worstCase" fill="#ef4444" name="Worst Case" />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>

        {/* Period Range */}
        <div className="mt-4 text-sm text-muted-foreground text-center">
          Forecast period: {new Date(data.range.startDate).toLocaleDateString()} -{' '}
          {new Date(data.range.endDate).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
}



