/**
 * Forecast Decomposition Component
 * Displays forecast breakdown by time, source, confidence, and drivers
 */

'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  PieChart,
  BarChart3,
  Target,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import { caisApi, type ForecastDecomposition } from '@/lib/api/cais-services';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

interface ForecastDecompositionProps {
  forecastId?: string;
  className?: string;
}

export function ForecastDecomposition({ forecastId, className }: ForecastDecompositionProps) {
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const [localForecastId, setLocalForecastId] = useState(forecastId || '');
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth() + 3, 0).toISOString().split('T')[0]
  );

  const {
    data: decomposition,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['forecast-decomposition', tenantId, localForecastId, startDate, endDate],
    queryFn: () => {
      if (!tenantId || !localForecastId) throw new Error('Missing tenantId or forecastId');
      return caisApi.decomposeForecast({
        tenantId,
        forecastId: localForecastId,
        forecastRange: {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        },
      });
    },
    enabled: !!tenantId && !!localForecastId && !!startDate && !!endDate,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const TrendIcon = useMemo(() => {
    if (!decomposition) return Minus;
    const direction = decomposition.timeDecomposition.trendDirection;
    if (direction === 'increasing') return TrendingUp;
    if (direction === 'decreasing') return TrendingDown;
    return Minus;
  }, [decomposition]);

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
            Failed to load forecast decomposition. Please try again.
            <button onClick={() => refetch()} className="ml-2 underline">
              Retry
            </button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!decomposition) {
    return (
      <div className={className}>
        <Card>
          <CardHeader>
            <CardTitle>Forecast Decomposition</CardTitle>
            <CardDescription>Enter forecast details to analyze</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="forecastId">Forecast ID</Label>
                <Input
                  id="forecastId"
                  value={localForecastId}
                  onChange={(e) => setLocalForecastId(e.target.value)}
                  placeholder="Enter forecast ID"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
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
                <PieChart className="h-5 w-5" />
                Forecast Decomposition
              </CardTitle>
              <CardDescription>
                Detailed breakdown of forecast components
              </CardDescription>
            </div>
            <Badge variant="outline">
              <TrendIcon className="h-3 w-3 mr-1" />
              {decomposition.timeDecomposition.trendDirection}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="time" className="mt-4">
            <TabsList>
              <TabsTrigger value="time">Time</TabsTrigger>
              <TabsTrigger value="source">Source</TabsTrigger>
              <TabsTrigger value="confidence">Confidence</TabsTrigger>
              <TabsTrigger value="drivers">Drivers</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            </TabsList>

            <TabsContent value="time" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(decomposition.timeDecomposition.trend)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Base trend component
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Seasonality</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(decomposition.timeDecomposition.seasonality)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Seasonal adjustment
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Irregular</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(decomposition.timeDecomposition.irregular)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Random component
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="source" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Pipeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(decomposition.sourceDecomposition.pipeline)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {(decomposition.sourceDecomposition.percentages.pipeline * 100).toFixed(1)}%
                    </div>
                    <Progress
                      value={decomposition.sourceDecomposition.percentages.pipeline * 100}
                      className="mt-2"
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">New Business</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(decomposition.sourceDecomposition.newBusiness)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {(decomposition.sourceDecomposition.percentages.newBusiness * 100).toFixed(1)}%
                    </div>
                    <Progress
                      value={decomposition.sourceDecomposition.percentages.newBusiness * 100}
                      className="mt-2"
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Expansions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(decomposition.sourceDecomposition.expansions)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {(decomposition.sourceDecomposition.percentages.expansions * 100).toFixed(1)}%
                    </div>
                    <Progress
                      value={decomposition.sourceDecomposition.percentages.expansions * 100}
                      className="mt-2"
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Renewals</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(decomposition.sourceDecomposition.renewals)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {(decomposition.sourceDecomposition.percentages.renewals * 100).toFixed(1)}%
                    </div>
                    <Progress
                      value={decomposition.sourceDecomposition.percentages.renewals * 100}
                      className="mt-2"
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="confidence" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Commit</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(decomposition.confidenceDecomposition.commit)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      High confidence (80%+)
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Best Case</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(decomposition.confidenceDecomposition.bestCase)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Optimistic scenario
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Upside</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(decomposition.confidenceDecomposition.upside)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Additional potential
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Risk</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-destructive">
                      {formatCurrency(decomposition.confidenceDecomposition.risk)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      At-risk amount
                    </div>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Confidence Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">High</div>
                      <div className="text-lg font-semibold">
                        {(decomposition.confidenceDecomposition.confidenceDistribution.high * 100).toFixed(1)}%
                      </div>
                      <Progress
                        value={decomposition.confidenceDecomposition.confidenceDistribution.high * 100}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Medium</div>
                      <div className="text-lg font-semibold">
                        {(decomposition.confidenceDecomposition.confidenceDistribution.medium * 100).toFixed(1)}%
                      </div>
                      <Progress
                        value={decomposition.confidenceDecomposition.confidenceDistribution.medium * 100}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Low</div>
                      <div className="text-lg font-semibold">
                        {(decomposition.confidenceDecomposition.confidenceDistribution.low * 100).toFixed(1)}%
                      </div>
                      <Progress
                        value={decomposition.confidenceDecomposition.confidenceDistribution.low * 100}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="drivers" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Deal Quality</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(decomposition.driverDecomposition.dealQuality)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Score: {(decomposition.driverDecomposition.driverScores.dealQuality * 100).toFixed(1)}%
                    </div>
                    <Progress
                      value={decomposition.driverDecomposition.driverScores.dealQuality * 100}
                      className="mt-2"
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Velocity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(decomposition.driverDecomposition.velocity)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Score: {(decomposition.driverDecomposition.driverScores.velocity * 100).toFixed(1)}%
                    </div>
                    <Progress
                      value={decomposition.driverDecomposition.driverScores.velocity * 100}
                      className="mt-2"
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Conversion</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(decomposition.driverDecomposition.conversion)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Score: {(decomposition.driverDecomposition.driverScores.conversion * 100).toFixed(1)}%
                    </div>
                    <Progress
                      value={decomposition.driverDecomposition.driverScores.conversion * 100}
                      className="mt-2"
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">New Business</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(decomposition.driverDecomposition.newBusiness)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Score: {(decomposition.driverDecomposition.driverScores.newBusiness * 100).toFixed(1)}%
                    </div>
                    <Progress
                      value={decomposition.driverDecomposition.driverScores.newBusiness * 100}
                      className="mt-2"
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-4">
              <div className="space-y-4">
                {decomposition.recommendations.map((rec, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{rec.description}</CardTitle>
                        <Badge
                          variant={
                            rec.priority === 'high'
                              ? 'destructive'
                              : rec.priority === 'medium'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {rec.priority}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground">
                        <div className="mb-2">
                          <span className="font-medium">Type:</span> {rec.type}
                        </div>
                        <div>
                          <span className="font-medium">Expected Impact:</span> {rec.expectedImpact}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
