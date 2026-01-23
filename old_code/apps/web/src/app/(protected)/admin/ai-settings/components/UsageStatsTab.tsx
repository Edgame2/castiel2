/**
 * Usage Stats Tab
 * Displays AI usage analytics with billing summary and usage statistics
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart } from '@/components/widgets/charts/bar-chart'
import { useBillingSummary, useTenantUsageStats, useEmbeddingCacheStats, useClearEmbeddingCache } from '@/hooks/use-ai-settings'
import { format } from 'date-fns'
import { DollarSign, Zap, MessageSquare, TrendingUp, AlertCircle, Database, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

export function UsageStatsTab() {
  const [period, setPeriod] = useState<'7' | '30' | '90'>('30')
  
  // Calculate date range
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - parseInt(period))

  const { data: billing, isLoading: billingLoading } = useBillingSummary({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  })

  const { data: usage, isLoading: usageLoading } = useTenantUsageStats({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  })

  const { data: cacheStats, isLoading: cacheLoading } = useEmbeddingCacheStats()
  const clearCacheMutation = useClearEmbeddingCache()

  const isLoading = billingLoading || usageLoading || cacheLoading

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center gap-4">
        <Label htmlFor="period">Time Period</Label>
        <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <SelectTrigger id="period" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                ${(billing?.totalCost || 0).toFixed(2)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {period} day period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {(billing?.totalTokens || 0).toLocaleString()}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Input + Output tokens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Insights Generated</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {(billing?.insightCount || 0).toLocaleString()}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Total requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Cost/Request</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                ${billing?.insightCount
                  ? (billing.totalCost / billing.insightCount).toFixed(4)
                  : '0.0000'}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Per insight
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Alerts */}
      {billing?.budget && (
        <div className="space-y-4">
          {/* Monthly Budget */}
          <Card className={billing.budget.percentUsed > 80 ? 'border-orange-500' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Monthly Budget Status
                {billing.budget.percentUsed > 80 && (
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Used</span>
                  <span className="font-medium">
                    ${billing.budget.used.toFixed(2)} / ${billing.budget.limit.toFixed(2)}
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      billing.budget.percentUsed > 90
                        ? 'bg-red-500'
                        : billing.budget.percentUsed > 80
                        ? 'bg-orange-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(100, billing.budget.percentUsed)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{billing.budget.percentUsed.toFixed(1)}% used</span>
                  <span>${billing.budget.remaining.toFixed(2)} remaining</span>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      )}

      {/* Cost by Model */}
      {billing?.byModel && billing.byModel.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cost by Model</CardTitle>
            <CardDescription>Breakdown of costs by AI model</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <BarChart
                data={billing.byModel.map((m) => ({
                  label: m.modelName || m.modelId,
                  value: m.cost,
                }))}
                config={{
                  showDataLabels: true,
                  orientation: 'vertical',
                  valueFormatter: (v) => `$${v.toFixed(2)}`,
                }}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Cost by Insight Type */}
      {billing?.byInsightType && billing.byInsightType.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cost by Insight Type</CardTitle>
            <CardDescription>Breakdown of costs by insight type</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <BarChart
                data={billing.byInsightType.map((t) => ({
                  label: t.insightType,
                  value: t.cost,
                }))}
                config={{
                  showDataLabels: true,
                  orientation: 'vertical',
                  valueFormatter: (v) => `$${v.toFixed(2)}`,
                }}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Daily Breakdown */}
      {billing?.dailyBreakdown && billing.dailyBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Cost Trend</CardTitle>
            <CardDescription>Cost per day over the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <BarChart
                data={billing.dailyBreakdown.map((d) => ({
                  label: format(new Date(d.date), 'MMM dd'),
                  value: d.cost,
                }))}
                config={{
                  showDataLabels: false,
                  orientation: 'vertical',
                  valueFormatter: (v) => `$${v.toFixed(2)}`,
                }}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Top Users */}
      {billing?.byUser && billing.byUser.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cost by User</CardTitle>
            <CardDescription>Top users by AI usage cost</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <div className="space-y-2">
                {billing.byUser
                  .sort((a, b) => b.cost - a.cost)
                  .slice(0, 10)
                  .map((user) => (
                    <div
                      key={user.userId}
                      className="flex items-center justify-between p-2 rounded border"
                    >
                      <span className="text-sm font-mono">{user.userId.substring(0, 8)}...</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          {user.requests} requests
                        </span>
                        <Badge variant="secondary">
                          ${user.cost.toFixed(2)}
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Embedding Cache Statistics */}
      {cacheStats && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Embedding Content Hash Cache
                </CardTitle>
                <CardDescription>
                  Cache statistics for embedding content hash deduplication
                </CardDescription>
              </div>
              {cacheStats.enabled && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={clearCacheMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {clearCacheMutation.isPending ? 'Clearing...' : 'Clear Cache'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear Embedding Cache?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will clear all cached embeddings from the content hash cache.
                        This action cannot be undone. New embeddings will be regenerated
                        when needed, which may increase costs temporarily.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => clearCacheMutation.mutate()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Clear Cache
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {cacheStats.enabled && cacheStats.stats ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Total Cache Entries</div>
                  <div className="text-2xl font-bold">{cacheStats.stats.totalKeys.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cached embedding vectors
                  </p>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Estimated Cache Size</div>
                  <div className="text-2xl font-bold">
                    {cacheStats.stats.estimatedSizeMB.toFixed(2)} MB
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Approximate memory usage
                  </p>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Cache Hit Rate</div>
                  <div className="text-2xl font-bold text-green-600">
                    {cacheStats.stats.hitRate.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {cacheStats.stats.hits.toLocaleString()} hits / {cacheStats.stats.misses.toLocaleString()} misses
                  </p>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Total Requests</div>
                  <div className="text-2xl font-bold">
                    {(cacheStats.stats.hits + cacheStats.stats.misses).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cache lookups
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Embedding cache is not enabled</p>
                <p className="text-sm mt-2">
                  Enable Redis to use the embedding content hash cache
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !billing && !usage && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No usage data available for the selected period.</p>
            <p className="text-sm mt-2">
              Usage statistics will appear here once AI insights are generated.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
