'use client';

/**
 * AI Analytics Dashboard
 * Comprehensive view of AI usage, performance, and quality metrics
 */

import { useState } from 'react';
import { useAIMetrics, useDailyMetrics, useQualityInsights, useCacheStats, useClearCache, usePromptQualityInsights } from '@/hooks/use-ai-analytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Zap,
  Clock,
  DollarSign,
  ThumbsUp,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Database,
  Trash2,
  BarChart3,
  Activity,
  Target,
} from 'lucide-react';
import { Phase2MetricsDashboard } from '@/components/analytics/phase2-metrics-dashboard';

// Prompt Quality Insights Component
function PromptQualityInsightsSection() {
  const { data: insightsData, isLoading } = usePromptQualityInsights();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const insights = insightsData?.insights || [];

  if (insights.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
        <p>No quality issues detected. All prompts are performing well.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {insights.map((insight, index) => (
        <div
          key={index}
          className={`p-4 rounded-lg border ${
            insight.type === 'warning'
              ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950'
              : insight.type === 'improvement'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
              : 'border-green-500 bg-green-50 dark:bg-green-950'
          }`}
        >
          <div className="flex items-start gap-3">
            {insight.type === 'warning' ? (
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            ) : insight.type === 'improvement' ? (
              <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  variant={
                    insight.type === 'warning'
                      ? 'destructive'
                      : insight.type === 'improvement'
                      ? 'default'
                      : 'secondary'
                  }
                >
                  {insight.category}
                </Badge>
                <span className="text-sm font-medium">{insight.message}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {insight.promptSlug !== 'all' ? `Prompt: ${insight.promptSlug}` : 'All prompts'}
              </p>
              {insight.recommendation && (
                <p className="text-sm">{insight.recommendation}</p>
              )}
              {insight.threshold && (
                <p className="text-xs text-muted-foreground mt-2">
                  Current: {insight.value.toFixed(2)} | Threshold: {insight.threshold.toFixed(2)}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AIAnalyticsPage() {
  const [period, setPeriod] = useState<'hour' | 'day' | 'week' | 'month'>('day');
  
  const { data: metrics, isLoading: metricsLoading } = useAIMetrics(period);
  const { data: insights, isLoading: insightsLoading } = useQualityInsights();
  const { data: cacheData, isLoading: cacheLoading } = useCacheStats();
  const clearCache = useClearCache();

  // Get last 7 days for chart
  const endDate = new Date().toISOString().split('T' as any)[0];
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T' as any)[0];
  const { data: dailyData } = useDailyMetrics(startDate, endDate);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(num);
  };

  const formatPercent = (num: number) => `${(num * 100).toFixed(1)}%`;

  if (metricsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Tabs defaultValue="ai" className="space-y-6">
        <TabsList>
          <TabsTrigger value="ai">AI Analytics</TabsTrigger>
          <TabsTrigger value="prompts-models">Prompts & Models</TabsTrigger>
          <TabsTrigger value="phase2">Phase 2 Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Monitor AI usage, performance, and quality metrics
          </p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hour">Last Hour</SelectItem>
            <SelectItem value="day">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(metrics?.totalRequests || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.uniqueUsers || 0} unique users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics?.avgLatencyMs || 0).toFixed(0)}ms</div>
            <p className="text-xs text-muted-foreground">
              P95: {(metrics?.p95LatencyMs || 0).toFixed(0)}ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics?.totalCost || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Avg {formatCurrency(metrics?.avgCostPerRequest || 0)}/request
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfaction Rate</CardTitle>
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercent(metrics?.positiveRatingRate || 0)}</div>
            <Progress value={(metrics?.positiveRatingRate || 0) * 100} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="performance">
            <Activity className="h-4 w-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="cache">
            <Database className="h-4 w-4 mr-2" />
            Cache
          </TabsTrigger>
          <TabsTrigger value="quality">
            <Target className="h-4 w-4 mr-2" />
            Quality
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Requests by Type */}
            <Card>
              <CardHeader>
                <CardTitle>Requests by Type</CardTitle>
                <CardDescription>Distribution of insight types</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(metrics?.requestsByType || {}).map(([type, count]) => (
                    <div key={type} className="flex items-center">
                      <div className="w-32 text-sm font-medium capitalize">{type.replace('_', ' ')}</div>
                      <div className="flex-1">
                        <Progress
                          value={(count / (metrics?.totalRequests || 1)) * 100}
                          className="h-2"
                        />
                      </div>
                      <div className="w-20 text-right text-sm text-muted-foreground">
                        {count} ({formatPercent(count / (metrics?.totalRequests || 1))})
                      </div>
                    </div>
                  ))}
                  {Object.keys(metrics?.requestsByType || {}).length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No data available</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Requests by Model */}
            <Card>
              <CardHeader>
                <CardTitle>Requests by Model</CardTitle>
                <CardDescription>Model usage distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(metrics?.requestsByModel || {}).map(([model, count]) => (
                    <div key={model} className="flex items-center">
                      <div className="w-40 text-sm font-medium truncate">{model}</div>
                      <div className="flex-1">
                        <Progress
                          value={(count / (metrics?.totalRequests || 1)) * 100}
                          className="h-2"
                        />
                      </div>
                      <div className="w-16 text-right text-sm text-muted-foreground">{count}</div>
                    </div>
                  ))}
                  {Object.keys(metrics?.requestsByModel || {}).length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Token Usage */}
          <Card>
            <CardHeader>
              <CardTitle>Token Usage</CardTitle>
              <CardDescription>Input and output token consumption</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-3xl font-bold">{formatNumber(metrics?.totalInputTokens || 0)}</div>
                  <div className="text-sm text-muted-foreground">Input Tokens</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-3xl font-bold">{formatNumber(metrics?.totalOutputTokens || 0)}</div>
                  <div className="text-sm text-muted-foreground">Output Tokens</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-3xl font-bold">{formatNumber(metrics?.avgTokensPerRequest || 0)}</div>
                  <div className="text-sm text-muted-foreground">Avg per Request</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">P50 Latency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(metrics?.p50LatencyMs || 0).toFixed(0)}ms</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">P95 Latency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(metrics?.p95LatencyMs || 0).toFixed(0)}ms</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">P99 Latency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(metrics?.p99LatencyMs || 0).toFixed(0)}ms</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Error Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${(metrics?.errorRate || 0) > 0.05 ? 'text-destructive' : 'text-green-600'}`}>
                  {formatPercent(metrics?.errorRate || 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Daily Trend */}
          <Card>
            <CardHeader>
              <CardTitle>7-Day Trend</CardTitle>
              <CardDescription>Daily request volume and performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(dailyData?.daily || []).map((day) => (
                  <div key={day.date} className="flex items-center gap-4">
                    <div className="w-24 text-sm font-medium">{day.date}</div>
                    <div className="flex-1">
                      <Progress value={(day.requests / 100) * 100} className="h-2" />
                    </div>
                    <div className="w-16 text-right text-sm">{day.requests}</div>
                    <div className="w-24 text-right text-sm text-muted-foreground">
                      {day.avgLatencyMs.toFixed(0)}ms
                    </div>
                  </div>
                ))}
                {(dailyData?.daily || []).length === 0 && (
                  <p className="text-muted-foreground text-center py-4">No data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cache Tab */}
        <TabsContent value="cache" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Cache Hit Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatPercent(cacheData?.stats?.hitRate || metrics?.cacheHitRate || 0)}
                </div>
                <Progress value={(cacheData?.stats?.hitRate || 0) * 100} className="mt-2" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Cache Entries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(cacheData?.stats?.totalEntries || 0)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Cost Saved</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(cacheData?.stats?.totalCostSaved || metrics?.cacheCostSavings || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Tokens Saved</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(cacheData?.stats?.totalTokensSaved || 0)}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Semantic Cache</CardTitle>
                <CardDescription>
                  {cacheData?.enabled ? 'Cache is enabled and operational' : 'Cache is not configured'}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => clearCache.mutate()}
                disabled={!cacheData?.enabled || clearCache.isPending}
              >
                {clearCache.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Clear Cache
              </Button>
            </CardHeader>
            <CardContent>
              {cacheData?.stats && (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-3xl font-bold text-green-600">
                      {formatNumber(cacheData.stats.hitCount)}
                    </div>
                    <div className="text-sm text-muted-foreground">Cache Hits</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-3xl font-bold text-orange-600">
                      {formatNumber(cacheData.stats.missCount)}
                    </div>
                    <div className="text-sm text-muted-foreground">Cache Misses</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-3xl font-bold">
                      {(cacheData.stats.avgLatencySavedMs || 0).toFixed(0)}ms
                    </div>
                    <div className="text-sm text-muted-foreground">Avg Latency Saved</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quality Tab */}
        <TabsContent value="quality" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Positive Rating</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatPercent(metrics?.positiveRatingRate || 0)}
                </div>
                <Progress value={(metrics?.positiveRatingRate || 0) * 100} className="mt-2" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Negative Rating</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatPercent(metrics?.negativeRatingRate || 0)}
                </div>
                <Progress value={(metrics?.negativeRatingRate || 0) * 100} className="mt-2 [&>div]:bg-red-500" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Regeneration Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${(metrics?.regenerationRate || 0) > 0.2 ? 'text-orange-600' : ''}`}>
                  {formatPercent(metrics?.regenerationRate || 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quality Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Quality Insights
              </CardTitle>
              <CardDescription>Automated recommendations for improvement</CardDescription>
            </CardHeader>
            <CardContent>
              {insightsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {(insights?.insights || []).map((insight, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        insight.type === 'warning'
                          ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-900'
                          : insight.type === 'success'
                          ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900'
                          : 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {insight.type === 'warning' && (
                          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                        )}
                        {insight.type === 'success' && (
                          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                        )}
                        {insight.type === 'improvement' && (
                          <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{insight.message}</div>
                            <Badge variant="outline" className="capitalize">
                              {insight.category}
                            </Badge>
                          </div>
                          {insight.recommendation && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {insight.recommendation}
                            </p>
                          )}
                          <div className="text-xs text-muted-foreground mt-2">
                            {insight.metric}: {typeof insight.value === 'number' && insight.value < 1
                              ? formatPercent(insight.value)
                              : insight.value}
                            {insight.threshold && ` (threshold: ${insight.threshold < 1 ? formatPercent(insight.threshold) : insight.threshold})`}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(insights?.insights || []).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                      <p>All metrics are within acceptable ranges</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </TabsContent>

        <TabsContent value="prompts-models" className="space-y-6">
          {/* Prompt & Model Analytics Tab */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Prompt & Model Analytics</h2>
              <p className="text-muted-foreground mt-1">
                Monitor prompt performance and model metrics
              </p>
            </div>

            {/* Prompt Quality Insights */}
            <Card>
              <CardHeader>
                <CardTitle>Prompt Quality Insights</CardTitle>
                <CardDescription>
                  Recommendations and warnings for prompt performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PromptQualityInsightsSection />
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Detailed Analytics</CardTitle>
                <CardDescription>
                  View detailed metrics for specific prompts and models
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>
                    • <strong>Prompt Metrics:</strong> Use the API endpoint <code className="bg-muted px-1 rounded">GET /api/v1/ai/analytics/prompts/:promptId</code> with a specific prompt ID
                  </p>
                  <p>
                    • <strong>Model Performance:</strong> Use the API endpoint <code className="bg-muted px-1 rounded">GET /api/v1/ai/analytics/models/:modelId/performance</code> with a specific model ID
                  </p>
                  <p className="pt-2 text-xs">
                    Detailed analytics views for individual prompts and models will be available in a future update.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="phase2" className="space-y-6">
          <Phase2MetricsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}






