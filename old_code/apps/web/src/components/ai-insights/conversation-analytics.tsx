'use client'

/**
 * Conversation Analytics Component
 * Displays comprehensive analytics for a conversation including topics, entities, quality, cost, and performance
 */

import { useMemo } from 'react'
import { BarChart3, TrendingUp, DollarSign, Clock, MessageSquare, Zap, AlertCircle, CheckCircle2, XCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { useConversationAnalytics } from '@/hooks/use-insights'
import type { ConversationAnalytics } from '@/lib/api/insights'
import { formatDistanceToNow } from 'date-fns'

interface ConversationAnalyticsProps {
  conversationId: string
  className?: string
}

export function ConversationAnalytics({ conversationId, className }: ConversationAnalyticsProps) {
  const { data: analytics, isLoading, error } = useConversationAnalytics(conversationId)

  if (isLoading) {
    return (
      <div className={className}>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (error || !analytics) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>Failed to load analytics</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="topics">Topics</TabsTrigger>
          <TabsTrigger value="entities">Entities</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
          <TabsTrigger value="cost">Cost</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <OverviewTab analytics={analytics} />
        </TabsContent>

        <TabsContent value="topics" className="space-y-4">
          <TopicsTab analytics={analytics} />
        </TabsContent>

        <TabsContent value="entities" className="space-y-4">
          <EntitiesTab analytics={analytics} />
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          <QualityTab analytics={analytics} />
        </TabsContent>

        <TabsContent value="cost" className="space-y-4">
          <CostTab analytics={analytics} />
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <PerformanceTab analytics={analytics} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function OverviewTab({ analytics }: { analytics: ConversationAnalytics }) {
  const qualityScore = useMemo(() => {
    const { quality } = analytics
    let score = 0
    let factors = 0

    // Citation rate (0-30 points)
    if (quality.averageCitations > 0) {
      score += Math.min(30, (quality.averageCitations / 5) * 30)
      factors++
    }

    // User satisfaction (0-40 points)
    const satisfaction = quality.userSatisfaction
    if (satisfaction.thumbsUp + satisfaction.thumbsDown > 0) {
      const satisfactionRate = satisfaction.thumbsUp / (satisfaction.thumbsUp + satisfaction.thumbsDown)
      score += satisfactionRate * 40
      factors++
    }

    // Low error rate (0-30 points)
    if (quality.errorRate < 0.1) {
      score += (1 - quality.errorRate * 10) * 30
      factors++
    }

    return factors > 0 ? Math.round(score / factors) : 0
  }, [analytics.quality])

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{analytics.usage.totalMessages}</div>
          <p className="text-xs text-muted-foreground">
            {analytics.usage.messagesByRole.user || 0} user, {analytics.usage.messagesByRole.assistant || 0} assistant
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${analytics.costBreakdown.totalCost.toFixed(4)}</div>
          <p className="text-xs text-muted-foreground">
            ${analytics.costBreakdown.costPerMessage.toFixed(4)} per message
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{Math.round(analytics.performance.averageLatencyMs)}ms</div>
          <p className="text-xs text-muted-foreground">
            P95: {Math.round(analytics.performance.p95LatencyMs)}ms
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Quality Score</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{qualityScore}%</div>
          <Progress value={qualityScore} className="mt-2" />
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Top Topics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analytics.topTopics.slice(0, 5).map((topic) => (
              <div key={topic.id} className="flex items-center justify-between">
                <span className="text-sm">{topic.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {Math.round(topic.relevanceScore * 100)}%
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Top Entities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analytics.topEntities.slice(0, 5).map((entity) => (
              <div key={entity.shardId} className="flex items-center justify-between">
                <span className="text-sm">{entity.shardName}</span>
                <Badge variant="outline" className="text-xs">
                  {entity.frequency}x
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function TopicsTab({ analytics }: { analytics: ConversationAnalytics }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Topics</CardTitle>
        <CardDescription>Topics discussed in this conversation</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {analytics.topics.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No topics identified</p>
          ) : (
            analytics.topics.map((topic) => (
              <div key={topic.id} className="flex items-start justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium">{topic.name}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(topic.relevanceScore * 100)}% relevance
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Mentioned {topic.messageIds.length} times
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function EntitiesTab({ analytics }: { analytics: ConversationAnalytics }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Entities</CardTitle>
        <CardDescription>Entities referenced in this conversation</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {analytics.entities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No entities identified</p>
          ) : (
            analytics.entities.map((entity) => (
              <div key={entity.shardId} className="flex items-start justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium">{entity.shardName}</h4>
                    <Badge variant="outline" className="text-xs">
                      {entity.shardTypeId.replace('c_', '')}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {entity.frequency}x
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Relevance: {Math.round(entity.relevanceScore * 100)}%
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function QualityTab({ analytics }: { analytics: ConversationAnalytics }) {
  const { quality } = analytics
  const satisfaction = quality.userSatisfaction

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Citations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">Average Citations</span>
              <span className="text-sm font-medium">{quality.averageCitations.toFixed(2)}</span>
            </div>
            <Progress value={Math.min(100, quality.averageCitations * 20)} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">Citation Accuracy</span>
              <span className="text-sm font-medium">{Math.round(quality.citationAccuracy * 100)}%</span>
            </div>
            <Progress value={quality.citationAccuracy * 100} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Satisfaction</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm">{satisfaction.thumbsUp}</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm">{satisfaction.thumbsDown}</span>
            </div>
          </div>
          {satisfaction.averageRating > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Average Rating</span>
                <span className="text-sm font-medium">{satisfaction.averageRating.toFixed(1)}</span>
              </div>
              <Progress value={(satisfaction.averageRating / 5) * 100} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Error Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">Error Rate</span>
            <span className={`text-sm font-medium ${quality.errorRate > 0.1 ? 'text-red-500' : 'text-green-500'}`}>
              {Math.round(quality.errorRate * 100)}%
            </span>
          </div>
          <Progress value={quality.errorRate * 100} className={quality.errorRate > 0.1 ? 'bg-red-500' : ''} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Regeneration Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">Regenerations</span>
            <span className="text-sm font-medium">{Math.round(quality.regenerationRate * 100)}%</span>
          </div>
          <Progress value={quality.regenerationRate * 100} />
        </CardContent>
      </Card>
    </div>
  )
}

function CostTab({ analytics }: { analytics: ConversationAnalytics }) {
  const { costBreakdown } = analytics

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Cost Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">Total Cost</span>
              <span className="text-lg font-bold">${costBreakdown.totalCost.toFixed(4)}</span>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">Cost per Message</span>
              <span className="text-sm font-medium">${costBreakdown.costPerMessage.toFixed(4)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cost by Model</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(costBreakdown.costByModel).length === 0 ? (
            <p className="text-sm text-muted-foreground">No model cost data</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(costBreakdown.costByModel)
                .sort(([, a], [, b]) => b - a)
                .map(([model, cost]) => (
                  <div key={model} className="flex items-center justify-between">
                    <span className="text-sm">{model}</span>
                    <span className="text-sm font-medium">${cost.toFixed(4)}</span>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function PerformanceTab({ analytics }: { analytics: ConversationAnalytics }) {
  const { performance, usage } = analytics

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Latency Metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">Average</span>
              <span className="text-sm font-medium">{Math.round(performance.averageLatencyMs)}ms</span>
            </div>
            <Progress value={Math.min(100, (performance.averageLatencyMs / 5000) * 100)} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">P50</span>
              <span className="text-sm font-medium">{Math.round(performance.p50LatencyMs)}ms</span>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">P95</span>
              <span className="text-sm font-medium">{Math.round(performance.p95LatencyMs)}ms</span>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">P99</span>
              <span className="text-sm font-medium">{Math.round(performance.p99LatencyMs)}ms</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage Metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">Total Tokens</span>
              <span className="text-sm font-medium">{usage.totalTokens.toLocaleString()}</span>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">Avg Tokens per Message</span>
              <span className="text-sm font-medium">{Math.round(usage.averageTokensPerMessage)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}






