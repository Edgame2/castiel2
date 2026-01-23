/**
 * Consensus Forecast Component
 * Displays aggregated forecast from multiple sources
 */

'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  Users,
  BarChart3,
  AlertTriangle,
  Target,
  DollarSign,
} from 'lucide-react';
import { caisApi, type ConsensusForecast } from '@/lib/api/cais-services';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

interface ConsensusForecastProps {
  periodKey?: string;
  className?: string;
}

export function ConsensusForecast({ periodKey, className }: ConsensusForecastProps) {
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const [localPeriodKey, setLocalPeriodKey] = useState(periodKey || '');
  const [forecasts, setForecasts] = useState<Array<{
    source: string;
    forecast: number;
    confidence: number;
  }>>([
    { source: 'rep', forecast: 0, confidence: 0.7 },
  ]);

  const {
    data: consensus,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['consensus-forecast', tenantId, localPeriodKey, forecasts],
    queryFn: () => {
      if (!tenantId || !localPeriodKey || forecasts.length === 0) {
        throw new Error('Missing required fields');
      }
      return caisApi.generateConsensusForecast({
        tenantId,
        periodKey: localPeriodKey,
        forecasts: forecasts.map(f => ({
          ...f,
          timestamp: new Date(),
        })),
      });
    },
    enabled: !!tenantId && !!localPeriodKey && forecasts.length > 0 && forecasts.every(f => f.forecast > 0),
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Use disagreement from API if available, otherwise calculate from range
  const disagreementData = useMemo(() => {
    if (!consensus) return null;
    
    // If API provides disagreement data, use it
    if (consensus.disagreement) {
      return consensus.disagreement;
    }
    
    // Fallback: Calculate disagreement from range spread (for backward compatibility)
    const range = consensus.range || consensus.consensus.confidenceInterval;
    const consensusValue = typeof consensus.consensus === 'number' ? consensus.consensus : consensus.consensus.value;
    const rangeSpread = range.high - range.low;
    const spreadPercentage = consensusValue > 0 ? (rangeSpread / consensusValue) * 100 : 0;
    let level: 'high' | 'medium' | 'low';
    if (spreadPercentage > 30) {
      level = 'high';
    } else if (spreadPercentage > 15) {
      level = 'medium';
    } else {
      level = 'low';
    }
    
    // Calculate max deviation from contributors/sources
    const contributors = (consensus.contributors || consensus.sources || []) as Array<{
      source: string;
      forecast: number;
    }>;
    const forecasts = contributors.map(c => c.forecast);
    const maxDeviation = forecasts.length > 0 
      ? Math.max(...forecasts.map(f => Math.abs(f - consensusValue)))
      : rangeSpread / 2;
    const disagreementScore = spreadPercentage / 100;
    
    // Return sources as array of strings for fallback case
    return {
      level,
      score: disagreementScore,
      maxDeviation,
      sources: contributors
        .filter(c => Math.abs(c.forecast - consensusValue) > maxDeviation * 0.5)
        .map(c => c.source), // Array of source strings for fallback
    };
  }, [consensus]);

  const disagreementLevel = useMemo(() => {
    if (!disagreementData) return null;
    const { level } = disagreementData;
    if (level === 'high') return { color: 'destructive', label: 'High Disagreement' };
    if (level === 'medium') return { color: 'secondary', label: 'Medium Disagreement' };
    return { color: 'default', label: 'Low Disagreement' };
  }, [disagreementData]);

  if (isLoading) {
    return (
      <div className={className}>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to generate consensus forecast. Please try again.
            <button onClick={() => refetch()} className="ml-2 underline">
              Retry
            </button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!consensus) {
    return (
      <div className={className}>
        <Card>
          <CardHeader>
            <CardTitle>Consensus Forecast</CardTitle>
            <CardDescription>Enter forecast sources to generate consensus</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="periodKey">Period Key (e.g., 2024-Q1)</Label>
                <Input
                  id="periodKey"
                  value={localPeriodKey}
                  onChange={(e) => setLocalPeriodKey(e.target.value)}
                  placeholder="2024-Q1"
                />
              </div>
              <div className="space-y-2">
                <Label>Forecast Sources</Label>
                {forecasts.map((f, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      placeholder="Source (e.g., rep, manager)"
                      value={f.source}
                      onChange={(e) => {
                        const newForecasts = [...forecasts];
                        newForecasts[i].source = e.target.value;
                        setForecasts(newForecasts);
                      }}
                    />
                    <Input
                      type="number"
                      placeholder="Forecast"
                      value={f.forecast || ''}
                      onChange={(e) => {
                        const newForecasts = [...forecasts];
                        newForecasts[i].forecast = parseFloat(e.target.value) || 0;
                        setForecasts(newForecasts);
                      }}
                    />
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      placeholder="Confidence (0-1)"
                      value={f.confidence || ''}
                      onChange={(e) => {
                        const newForecasts = [...forecasts];
                        newForecasts[i].confidence = parseFloat(e.target.value) || 0;
                        setForecasts(newForecasts);
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setForecasts(forecasts.filter((_, idx) => idx !== i));
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setForecasts([...forecasts, { source: '', forecast: 0, confidence: 0.7 }]);
                  }}
                >
                  Add Source
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Consensus Forecast
              </CardTitle>
              <CardDescription>
                Aggregated forecast from {(consensus.contributors || consensus.sources || []).length} sources
              </CardDescription>
            </div>
            <Badge variant={disagreementLevel?.color as any}>
              {disagreementLevel?.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Consensus Value */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Consensus Forecast</span>
              <span className="text-3xl font-bold">
                {formatCurrency(typeof consensus.consensus === 'number' ? consensus.consensus : consensus.consensus.value)}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                Confidence: {((typeof consensus.consensus === 'object' ? consensus.consensus.confidence : consensus.confidence || 0) * 100).toFixed(1)}%
              </span>
              <span>
                Range: {formatCurrency(consensus.consensus.confidenceInterval.lower)} - {formatCurrency(consensus.consensus.confidenceInterval.upper)}
              </span>
            </div>
            <Progress 
              value={((typeof consensus.consensus === 'object' ? consensus.consensus.confidence : consensus.confidence || 0) * 100)} 
              className="mt-2" 
            />
          </div>

          {/* Contributors */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-3">Contributors</h3>
            <div className="space-y-2">
              {(consensus.contributors || consensus.sources || []).map((contributor: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{contributor.source}</Badge>
                    <span className="font-medium">{formatCurrency(contributor.forecast)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-muted-foreground">
                      Confidence: {(contributor.confidence * 100).toFixed(0)}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Weight: {(contributor.weight * 100).toFixed(0)}%
                    </div>
                    <Progress value={contributor.weight * 100} className="w-20" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Disagreement Analysis */}
          {disagreementData && disagreementData.level !== 'low' && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-sm">Disagreement Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Disagreement Score</span>
                    <span className="font-medium">{(disagreementData.score * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Max Deviation</span>
                    <span className="font-medium">
                      {formatCurrency(Math.abs(disagreementData.maxDeviation))}
                    </span>
                  </div>
                  {disagreementData.sources && disagreementData.sources.length > 0 && (
                    <div className="mt-4">
                      <div className="text-sm font-medium mb-2">Deviations:</div>
                      <div className="space-y-1">
                        {disagreementData.sources.map((source: string, i: number) => {
                          const sourceData = consensus.sources.find(s => s.source === source);
                          const consensusValue = typeof consensus.consensus === 'number' ? consensus.consensus : consensus.consensus.value;
                          const deviation = sourceData ? sourceData.forecast - consensusValue : 0;
                          return (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{source}</span>
                            <span className={deviation > 0 ? 'text-green-600' : 'text-red-600'}>
                              {deviation > 0 ? '+' : ''}
                              {formatCurrency(deviation)}
                            </span>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reconciliation */}
          {consensus.reconciliation?.reconciled && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Reconciliation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Reconciled Value</span>
                    <span className="font-bold">{formatCurrency(consensus.reconciliation.reconciledValue || 0)}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Method: {consensus.reconciliation.reconciliationMethod}
                  </div>
                  {consensus.reconciliation.notes && (
                    <div className="text-sm text-muted-foreground">
                      Notes: {consensus.reconciliation.notes}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
