/**
 * Pipeline Health Component
 * Displays comprehensive pipeline health metrics and recommendations
 */

'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  BarChart3,
  Gauge,
  Target,
  Shield,
} from 'lucide-react';
import { usePipelineHealth } from '@/hooks/use-cais-services';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { handleApiError } from '@/lib/api/client';
import type { PipelineHealth } from '@/lib/api/cais-services';

interface PipelineHealthProps {
  className?: string;
  onRefresh?: () => void;
}

export function PipelineHealth({ className, onRefresh }: PipelineHealthProps) {
  const { user } = useAuth();
  const tenantId = user?.tenantId || '';
  const userId = user?.id || '';

  const {
    data: health,
    isLoading,
    error,
    refetch,
  } = usePipelineHealth(tenantId, userId);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'at_risk':
        return 'bg-yellow-500';
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Get status badge variant
  const getStatusVariant = (status: string): 'default' | 'destructive' | 'secondary' => {
    switch (status) {
      case 'healthy':
        return 'default';
      case 'at_risk':
        return 'secondary';
      case 'critical':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return CheckCircle2;
      case 'at_risk':
        return AlertTriangle;
      case 'critical':
        return XCircle;
      default:
        return Activity;
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    refetch();
    onRefresh?.();
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    const errorMessage = handleApiError(error);
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Failed to Load Pipeline Health</AlertTitle>
            <AlertDescription>
              {typeof errorMessage === 'string' ? errorMessage : errorMessage.message}
            </AlertDescription>
          </Alert>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!health) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            No pipeline health data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const StatusIcon = getStatusIcon(health.status);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Overall Health Score */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Pipeline Health
              </CardTitle>
              <CardDescription>
                Comprehensive health analysis of your sales pipeline
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {/* Overall Score */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Overall Score</p>
                    <p className="text-2xl font-bold">{health.overallScore.toFixed(0)}</p>
                  </div>
                  <div className={cn('h-12 w-12 rounded-full flex items-center justify-center', getStatusColor(health.status))}>
                    <StatusIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <Badge variant={getStatusVariant(health.status)} className="mt-2">
                  {health.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </CardContent>
            </Card>

            {/* Stage Health */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Stage Health</p>
                    <p className="text-2xl font-bold">{health.scoreBreakdown.stage.toFixed(0)}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="mt-2">
                  {health.scoreBreakdown.stage >= 70 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Velocity Health */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Velocity Health</p>
                    <p className="text-2xl font-bold">{health.scoreBreakdown.velocity.toFixed(0)}</p>
                  </div>
                  <Gauge className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="mt-2">
                  {health.scoreBreakdown.velocity >= 70 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Coverage Health */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Coverage Health</p>
                    <p className="text-2xl font-bold">{health.scoreBreakdown.coverage.toFixed(0)}</p>
                  </div>
                  <Target className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="mt-2">
                  {health.scoreBreakdown.coverage >= 70 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Risk Health */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Risk Health</p>
                    <p className="text-2xl font-bold">{health.scoreBreakdown.risk.toFixed(0)}</p>
                  </div>
                  <Shield className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="mt-2">
                  {health.scoreBreakdown.risk >= 70 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Breakdown */}
      <Tabs defaultValue="stages" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stages">Stage Health</TabsTrigger>
          <TabsTrigger value="velocity">Velocity</TabsTrigger>
          <TabsTrigger value="coverage">Coverage</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
          <TabsTrigger value="risk">Risk</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="stages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stage Health Breakdown</CardTitle>
              <CardDescription>Health metrics for each pipeline stage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {health.stageHealth.map((stage) => (
                  <div key={stage.stage} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{stage.stage}</h4>
                      <Badge variant={stage.score >= 70 ? 'default' : stage.score >= 50 ? 'secondary' : 'destructive'}>
                        {stage.score.toFixed(0)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Opportunities</p>
                        <p className="font-medium">{stage.opportunities}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Value</p>
                        <p className="font-medium">{formatCurrency(stage.value)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Avg Age</p>
                        <p className="font-medium">{stage.averageAge.toFixed(0)} days</p>
                      </div>
                    </div>
                    {stage.issues.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-muted-foreground mb-1">Issues:</p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground">
                          {stage.issues.map((issue, idx) => (
                            <li key={idx}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="velocity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Velocity Health</CardTitle>
              <CardDescription>Sales velocity metrics and bottlenecks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Overall Velocity Score</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ width: `${health.velocityHealth.score}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{health.velocityHealth.score.toFixed(0)}</span>
                  </div>
                </div>
                {health.velocityHealth.bottlenecks.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Bottlenecks</p>
                    <div className="space-y-2">
                      {health.velocityHealth.bottlenecks.map((bottleneck, idx) => (
                        <div key={idx} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{bottleneck.stage}</span>
                            <Badge variant={bottleneck.severity === 'high' ? 'destructive' : bottleneck.severity === 'medium' ? 'secondary' : 'default'}>
                              {bottleneck.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Average: {bottleneck.averageDays.toFixed(0)} days (Threshold: {bottleneck.threshold.toFixed(0)} days)
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coverage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Coverage Health</CardTitle>
              <CardDescription>Pipeline coverage metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Coverage Ratio</p>
                    <p className="text-2xl font-bold">{(health.coverageHealth.coverageRatio * 100).toFixed(0)}%</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Months Coverage</p>
                    <p className="text-2xl font-bold">{health.coverageHealth.monthsCoverage.toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Score</p>
                    <p className="text-2xl font-bold">{health.coverageHealth.score.toFixed(0)}</p>
                  </div>
                </div>
                {health.coverageHealth.recommendations.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Recommendations</p>
                    <ul className="list-disc list-inside space-y-1">
                      {health.coverageHealth.recommendations.map((rec, idx) => (
                        <li key={idx} className="text-sm">{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quality Health</CardTitle>
              <CardDescription>Opportunity quality metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Average Quality</p>
                  <p className="text-2xl font-bold">{(health.qualityHealth.averageQuality * 100).toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">High Quality %</p>
                  <p className="text-2xl font-bold">{(health.qualityHealth.highQualityPercentage * 100).toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Low Quality %</p>
                  <p className="text-2xl font-bold">{(health.qualityHealth.lowQualityPercentage * 100).toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Score</p>
                  <p className="text-2xl font-bold">{health.qualityHealth.score.toFixed(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Risk Health</CardTitle>
              <CardDescription>Risk metrics and revenue at risk</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Average Risk</p>
                    <p className="text-2xl font-bold">{(health.riskHealth.averageRisk * 100).toFixed(0)}%</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">High Risk %</p>
                    <p className="text-2xl font-bold">{(health.riskHealth.highRiskPercentage * 100).toFixed(0)}%</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">Total Revenue at Risk</p>
                    <p className="text-2xl font-bold">{formatCurrency(health.riskHealth.totalRevenueAtRisk)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Score</p>
                    <p className="text-2xl font-bold">{health.riskHealth.score.toFixed(0)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
              <CardDescription>Actionable recommendations to improve pipeline health</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {health.recommendations.map((rec, idx) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'secondary' : 'default'}>
                            {rec.priority}
                          </Badge>
                          <Badge variant="outline">{rec.type}</Badge>
                        </div>
                        <p className="font-medium">{rec.description}</p>
                        <p className="text-sm text-muted-foreground mt-1">{rec.expectedImpact}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {health.recommendations.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No recommendations at this time. Your pipeline is healthy!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
