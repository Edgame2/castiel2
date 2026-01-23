'use client';

/**
 * Proactive Insights Analytics Page
 * Displays delivery metrics, engagement, and trigger performance
 */

import { useState } from 'react';
import {
  useDeliveryMetrics,
  useDailyDeliveryMetrics,
  useTriggerPerformance,
  useChannelPerformance,
} from '@/hooks/use-proactive-insights';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Bell,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  BarChart3,
  Activity,
  Send,
  AlertCircle,
  Zap,
} from 'lucide-react';

export default function ProactiveInsightsAnalyticsPage() {
  const [period, setPeriod] = useState<'hour' | 'day' | 'week' | 'month'>('day');

  const { data: metrics, isLoading: metricsLoading } = useDeliveryMetrics(period);
  const { data: triggerData, isLoading: triggerLoading } = useTriggerPerformance();
  const { data: channelData, isLoading: channelLoading } = useChannelPerformance(period);

  // Get last 7 days for daily metrics
  const endDate = new Date().toISOString().split('T' as any)[0];
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T' as any)[0];
  const { data: dailyData } = useDailyDeliveryMetrics(startDate, endDate);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  const formatPercent = (num: number) => `${(num * 100).toFixed(1)}%`;

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  };

  if (metricsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Proactive Insights Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Monitor delivery performance, engagement, and trigger effectiveness
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
            <CardTitle className="text-sm font-medium">Total Insights</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(metrics?.totalInsights || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(metrics?.totalDeliveries || 0)} deliveries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Success Rate</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercent(metrics?.deliverySuccessRate || 0)}</div>
            <Progress value={(metrics?.deliverySuccessRate || 0) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acknowledgment Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercent(metrics?.acknowledgmentRate || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Avg time: {formatDuration(metrics?.avgTimeToAcknowledgeMs || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Action Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercent(metrics?.actionRate || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Avg time: {formatDuration(metrics?.avgTimeToActionMs || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="delivery">
            <Send className="h-4 w-4 mr-2" />
            Delivery
          </TabsTrigger>
          <TabsTrigger value="triggers">
            <Zap className="h-4 w-4 mr-2" />
            Triggers
          </TabsTrigger>
          <TabsTrigger value="engagement">
            <Activity className="h-4 w-4 mr-2" />
            Engagement
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Insights by Type */}
            <Card>
              <CardHeader>
                <CardTitle>Insights by Type</CardTitle>
                <CardDescription>Distribution of insight types</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(metrics?.insightsByType || {}).map(([type, count]) => (
                    <div key={type} className="flex items-center">
                      <div className="w-40 text-sm font-medium capitalize">
                        {type.replace(/_/g, ' ')}
                      </div>
                      <div className="flex-1">
                        <Progress
                          value={(count / (metrics?.totalInsights || 1)) * 100}
                          className="h-2"
                        />
                      </div>
                      <div className="w-20 text-right text-sm text-muted-foreground">
                        {count} ({formatPercent(count / (metrics?.totalInsights || 1))})
                      </div>
                    </div>
                  ))}
                  {Object.keys(metrics?.insightsByType || {}).length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No data available</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Insights by Priority */}
            <Card>
              <CardHeader>
                <CardTitle>Insights by Priority</CardTitle>
                <CardDescription>Priority distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(metrics?.insightsByPriority || {}).map(([priority, count]) => (
                    <div key={priority} className="flex items-center">
                      <div className="w-24 text-sm font-medium capitalize">{priority}</div>
                      <div className="flex-1">
                        <Progress
                          value={(count / (metrics?.totalInsights || 1)) * 100}
                          className="h-2"
                        />
                      </div>
                      <div className="w-16 text-right text-sm text-muted-foreground">{count}</div>
                    </div>
                  ))}
                  {Object.keys(metrics?.insightsByPriority || {}).length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Daily Trend */}
          <Card>
            <CardHeader>
              <CardTitle>7-Day Trend</CardTitle>
              <CardDescription>Daily insights and engagement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(dailyData?.daily || []).map((day) => (
                  <div key={day.date} className="flex items-center gap-4">
                    <div className="w-24 text-sm font-medium">{day.date}</div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-32 text-xs text-muted-foreground">Generated</div>
                        <Progress
                          value={(day.insightsGenerated / Math.max(...(dailyData?.daily || []).map(d => d.insightsGenerated), 1)) * 100}
                          className="h-2 flex-1"
                        />
                        <div className="w-12 text-right text-xs">{day.insightsGenerated}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-32 text-xs text-muted-foreground">Engaged</div>
                        <Progress
                          value={((day.acknowledgments + day.actions) / Math.max(day.insightsGenerated, 1)) * 100}
                          className="h-2 flex-1"
                        />
                        <div className="w-12 text-right text-xs">
                          {day.acknowledgments + day.actions}
                        </div>
                      </div>
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

        {/* Delivery Tab */}
        <TabsContent value="delivery" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Channel Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Channel Performance</CardTitle>
                <CardDescription>Delivery success by channel</CardDescription>
              </CardHeader>
              <CardContent>
                {channelLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(channelData?.channels || []).map((channel) => (
                      <div key={channel.channel} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium capitalize">
                            {channel.channel.replace(/_/g, ' ')}
                          </span>
                          <Badge variant={channel.successRate > 0.9 ? 'default' : 'secondary'}>
                            {formatPercent(channel.successRate)}
                          </Badge>
                        </div>
                        <Progress value={channel.successRate * 100} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            {channel.successCount} / {channel.totalDeliveries} successful
                          </span>
                          <span>Avg: {formatDuration(channel.avgLatencyMs)}</span>
                        </div>
                      </div>
                    ))}
                    {(channelData?.channels || []).length === 0 && (
                      <p className="text-muted-foreground text-center py-4">No data available</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Delivery Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Delivery Statistics</CardTitle>
                <CardDescription>Overall delivery performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Success Rate</span>
                    <span className="text-2xl font-bold">
                      {formatPercent(metrics?.deliverySuccessRate || 0)}
                    </span>
                  </div>
                  <Progress value={(metrics?.deliverySuccessRate || 0) * 100} className="h-2" />

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Failure Rate</span>
                    <span className="text-2xl font-bold text-destructive">
                      {formatPercent(metrics?.deliveryFailureRate || 0)}
                    </span>
                  </div>
                  <Progress value={(metrics?.deliveryFailureRate || 0) * 100} className="h-2" />

                  <div className="pt-4 border-t">
                    <div className="text-sm text-muted-foreground">Average Delivery Latency</div>
                    <div className="text-2xl font-bold mt-1">
                      {formatDuration(metrics?.avgDeliveryLatencyMs || 0)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Deliveries by Channel */}
          <Card>
            <CardHeader>
              <CardTitle>Deliveries by Channel</CardTitle>
              <CardDescription>Total deliveries per channel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-5">
                {Object.entries(metrics?.deliveriesByChannel || {}).map(([channel, count]) => (
                  <div key={channel} className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">{formatNumber(count)}</div>
                    <div className="text-sm text-muted-foreground capitalize mt-1">
                      {channel.replace(/_/g, ' ')}
                    </div>
                  </div>
                ))}
                {Object.keys(metrics?.deliveriesByChannel || {}).length === 0 && (
                  <p className="text-muted-foreground text-center py-4 col-span-5">No data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Triggers Tab */}
        <TabsContent value="triggers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trigger Performance</CardTitle>
              <CardDescription>Top performing triggers</CardDescription>
            </CardHeader>
            <CardContent>
              {triggerLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  {(triggerData?.triggers || []).slice(0, 10).map((trigger) => (
                    <div key={trigger.triggerId} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-medium">{trigger.triggerName}</div>
                          <div className="text-sm text-muted-foreground capitalize">
                            {trigger.triggerType.replace(/_/g, ' ')}
                          </div>
                        </div>
                        <Badge variant="outline">{trigger.totalInsights} insights</Badge>
                      </div>
                      <div className="grid gap-4 md:grid-cols-4">
                        <div>
                          <div className="text-xs text-muted-foreground">Delivery Success</div>
                          <div className="text-lg font-semibold">
                            {formatPercent(trigger.deliverySuccessRate)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Acknowledgment</div>
                          <div className="text-lg font-semibold">
                            {formatPercent(trigger.acknowledgmentRate)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Action Rate</div>
                          <div className="text-lg font-semibold">
                            {formatPercent(trigger.actionRate)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Avg Time to Ack</div>
                          <div className="text-lg font-semibold">
                            {formatDuration(trigger.avgTimeToAcknowledgeMs)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(triggerData?.triggers || []).length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No trigger data available</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Triggers */}
          {metrics?.topTriggers && metrics.topTriggers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Triggers by Volume</CardTitle>
                <CardDescription>Most active triggers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.topTriggers.map((trigger, index) => (
                    <div key={trigger.triggerId} className="flex items-center gap-4">
                      <div className="w-8 text-sm font-medium text-muted-foreground">
                        #{index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{trigger.triggerName}</div>
                        <Progress
                          value={(trigger.count / (metrics.topTriggers[0]?.count || 1)) * 100}
                          className="h-2 mt-1"
                        />
                      </div>
                      <div className="w-16 text-right text-sm font-medium">{trigger.count}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Acknowledgment Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatPercent(metrics?.acknowledgmentRate || 0)}
                </div>
                <Progress value={(metrics?.acknowledgmentRate || 0) * 100} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  Avg time: {formatDuration(metrics?.avgTimeToAcknowledgeMs || 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Action Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatPercent(metrics?.actionRate || 0)}</div>
                <Progress value={(metrics?.actionRate || 0) * 100} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  Avg time: {formatDuration(metrics?.avgTimeToActionMs || 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Dismissal Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatPercent(metrics?.dismissalRate || 0)}</div>
                <Progress value={(metrics?.dismissalRate || 0) * 100} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          {/* Engagement Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Engagement Breakdown</CardTitle>
              <CardDescription>How users interact with insights</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Acknowledged</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Progress
                      value={(metrics?.acknowledgmentRate || 0) * 100}
                      className="h-2 w-32"
                    />
                    <span className="text-sm font-medium w-20 text-right">
                      {formatPercent(metrics?.acknowledgmentRate || 0)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Actioned</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Progress
                      value={(metrics?.actionRate || 0) * 100}
                      className="h-2 w-32"
                    />
                    <span className="text-sm font-medium w-20 text-right">
                      {formatPercent(metrics?.actionRate || 0)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium">Dismissed</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Progress
                      value={(metrics?.dismissalRate || 0) * 100}
                      className="h-2 w-32"
                    />
                    <span className="text-sm font-medium w-20 text-right">
                      {formatPercent(metrics?.dismissalRate || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}









