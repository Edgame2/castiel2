"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Zap, 
  Database,
  Activity,
  RefreshCw,
} from "lucide-react"
import { useVectorSearchStats } from "@/hooks/use-insights"
import { useAuth } from "@/contexts/auth-context"
import { BarChart } from "@/components/widgets/charts/bar-chart"
import type { ChartDataPoint } from "@/components/widgets/charts/types"

interface VectorSearchStats {
  totalSearches: number
  averageExecutionTimeMs: number
  averageResultCount: number
  cache?: {
    totalSearches: number
    cacheHits: number
    cacheMisses: number
    cacheHitRate: number
    totalCacheKeys: number
    cacheMemoryBytes?: number
  }
  timestamp: string
}

export function VectorSearchAnalytics() {
  const { user } = useAuth()
  const { data: stats, isLoading, error } = useVectorSearchStats()

  // Check if user is admin
  const role = user?.role?.toLowerCase()
  const roles = user?.roles?.map(r => r.toLowerCase()) || []
  const isAdmin = role === 'admin' || role === 'owner' || 
    roles.includes('admin') || roles.includes('owner')

  if (!isAdmin) {
    return null
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Search Analytics</CardTitle>
          <CardDescription>Vector search performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Search Analytics</CardTitle>
          <CardDescription>Vector search performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">Failed to load analytics</p>
        </CardContent>
      </Card>
    )
  }

  const statsData = stats as VectorSearchStats | undefined
  if (!statsData) {
    return null
  }

  const cacheStats = statsData.cache

  // Prepare chart data for cache performance
  const cacheChartData: ChartDataPoint[] = cacheStats ? [
    { label: 'Cache Hits', value: cacheStats.cacheHits, color: '#22c55e' },
    { label: 'Cache Misses', value: cacheStats.cacheMisses, color: '#ef4444' },
  ] : []

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Search Analytics
              </CardTitle>
              <CardDescription>
                Vector search performance and cache statistics
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              Admin Only
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overview Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Searches</p>
                    <p className="text-2xl font-bold">{statsData.totalSearches.toLocaleString()}</p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg Execution Time</p>
                    <p className="text-2xl font-bold">{statsData.averageExecutionTimeMs}ms</p>
                  </div>
                  <Clock className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg Results</p>
                    <p className="text-2xl font-bold">{statsData.averageResultCount.toFixed(1)}</p>
                  </div>
                  <Database className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cache Statistics */}
          {cacheStats && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <h3 className="font-semibold">Cache Performance</h3>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Cache Hit Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold">
                          {cacheStats.cacheHitRate.toFixed(1)}%
                        </span>
                        <Badge
                          variant={
                            cacheStats.cacheHitRate > 70
                              ? "default"
                              : cacheStats.cacheHitRate > 50
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {cacheStats.cacheHitRate > 70
                            ? "Excellent"
                            : cacheStats.cacheHitRate > 50
                            ? "Good"
                            : "Needs Improvement"}
                        </Badge>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all"
                          style={{ width: `${cacheStats.cacheHitRate}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{cacheStats.cacheHits} hits</span>
                        <span>{cacheStats.cacheMisses} misses</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Cache Storage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <p className="text-2xl font-bold">
                          {cacheStats.totalCacheKeys.toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">Cache Keys</p>
                      </div>
                      {cacheStats.cacheMemoryBytes && (
                        <div>
                          <p className="text-lg font-semibold">
                            {(cacheStats.cacheMemoryBytes / 1024 / 1024).toFixed(2)} MB
                          </p>
                          <p className="text-sm text-muted-foreground">Memory Usage</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Cache Hits vs Misses Chart */}
              {cacheChartData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Cache Hits vs Misses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <BarChart
                        data={cacheChartData}
                        config={{
                          orientation: 'vertical',
                          showDataLabels: true,
                          showLegend: false,
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Last Updated */}
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <RefreshCw className="h-3 w-3" />
            Last updated: {statsData.timestamp ? new Date(statsData.timestamp).toLocaleString() : 'Never'}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}






