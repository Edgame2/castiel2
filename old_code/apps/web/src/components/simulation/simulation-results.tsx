/**
 * Simulation Results Component
 * Display simulation results with metrics and forecasts
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Calendar, AlertTriangle } from 'lucide-react';
import type { SimulationResults as SimulationResultsType } from '@/types/risk-analysis';

interface SimulationResultsProps {
  results: SimulationResultsType;
  currency?: string;
}

export function SimulationResults({ results, currency = 'USD' }: SimulationResultsProps) {
  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format percentage
  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Get risk level
  const getRiskLevel = (riskScore: number) => {
    if (riskScore >= 0.7) return { label: 'High', color: 'destructive' };
    if (riskScore >= 0.4) return { label: 'Medium', color: 'default' };
    return { label: 'Low', color: 'secondary' };
  };

  const riskLevel = getRiskLevel(results.riskScore);

  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Risk Score</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold">{formatPercent(results.riskScore)}</div>
              <Badge variant={riskLevel.color as any}>{riskLevel.label}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Revenue at Risk</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div className="text-2xl font-bold">{formatCurrency(results.revenueAtRisk)}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Expected Close Date</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="text-lg font-semibold">{formatDate(results.expectedCloseDate)}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Scenarios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Forecast Scenarios
          </CardTitle>
          <CardDescription>
            Projected revenue outcomes based on simulation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Best Case</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(results.forecastScenarios.bestCase)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Base Case</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(results.forecastScenarios.baseCase)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium">Worst Case</span>
              </div>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(results.forecastScenarios.worstCase)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


