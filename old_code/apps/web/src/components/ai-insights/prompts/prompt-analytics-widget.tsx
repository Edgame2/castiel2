"use client"

import { useState } from "react"
import { usePromptMetrics } from "@/hooks/use-ai-analytics"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, Zap, BarChart3 } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { formatDistanceToNow } from "date-fns"

interface PromptAnalyticsWidgetProps {
    promptId: string
    promptSlug?: string
    className?: string
}

export function PromptAnalyticsWidget({ promptId, promptSlug, className }: PromptAnalyticsWidgetProps) {
    const [period, setPeriod] = useState<'hour' | 'day' | 'week' | 'month'>('week')
    const { data: metricsData, isLoading, error } = usePromptMetrics(promptId, period)
    const metrics = metricsData?.metrics

    if (isLoading) {
        return (
            <Card className={className}>
                <CardHeader>
                    <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center h-32">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (error || !metrics) {
        return (
            <Card className={className}>
                <CardHeader>
                    <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                        <p>No metrics available for this prompt</p>
                        <p className="text-sm mt-2">Metrics will appear after the prompt is used</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    const successRatePercent = (metrics.successRate * 100).toFixed(1)
    const cacheHitRatePercent = (metrics.cacheHitRate * 100).toFixed(1)
    const fallbackRatePercent = (metrics.fallbackRate * 100).toFixed(1)

    return (
        <Card className={className}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Performance Metrics</CardTitle>
                        <CardDescription>
                            {promptSlug || promptId} • {period} period
                        </CardDescription>
                    </div>
                    <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
                        <SelectTrigger className="w-32">
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
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Usage Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">Total Usage</div>
                        <div className="text-2xl font-bold">{metrics.totalUsage.toLocaleString()}</div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">Success Rate</div>
                        <div className="flex items-center gap-2">
                            <div className="text-2xl font-bold">{successRatePercent}%</div>
                            {metrics.successRate >= 0.95 ? (
                                <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : metrics.successRate < 0.9 ? (
                                <TrendingDown className="h-4 w-4 text-red-500" />
                            ) : null}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">Cache Hit Rate</div>
                        <div className="flex items-center gap-2">
                            <div className="text-2xl font-bold">{cacheHitRatePercent}%</div>
                            {metrics.cacheHitRate >= 0.8 ? (
                                <Zap className="h-4 w-4 text-green-500" />
                            ) : null}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">Fallback Rate</div>
                        <div className="flex items-center gap-2">
                            <div className="text-2xl font-bold">{fallbackRatePercent}%</div>
                            {metrics.fallbackRate > 0.1 ? (
                                <XCircle className="h-4 w-4 text-yellow-500" />
                            ) : null}
                        </div>
                    </div>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <CardTitle className="text-sm">Resolution Latency</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {metrics.avgResolutionLatencyMs.toFixed(1)}ms
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                P95: {metrics.p95ResolutionLatencyMs.toFixed(1)}ms
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                                <CardTitle className="text-sm">Rendering Latency</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {metrics.avgRenderingLatencyMs.toFixed(1)}ms
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                Average rendering time
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                                <CardTitle className="text-sm">Quality Score</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {((metrics.successRate * 0.6 + (1 - metrics.fallbackRate) * 0.4) * 100).toFixed(0)}%
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                Based on success & fallback rates
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Usage Breakdown */}
                {Object.keys(metrics.usageByInsightType).length > 0 && (
                    <div className="space-y-2">
                        <div className="text-sm font-medium">Usage by Insight Type</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {Object.entries(metrics.usageByInsightType).map(([type, count]) => (
                                <div key={type} className="flex items-center justify-between p-2 rounded-md bg-muted">
                                    <span className="text-sm">{type}</span>
                                    <Badge variant="secondary">{count}</Badge>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* A/B Test Performance */}
                {metrics.abTestPerformance && metrics.abTestPerformance.length > 0 && (
                    <div className="space-y-2">
                        <div className="text-sm font-medium">A/B Test Performance</div>
                        <div className="space-y-2">
                            {metrics.abTestPerformance.map((test, idx) => (
                                <div key={idx} className="p-3 rounded-md border">
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <div className="text-sm font-medium">
                                                Variant {test.variantId}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                Experiment {test.experimentId}
                                            </div>
                                        </div>
                                        <Badge>{test.usage} uses</Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        Avg Latency: {test.avgLatencyMs.toFixed(1)}ms
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Period Info */}
                <div className="text-xs text-muted-foreground pt-2 border-t">
                    Period: {new Date(metrics.startDate).toLocaleDateString()} - {new Date(metrics.endDate).toLocaleDateString()}
                </div>
            </CardContent>
        </Card>
    )
}

