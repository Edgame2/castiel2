"use client"

import { useState, useMemo } from "react"
import { format } from "date-fns"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Calendar,
} from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Target,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  usePhase2Metrics,
  useAggregatedMetrics,
  type MetricType,
} from "@/hooks/use-phase2-metrics"
import { CalendarIcon } from "lucide-react"

const METRIC_TYPE_LABELS: Record<MetricType, string> = {
  ingestion_lag: "Ingestion Lag",
  change_miss_rate: "Change Miss Rate",
  vector_hit_ratio: "Vector Hit Ratio",
  insight_confidence_drift: "Insight Confidence Drift",
}

const METRIC_TYPE_DESCRIPTIONS: Record<MetricType, string> = {
  ingestion_lag: "Time delay between data ingestion and processing",
  change_miss_rate: "Percentage of changes not captured by change feed",
  vector_hit_ratio: "Percentage of vector search queries hitting cache",
  insight_confidence_drift: "Change in confidence scores for insights over time",
}

export function Phase2MetricsDashboard() {
  const [metricType, setMetricType] = useState<MetricType>("vector_hit_ratio")
  const [startDate, setStartDate] = useState<Date>(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
  )
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [period, setPeriod] = useState<"minute" | "hour" | "day">("hour")

  const metricsParams = useMemo(
    () => ({
      metricType,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      period,
      limit: 1000,
    }),
    [metricType, startDate, endDate, period]
  )

  const aggregatedParams = useMemo(
    () => ({
      metricType,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    }),
    [metricType, startDate, endDate]
  )

  const { data: metricsData, isLoading: metricsLoading } = usePhase2Metrics(
    metricsParams,
    { enabled: true }
  )

  const { data: aggregatedData, isLoading: aggregatedLoading } =
    useAggregatedMetrics(aggregatedParams, { enabled: true })

  const metrics = metricsData?.metrics || []
  const aggregated = aggregatedData

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Phase 2 System Metrics
          </CardTitle>
          <CardDescription>
            Monitor system performance metrics stored as shards
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Metric Type</Label>
              <Select
                value={metricType}
                onValueChange={(value) => setMetricType(value as MetricType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(METRIC_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Period</Label>
              <Select
                value={period}
                onValueChange={(value) =>
                  setPeriod(value as "minute" | "hour" | "day")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minute">Minute</SelectItem>
                  <SelectItem value="hour">Hour</SelectItem>
                  <SelectItem value="day">Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="rounded-md bg-muted p-4">
            <p className="text-sm text-muted-foreground">
              {METRIC_TYPE_DESCRIPTIONS[metricType]}
            </p>
          </div>

          {/* Aggregated Metrics */}
          {aggregatedLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">Loading aggregated metrics...</p>
            </div>
          ) : aggregated ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">P50</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {typeof aggregated.p50 === "number"
                      ? aggregated.p50.toFixed(2)
                      : "-"}
                  </div>
                  <p className="text-xs text-muted-foreground">Median value</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">P95</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {typeof aggregated.p95 === "number"
                      ? aggregated.p95.toFixed(2)
                      : "-"}
                  </div>
                  <p className="text-xs text-muted-foreground">95th percentile</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">P99</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {typeof aggregated.p99 === "number"
                      ? aggregated.p99.toFixed(2)
                      : "-"}
                  </div>
                  <p className="text-xs text-muted-foreground">99th percentile</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Mean</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {typeof aggregated.mean === "number"
                      ? aggregated.mean.toFixed(2)
                      : "-"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Range: {typeof aggregated.min === "number" ? aggregated.min.toFixed(2) : "-"} -{" "}
                    {typeof aggregated.max === "number" ? aggregated.max.toFixed(2) : "-"}
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="rounded-md border p-4 text-center">
              <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No aggregated metrics available for the selected period
              </p>
            </div>
          )}

          {/* Metrics List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Time Series Data</h3>
              <Badge variant="outline">
                {metrics.length} data point{metrics.length !== 1 ? "s" : ""}
              </Badge>
            </div>

            {metricsLoading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">Loading metrics...</p>
              </div>
            ) : metrics.length === 0 ? (
              <div className="rounded-md border p-8 text-center">
                <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No metrics found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try adjusting the date range or metric type
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-muted">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                          Timestamp
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                          Value
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                          Period
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.map((metric) => (
                        <tr
                          key={metric.id}
                          className="border-t hover:bg-muted/50 transition-colors"
                        >
                          <td className="px-4 py-2 text-sm">
                            {format(new Date(metric.timestamp), "PPpp")}
                          </td>
                          <td className="px-4 py-2 text-sm font-medium">
                            {typeof metric.value === "number"
                              ? metric.value.toFixed(4)
                              : JSON.stringify(metric.value)}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            <Badge variant="outline">{metric.period}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}






