"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { 
  Activity, 
  Zap, 
  Database, 
  Cpu, 
  TrendingUp, 
  AlertCircle,
  AlertTriangle,
  Loader2,
  Clock,
  DollarSign,
  BarChart3,
  HardDrive,
  CheckCircle2,
  BookOpen,
  ExternalLink,
  Download,
  FileJson,
  FileSpreadsheet,
  ArrowRight,
  RefreshCw,
  Sparkles,
  HelpCircle,
  Copy,
  Check,
} from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { usePerformanceMetrics, useAIMetrics, useSystemHealth, useCacheStats, useCacheHealth, usePerformanceAnomalies, useCacheConfig } from "@/hooks/use-admin"
import { trackException, trackTrace } from "@/lib/monitoring/app-insights"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function PerformanceMonitoringPage() {
  const [timeRange, setTimeRange] = useState<number>(60) // 60 minutes default
  const [aiPeriod, setAIPeriod] = useState<'hour' | 'day' | 'week' | 'month'>('day')
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [copiedMetric, setCopiedMetric] = useState<string | null>(null)

  const { data: performanceMetrics, isLoading: performanceLoading, dataUpdatedAt: perfUpdatedAt, refetch: refetchPerformance, isRefetching: isRefetchingPerformance, isError: performanceError, error: performanceErrorDetails } = usePerformanceMetrics({ timeRange })
  const { data: aiMetrics, isLoading: aiLoading, dataUpdatedAt: aiUpdatedAt, refetch: refetchAI, isRefetching: isRefetchingAI, isError: aiError, error: aiErrorDetails } = useAIMetrics({ period: aiPeriod })
  const { data: systemHealth, isLoading: healthLoading, dataUpdatedAt: healthUpdatedAt, refetch: refetchHealth, isRefetching: isRefetchingHealth, isError: healthError, error: healthErrorDetails } = useSystemHealth()
  const { data: cacheStats, isLoading: cacheStatsLoading, dataUpdatedAt: cacheStatsUpdatedAt, refetch: refetchCacheStats, isRefetching: isRefetchingCacheStats, isError: cacheStatsError, error: cacheStatsErrorDetails } = useCacheStats()
  const { data: cacheHealth, isLoading: cacheHealthLoading, dataUpdatedAt: cacheHealthUpdatedAt, refetch: refetchCacheHealth, isRefetching: isRefetchingCacheHealth, isError: cacheHealthError, error: cacheHealthErrorDetails } = useCacheHealth()
  const { data: performanceAnomalies, isLoading: anomaliesLoading, dataUpdatedAt: anomaliesUpdatedAt, refetch: refetchAnomalies, isRefetching: isRefetchingAnomalies, isError: anomaliesError, error: anomaliesErrorDetails } = usePerformanceAnomalies()
  const { data: cacheConfig, isLoading: cacheConfigLoading } = useCacheConfig()

  const isRefetching = isRefetchingPerformance || isRefetchingAI || isRefetchingHealth || isRefetchingCacheStats || isRefetchingCacheHealth || isRefetchingAnomalies
  const hasErrors = performanceError || aiError || healthError || cacheStatsError || cacheHealthError || anomaliesError

  const handleRefresh = () => {
    refetchPerformance()
    refetchAI()
    refetchHealth()
    refetchCacheStats()
    refetchCacheHealth()
    refetchAnomalies()
    toast.success('Refreshing data...')
  }

  // Track the most recent update time
  useEffect(() => {
    const updateTimes = [perfUpdatedAt, aiUpdatedAt, healthUpdatedAt, cacheStatsUpdatedAt, cacheHealthUpdatedAt, anomaliesUpdatedAt].filter(Boolean)
    if (updateTimes.length > 0) {
      const mostRecent = Math.max(...updateTimes)
      setLastUpdated(new Date(mostRecent))
    }
  }, [perfUpdatedAt, aiUpdatedAt, healthUpdatedAt, cacheStatsUpdatedAt, cacheHealthUpdatedAt, anomaliesUpdatedAt])

  const formatLatency = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toFixed(0)
  }

  const formatCost = (cost: number) => {
    if (cost < 0.01) return `$${cost.toFixed(4)}`
    if (cost < 1) return `$${cost.toFixed(2)}`
    return `$${cost.toFixed(2)}`
  }

  const handleCopyMetric = async (metricName: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedMetric(metricName)
      toast.success(`Copied ${metricName} to clipboard`)
      setTimeout(() => setCopiedMetric(null), 2000)
    } catch (error) {
      toast.error('Failed to copy to clipboard')
    }
  }

  const exportMetrics = (format: 'json' | 'csv') => {
    try {
      const exportData = {
        exportedAt: new Date().toISOString(),
        timeRange: `${timeRange} minutes`,
        aiPeriod,
        systemHealth,
        performanceMetrics,
        aiMetrics,
        cacheStats,
        cacheHealth,
        performanceAnomalies,
        cacheConfig,
      }

      if (format === 'json') {
        const jsonStr = JSON.stringify(exportData, null, 2)
        const blob = new Blob([jsonStr], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a' as any)
        a.href = url
        a.download = `performance-metrics-${new Date().toISOString().split('T' as any)[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success('Metrics exported as JSON')
      } else {
        // CSV export - flatten the data structure
        const csvRows: string[] = []
        
        // Header
        csvRows.push('Metric,Value,Timestamp')
        
        // System Health
        if (systemHealth) {
          csvRows.push(`System Status,${systemHealth.status},${new Date().toISOString()}`)
          csvRows.push(`Uptime (seconds),N/A,${new Date().toISOString()}`)
        }
        
        // Performance Metrics
        if (performanceMetrics) {
          csvRows.push(`Average AI Response Time (ms),${performanceMetrics.avgAIResponseTime || 'N/A'},${new Date().toISOString()}`)
          csvRows.push(`Total Context Tokens,${performanceMetrics.totalContextTokensUsed || 'N/A'},${new Date().toISOString()}`)
          csvRows.push(`Metric Count,${performanceMetrics.metricCount || 'N/A'},${new Date().toISOString()}`)
          csvRows.push(`Truncation Frequency,${performanceMetrics.truncationFrequency || 'N/A'},${new Date().toISOString()}`)
        }
        
        // AI Metrics
        if (aiMetrics) {
          csvRows.push(`AI Total Requests,${aiMetrics.totalRequests || 'N/A'},${new Date().toISOString()}`)
          csvRows.push(`AI Total Input Tokens,${aiMetrics.totalInputTokens || 'N/A'},${new Date().toISOString()}`)
          csvRows.push(`AI Total Output Tokens,${aiMetrics.totalOutputTokens || 'N/A'},${new Date().toISOString()}`)
          csvRows.push(`AI Average Latency (ms),${aiMetrics.avgLatencyMs || 'N/A'},${new Date().toISOString()}`)
        }
        
        // Cache Stats
        if (cacheStats) {
          csvRows.push(`Cache Hit Rate,${cacheStats.aggregated.overallHitRate || 'N/A'},${new Date().toISOString()}`)
          csvRows.push(`Cache Total Hits,${cacheStats.aggregated.totalHits || 'N/A'},${new Date().toISOString()}`)
          csvRows.push(`Cache Total Misses,${cacheStats.aggregated.totalMisses || 'N/A'},${new Date().toISOString()}`)
          csvRows.push(`Cache Average Latency (ms),${cacheStats.performance.averageLatencyMs || 'N/A'},${new Date().toISOString()}`)
        }
        
        const csvStr = csvRows.join('\n')
        const blob = new Blob([csvStr], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a' as any)
        a.href = url
        a.download = `performance-metrics-${new Date().toISOString().split('T' as any)[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success('Metrics exported as CSV')
      }
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Export failed in performance page', 3, {
        errorMessage: errorObj.message,
      })
      toast.error('Failed to export metrics')
    }
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Performance Monitoring</h1>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground">
              Real-time system performance metrics and analytics
            </p>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Time Range:</span>
            <Select value={timeRange.toString()} onValueChange={(v) => setTimeRange(parseInt(v))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">Last 15 minutes</SelectItem>
                <SelectItem value="30">Last 30 minutes</SelectItem>
                <SelectItem value="60">Last hour</SelectItem>
                <SelectItem value="240">Last 4 hours</SelectItem>
                <SelectItem value="1440">Last 24 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportMetrics('json')}>
                <FileJson className="h-4 w-4 mr-2" />
                Export as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportMetrics('csv')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            {isRefetching ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Error States */}
      {hasErrors && (
        <div className="space-y-2">
          {performanceError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Failed to load performance metrics</AlertTitle>
              <AlertDescription>
                {performanceErrorDetails instanceof Error 
                  ? performanceErrorDetails.message 
                  : 'An error occurred while loading performance metrics.'}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => refetchPerformance()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {aiError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Failed to load AI metrics</AlertTitle>
              <AlertDescription>
                {aiErrorDetails instanceof Error 
                  ? aiErrorDetails.message 
                  : 'An error occurred while loading AI metrics.'}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => refetchAI()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {healthError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Failed to load system health</AlertTitle>
              <AlertDescription>
                {healthErrorDetails instanceof Error 
                  ? healthErrorDetails.message 
                  : 'An error occurred while loading system health data.'}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => refetchHealth()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {cacheStatsError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Failed to load cache statistics</AlertTitle>
              <AlertDescription>
                {cacheStatsErrorDetails instanceof Error 
                  ? cacheStatsErrorDetails.message 
                  : 'An error occurred while loading cache statistics.'}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => refetchCacheStats()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {cacheHealthError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Failed to load cache health</AlertTitle>
              <AlertDescription>
                {cacheHealthErrorDetails instanceof Error 
                  ? cacheHealthErrorDetails.message 
                  : 'An error occurred while loading cache health data.'}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => refetchCacheHealth()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {anomaliesError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Failed to load performance anomalies</AlertTitle>
              <AlertDescription>
                {anomaliesErrorDetails instanceof Error 
                  ? anomaliesErrorDetails.message 
                  : 'An error occurred while loading performance anomalies.'}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => refetchAnomalies()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Key Metrics Summary */}
      {(performanceMetrics || aiMetrics || cacheStats) && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-sm font-medium">System Status</CardTitle>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p>Overall system health status. Shows if all services are operational and responding correctly.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">
                  {systemHealth ? (
                    <Badge variant={systemHealth.status === 'healthy' ? 'default' : 'destructive'}>
                      {systemHealth.status}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>
                {systemHealth && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleCopyMetric('System Status', systemHealth.status)}
                  >
                    {copiedMetric === 'System Status' ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {systemHealth?.uptime 
                  ? `Uptime: ${Math.floor(systemHealth.uptime / 86400)}d ${Math.floor((systemHealth.uptime % 86400) / 3600)}h`
                  : 'System health'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-sm font-medium">AI Requests (24h)</CardTitle>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p>Total number of AI inference requests made in the last 24 hours. Includes all LLM API calls for insights, embeddings, and other AI features.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">
                  {aiMetrics ? formatNumber(aiMetrics.totalRequests) : '-'}
                </div>
                {aiMetrics && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleCopyMetric('AI Requests', formatNumber(aiMetrics.totalRequests))}
                  >
                    {copiedMetric === 'AI Requests' ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {aiMetrics ? `${aiMetrics.uniqueUsers} users` : 'AI metrics'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p>Percentage of cache requests that were served from cache instead of the database. Higher rates indicate better performance and lower database load.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">
                  {cacheStats ? `${cacheStats.aggregated.overallHitRate.toFixed(1)}%` : '-'}
                </div>
                {cacheStats && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleCopyMetric('Cache Hit Rate', `${cacheStats.aggregated.overallHitRate.toFixed(1)}%`)}
                  >
                    {copiedMetric === 'Cache Hit Rate' ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {cacheStats ? `${formatNumber(cacheStats.aggregated.totalKeys)} keys` : 'Cache stats'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p>Average time taken to process API requests. Includes database queries, AI processing, and other operations. Lower values indicate better performance.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">
                  {performanceMetrics 
                    ? formatLatency(performanceMetrics.avgAIResponseTime)
                    : aiMetrics
                    ? formatLatency(aiMetrics.avgLatencyMs)
                    : '-'}
                </div>
                {(performanceMetrics || aiMetrics) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleCopyMetric('Avg Response Time', 
                      performanceMetrics 
                        ? formatLatency(performanceMetrics.avgAIResponseTime)
                        : aiMetrics ? formatLatency(aiMetrics.avgLatencyMs) : 'N/A'
                    )}
                  >
                    {copiedMetric === 'Avg Response Time' ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {performanceMetrics 
                  ? 'AI processing'
                  : aiMetrics
                  ? 'AI requests'
                  : 'Performance'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts & Issues Summary */}
      {((cacheHealth && (cacheHealth.issues.length > 0 || !cacheHealth.healthy)) || 
        (performanceAnomalies && performanceAnomalies.length > 0) ||
        (systemHealth && systemHealth.status !== 'healthy')) && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Active Alerts & Issues
            </CardTitle>
            <CardDescription>Current system issues requiring attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* System Health Issues */}
            {systemHealth && systemHealth.status !== 'healthy' && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-destructive">System Health: {systemHealth.status}</p>
                  <p className="text-sm text-muted-foreground">
                    System is not operating at optimal health
                  </p>
                </div>
              </div>
            )}

            {/* Cache Health Issues */}
            {cacheHealth && cacheHealth.issues.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Cache Issues:</p>
                {cacheHealth.issues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{issue}</p>
                      {cacheHealth.recommendations[i] && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Recommendation: {cacheHealth.recommendations[i]}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Performance Anomalies */}
            {performanceAnomalies && performanceAnomalies.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Performance Anomalies:</p>
                {performanceAnomalies.map((anomaly, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${
                    anomaly.severity === 'critical' 
                      ? 'bg-destructive/10 border-destructive/20' 
                      : 'bg-amber-500/10 border-amber-500/20'
                  }`}>
                    {anomaly.severity === 'critical' ? (
                      <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium capitalize">
                        {anomaly.metric.replace(/_/g, ' ')}: {formatLatency(anomaly.currentValue)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Threshold: {formatLatency(anomaly.threshold)} • Severity: {anomaly.severity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* System Health Status */}
      {systemHealth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Badge variant={systemHealth.status === 'healthy' ? 'default' : 'destructive'}>
                {systemHealth.status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Uptime: {systemHealth.uptime ? `${Math.floor(systemHealth.uptime / 86400)}d ${Math.floor((systemHealth.uptime % 86400) / 3600)}h` : 'N/A'}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance Metrics</TabsTrigger>
          <TabsTrigger value="ai">AI Analytics</TabsTrigger>
          <TabsTrigger value="cache">Cache Statistics</TabsTrigger>
          <TabsTrigger value="alerts">Alert Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          {performanceLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-32" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : performanceMetrics ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-1.5">
                    <CardTitle className="text-sm font-medium">Avg Recommendation Latency</CardTitle>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p>Average time to generate AI recommendations. Includes context assembly, vector search, and AI processing.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatLatency(performanceMetrics.avgRecommendationLatency)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {performanceMetrics.metricCount} metrics collected
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-1.5">
                    <CardTitle className="text-sm font-medium">Avg Context Assembly</CardTitle>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p>Average time to assemble conversation context from memory and relevant documents. Includes token management and summarization.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatLatency(performanceMetrics.avgContextAssemblyLatency)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Context assembly time
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-1.5">
                    <CardTitle className="text-sm font-medium">Avg Vector Search</CardTitle>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p>Average time to search for relevant documents using vector embeddings. Lower values indicate faster retrieval.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatLatency(performanceMetrics.avgVectorSearchLatency)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Vector search latency
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-1.5">
                    <CardTitle className="text-sm font-medium">Avg AI Response Time</CardTitle>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p>Average time for the LLM to generate a response after receiving the context. This is the pure AI processing time.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatLatency(performanceMetrics.avgAIResponseTime)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    AI processing time
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-1.5">
                    <CardTitle className="text-sm font-medium">Total Context Tokens</CardTitle>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p>Total number of tokens included in context sent to the LLM. Higher values may improve accuracy but increase cost and latency.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatNumber(performanceMetrics.totalContextTokensUsed)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tokens used in context
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-1.5">
                    <CardTitle className="text-sm font-medium">Truncation Frequency</CardTitle>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p>Percentage of requests where context was truncated due to token limits. High values may indicate context is too large or limits are too low.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(performanceMetrics.truncationFrequency * 100).toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Context truncation rate
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No performance metrics available
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <div className="flex items-center justify-end">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Period:</span>
              <Select value={aiPeriod} onValueChange={(v: any) => setAIPeriod(v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hour">Last Hour</SelectItem>
                  <SelectItem value="day">Last Day</SelectItem>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {aiLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-32" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : aiMetrics ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-1.5">
                    <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p>Total number of AI inference requests in the selected period. Each request represents one LLM API call.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatNumber(aiMetrics.totalRequests)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {aiMetrics.uniqueUsers} unique users
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-1.5">
                    <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p>Total number of tokens processed (input + output) across all AI requests. Tokens are the basic units of text that LLMs process.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatNumber(aiMetrics.totalInputTokens + aiMetrics.totalOutputTokens)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(aiMetrics.avgTokensPerRequest)} avg per request
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-1.5">
                    <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p>Total cost of all AI API calls in the selected period. Calculated based on token usage and model pricing.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {aiMetrics ? formatCost(aiMetrics.totalCost) : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {aiMetrics?.avgCostPerRequest ? formatCost(aiMetrics.avgCostPerRequest) : 'N/A'} avg per request
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-1.5">
                    <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p>Average time for AI requests to complete, from submission to response. P95 shows the 95th percentile latency (95% of requests are faster).</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatLatency(aiMetrics.avgLatencyMs)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    P95: {formatLatency(aiMetrics.p95LatencyMs)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-1.5">
                    <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p>Percentage of AI requests served from cache instead of making new API calls. Higher rates reduce costs and improve response times.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    N/A
                  </div>
                  <p className="text-xs text-muted-foreground">
                    N/A saved
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-1.5">
                    <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p>Percentage of AI requests that failed. Includes API errors, rate limits, timeouts, and other failures. Lower is better.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    N/A
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Request failure rate
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No AI metrics available
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="cache" className="space-y-4">
          {cacheStatsLoading || cacheHealthLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-32" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : cacheStats && cacheHealth ? (
            <>
              {/* Cache Health Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HardDrive className="h-5 w-5" />
                    Cache Health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <Badge variant={cacheHealth.healthy ? 'default' : 'destructive'}>
                      {cacheHealth.healthy ? 'Healthy' : 'Unhealthy'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Redis: {cacheHealth.redisConnected ? 'Connected' : 'Disconnected'}
                    </span>
                    {cacheHealth.redisLatencyMs > 0 && (
                      <span className="text-sm text-muted-foreground">
                        Latency: {formatLatency(cacheHealth.redisLatencyMs)}
                      </span>
                    )}
                    {cacheHealth.memoryUsagePercent !== undefined && (
                      <span className="text-sm text-muted-foreground">
                        Memory: {cacheHealth.memoryUsagePercent.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  {cacheHealth.issues.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-medium text-destructive">Issues:</p>
                      <ul className="text-sm text-muted-foreground list-disc list-inside">
                        {cacheHealth.issues.map((issue, i) => (
                          <li key={i}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Aggregated Cache Statistics */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-1.5">
                      <CardTitle className="text-sm font-medium">Overall Hit Rate</CardTitle>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p>Overall cache hit rate across all services. Percentage of cache lookups that found data in cache instead of querying the database.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Zap className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {cacheStats.aggregated.overallHitRate.toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(cacheStats.aggregated.totalHits)} hits / {formatNumber(cacheStats.aggregated.totalMisses)} misses
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-1.5">
                      <CardTitle className="text-sm font-medium">Total Keys</CardTitle>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p>Total number of unique cache keys stored across all services. Each key represents a cached item.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Database className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatNumber(cacheStats.aggregated.totalKeys)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cached items across all services
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-1.5">
                      <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p>Average time for cache operations (get, set, delete). Lower values indicate faster cache performance.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatLatency(cacheStats.performance.averageLatencyMs)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Average cache operation time
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Operations</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatNumber(cacheStats.aggregated.totalHits + cacheStats.aggregated.totalMisses)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cache requests processed
                    </p>
                  </CardContent>
                </Card>

                {cacheStats.aggregated.totalMemoryBytes && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                      <HardDrive className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {(cacheStats.aggregated.totalMemoryBytes / 1024 / 1024).toFixed(1)} MB
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Total cache memory
                      </p>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Invalidations</CardTitle>
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatNumber(cacheStats.aggregated.totalInvalidations)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cache entries invalidated
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Per-Service Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle>Service-Level Statistics</CardTitle>
                  <CardDescription>Cache performance by service</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {Object.entries(cacheStats.services).map(([serviceName, stats]) => {
                      if (!stats) return null;
                      return (
                        <Card key={serviceName}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium capitalize">
                              {serviceName.replace(/([A-Z])/g, ' $1').trim()}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Status</span>
                              <Badge variant={stats.healthy ? 'default' : 'destructive'} className="text-xs">
                                {stats.healthy ? (
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                ) : (
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                )}
                                {stats.healthy ? 'Healthy' : 'Unhealthy'}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Hit Rate</span>
                              <span className="text-xs font-medium">{stats.hitRate.toFixed(1)}%</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Keys</span>
                              <span className="text-xs font-medium">{formatNumber(stats.totalKeys)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Operations</span>
                              <span className="text-xs font-medium">{formatNumber(stats.totalOperations)}</span>
                            </div>
                            {stats.averageLatencyMs !== undefined && (
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Latency</span>
                                <span className="text-xs font-medium">{formatLatency(stats.averageLatencyMs)}</span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No cache statistics available
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {cacheConfigLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-32" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : cacheConfig ? (
            <div className="space-y-4">
              {/* Alert Settings Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Alert Configuration
                  </CardTitle>
                  <CardDescription>
                    Current alert thresholds and monitoring settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                    <div>
                      <p className="font-medium">Alerting Status</p>
                      <p className="text-sm text-muted-foreground">
                        {cacheConfig.enableAlerts ? 'Alerts are enabled' : 'Alerts are disabled'}
                      </p>
                    </div>
                    <Badge variant={cacheConfig.enableAlerts ? 'default' : 'secondary'}>
                      {cacheConfig.enableAlerts ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Cache Alert Thresholds */}
              <Card>
                <CardHeader>
                  <CardTitle>Cache Alert Thresholds</CardTitle>
                  <CardDescription>
                    Thresholds that trigger cache performance alerts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">Low Hit Rate</p>
                        <Badge variant="outline">Warning</Badge>
                      </div>
                      <p className="text-2xl font-bold">{cacheConfig.alertThresholds.lowHitRate}%</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Alert when cache hit rate falls below this threshold
                      </p>
                    </div>

                    <div className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">High Memory Usage</p>
                        <Badge variant="outline">Warning</Badge>
                      </div>
                      <p className="text-2xl font-bold">{cacheConfig.alertThresholds.highMemoryUsage}%</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Alert when memory usage exceeds this threshold
                      </p>
                    </div>

                    <div className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">High Latency</p>
                        <Badge variant="outline">Warning</Badge>
                      </div>
                      <p className="text-2xl font-bold">{formatLatency(cacheConfig.alertThresholds.highLatency)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Alert when average latency exceeds this threshold
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Monitoring Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Monitoring Settings</CardTitle>
                  <CardDescription>
                    Configuration for metrics collection and tracking
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 rounded-lg border">
                      <p className="text-sm font-medium mb-2">Metrics Interval</p>
                      <p className="text-2xl font-bold">
                        {Math.round(cacheConfig.metricsIntervalMs / 1000)}s
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        How often metrics are collected
                      </p>
                    </div>

                    <div className="p-4 rounded-lg border">
                      <p className="text-sm font-medium mb-2">Top Keys Tracking</p>
                      <p className="text-2xl font-bold">
                        {cacheConfig.trackTopKeys ? 'Enabled' : 'Disabled'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Track most accessed cache keys
                      </p>
                    </div>

                    <div className="p-4 rounded-lg border">
                      <p className="text-sm font-medium mb-2">Top Keys Count</p>
                      <p className="text-2xl font-bold">{cacheConfig.topKeysCount}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Number of top keys to track
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Info Note */}
              <Card className="border-blue-500/20 bg-blue-500/5">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Configuration Management
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        Alert thresholds are currently configured at the system level. 
                        To modify these settings, contact your system administrator or update the configuration in the deployment settings.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No alert configuration available
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Documentation & Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Documentation & Resources
          </CardTitle>
          <CardDescription>
            Additional monitoring tools and configuration guides
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-lg border hover:bg-accent transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium mb-1">Grafana Dashboards</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Pre-configured Grafana dashboards for advanced monitoring and visualization
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Setup Guide</span>
                    <ExternalLink className="h-3 w-3" />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border hover:bg-accent transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium mb-1">Application Insights</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Configure Application Insights for detailed telemetry and custom metrics tracking
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Configuration Guide</span>
                    <ExternalLink className="h-3 w-3" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links to Related Pages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Related Monitoring Pages
          </CardTitle>
          <CardDescription>
            Quick access to other monitoring and administration pages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Link href="/admin/integrations/sync-monitoring">
              <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <RefreshCw className="h-5 w-5 text-primary" />
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-base">Sync Monitoring</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    Monitor synchronization tasks and executions
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/ai-settings/embedding-jobs">
              <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-base">Embedding Jobs</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    View and manage embedding generation jobs
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/ai-settings">
              <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Zap className="h-5 w-5 text-primary" />
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-base">AI Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    Manage AI models and system-wide configuration
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

