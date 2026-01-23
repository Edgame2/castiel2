"use client"

import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  ArrowLeft,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  BarChart3,
  AlertCircle,
  Edit,
  Download,
} from "lucide-react"
import { usePromptABTest, useUpdatePromptABTest, usePromptABTestResults, useExportPromptABTestResults } from "@/hooks/use-prompt-ab-tests"
import { PromptABTestStatus } from "@/lib/api/prompt-ab-tests"
import { formatDistanceToNow } from "date-fns"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart } from "@/components/widgets/charts/bar-chart"

export default function PromptABTestDetailPage() {
  const params = useParams()
  const router = useRouter()
  const experimentId = params.id as string

  const { data: experiment, isLoading } = usePromptABTest(experimentId)
  const { data: results } = usePromptABTestResults(experimentId)
  const updateMutation = useUpdatePromptABTest()
  const exportMutation = useExportPromptABTestResults()

  const experimentData = results || experiment

  const getStatusBadge = (status: PromptABTestStatus) => {
    switch (status) {
      case PromptABTestStatus.Active:
        return (
          <Badge variant="default" className="bg-green-500">
            <Play className="h-3 w-3 mr-1" />
            Active
          </Badge>
        )
      case PromptABTestStatus.Paused:
        return (
          <Badge variant="secondary">
            <Pause className="h-3 w-3 mr-1" />
            Paused
          </Badge>
        )
      case PromptABTestStatus.Completed:
        return (
          <Badge variant="default" className="bg-blue-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        )
      case PromptABTestStatus.Cancelled:
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Cancelled
          </Badge>
        )
      case PromptABTestStatus.Draft:
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            Draft
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleStatusChange = async (newStatus: PromptABTestStatus) => {
    if (!experiment) return
    updateMutation.mutate({
      experimentId: experiment.id,
      input: { status: newStatus },
    })
  }

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-8 pt-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!experimentData) {
    return (
      <div className="flex-1 space-y-6 p-8 pt-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Experiment Not Found</h1>
            <p className="text-muted-foreground">The A/B test experiment could not be found.</p>
          </div>
        </div>
      </div>
    )
  }

  const totalImpressions = Object.values(experimentData.metrics || {}).reduce(
    (sum, m) => sum + (m.impressions || 0),
    0
  )

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{experimentData.name}</h1>
            <p className="text-muted-foreground">
              {experimentData.description || "A/B test experiment"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(experimentData.status)}
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportMutation.mutate({ experimentId, format: 'json' })}
            disabled={exportMutation.isPending}
          >
            <Download className="h-4 w-4 mr-2" />
            {exportMutation.isPending ? 'Exporting...' : 'Export'}
          </Button>
          {(experimentData.status === PromptABTestStatus.Draft || 
            experimentData.status === PromptABTestStatus.Paused) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/admin/ai-settings/prompt-ab-tests/${experimentId}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {experimentData.status === PromptABTestStatus.Active && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange(PromptABTestStatus.Paused)}
              disabled={updateMutation.isPending}
            >
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
          )}
          {experimentData.status === PromptABTestStatus.Paused && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange(PromptABTestStatus.Active)}
              disabled={updateMutation.isPending}
            >
              <Play className="h-4 w-4 mr-2" />
              Resume
            </Button>
          )}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getStatusBadge(experimentData.status)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {experimentData.startDate
                ? `Started ${formatDistanceToNow(new Date(experimentData.startDate), { addSuffix: true })}`
                : "Not started"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Impressions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalImpressions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all variants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Variants</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{experimentData.variants?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active variants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Primary Metric</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{experimentData.primaryMetric}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Success metric
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Details Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="variants">Variants & Metrics</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Experiment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Insight Type</label>
                <p className="mt-1">
                  <Badge variant="outline">{experimentData.insightType}</Badge>
                </p>
              </div>
              {experimentData.hypothesis && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Hypothesis</label>
                  <p className="mt-1 text-sm">{experimentData.hypothesis}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created</label>
                <p className="mt-1 text-sm">
                  {formatDistanceToNow(new Date(experimentData.createdAt), { addSuffix: true })}
                </p>
              </div>
              {experimentData.startDate && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Start Date</label>
                  <p className="mt-1 text-sm">
                    {new Date(experimentData.startDate).toLocaleString()}
                  </p>
                </div>
              )}
              {experimentData.endDate && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">End Date</label>
                  <p className="mt-1 text-sm">
                    {new Date(experimentData.endDate).toLocaleString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variants" className="space-y-4">
          {/* Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Success Rate Comparison</CardTitle>
                <CardDescription>Percentage of successful responses</CardDescription>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={experimentData.variants?.map((variant) => {
                    const metrics = experimentData.metrics?.[variant.variantId] || {
                      impressions: 0,
                      successfulResponses: 0,
                    }
                    const successRate =
                      metrics.impressions > 0
                        ? (metrics.successfulResponses / metrics.impressions) * 100
                        : 0
                    return {
                      label: variant.name,
                      value: parseFloat(successRate.toFixed(1)),
                    }
                  }) || []}
                  config={{
                    showDataLabels: true,
                    orientation: 'vertical',
                    valueFormatter: (v) => `${v}%`,
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Average Latency Comparison</CardTitle>
                <CardDescription>Response time in milliseconds</CardDescription>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={experimentData.variants?.map((variant) => {
                    const metrics = experimentData.metrics?.[variant.variantId] || {
                      averageLatencyMs: 0,
                    }
                    return {
                      label: variant.name,
                      value: Math.round(metrics.averageLatencyMs || 0),
                    }
                  }) || []}
                  config={{
                    showDataLabels: true,
                    orientation: 'vertical',
                    valueFormatter: (v) => `${v}ms`,
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Total Cost Comparison</CardTitle>
                <CardDescription>Cost in USD</CardDescription>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={experimentData.variants?.map((variant) => {
                    const metrics = experimentData.metrics?.[variant.variantId] || {
                      totalCost: 0,
                    }
                    return {
                      label: variant.name,
                      value: parseFloat((metrics.totalCost || 0).toFixed(4)),
                    }
                  }) || []}
                  config={{
                    showDataLabels: true,
                    orientation: 'vertical',
                    valueFormatter: (v) => `$${v.toFixed(4)}`,
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Impressions Comparison</CardTitle>
                <CardDescription>Total number of impressions</CardDescription>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={experimentData.variants?.map((variant) => {
                    const metrics = experimentData.metrics?.[variant.variantId] || {
                      impressions: 0,
                    }
                    return {
                      label: variant.name,
                      value: metrics.impressions || 0,
                    }
                  }) || []}
                  config={{
                    showDataLabels: true,
                    orientation: 'vertical',
                  }}
                />
              </CardContent>
            </Card>
          </div>

          {/* Metrics Table */}
          <Card>
            <CardHeader>
              <CardTitle>Variants & Performance</CardTitle>
              <CardDescription>
                Compare variant performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variant</TableHead>
                    <TableHead>Traffic</TableHead>
                    <TableHead>Impressions</TableHead>
                    <TableHead>Success Rate</TableHead>
                    <TableHead>Avg Latency</TableHead>
                    <TableHead>Avg Tokens</TableHead>
                    <TableHead>Total Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {experimentData.variants?.map((variant) => {
                    const metrics = experimentData.metrics?.[variant.variantId] || {
                      impressions: 0,
                      successfulResponses: 0,
                      failedResponses: 0,
                      averageTokens: 0,
                      averageLatencyMs: 0,
                      totalCost: 0,
                    }
                    const successRate =
                      metrics.impressions > 0
                        ? ((metrics.successfulResponses / metrics.impressions) * 100).toFixed(1)
                        : "0.0"

                    return (
                      <TableRow key={variant.variantId}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{variant.name}</p>
                            {variant.description && (
                              <p className="text-sm text-muted-foreground">{variant.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{variant.trafficPercentage}%</TableCell>
                        <TableCell>{metrics.impressions.toLocaleString()}</TableCell>
                        <TableCell>{successRate}%</TableCell>
                        <TableCell>
                          {metrics.averageLatencyMs > 0
                            ? `${Math.round(metrics.averageLatencyMs)}ms`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {metrics.averageTokens > 0 ? Math.round(metrics.averageTokens) : "-"}
                        </TableCell>
                        <TableCell>
                          {metrics.totalCost > 0 ? `$${metrics.totalCost.toFixed(4)}` : "-"}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {experimentData.results ? (
            <Card>
              <CardHeader>
                <CardTitle>Experiment Results</CardTitle>
                <CardDescription>
                  Statistical analysis and winner determination
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {experimentData.results.winner && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Winner</label>
                    <p className="mt-1">
                      <Badge variant="default" className="bg-green-500">
                        {experimentData.variants?.find((v) => v.variantId === experimentData.results?.winner)
                          ?.name || experimentData.results.winner}
                      </Badge>
                    </p>
                  </div>
                )}
                {experimentData.results.statisticalSignificance !== undefined && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Statistical Significance
                    </label>
                    <p className="mt-1 text-sm">
                      {(experimentData.results.statisticalSignificance * 100).toFixed(2)}%
                    </p>
                  </div>
                )}
                {experimentData.results.improvement !== undefined && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Improvement</label>
                    <p className="mt-1 text-sm">
                      {experimentData.results.improvement > 0 ? "+" : ""}
                      {experimentData.results.improvement.toFixed(2)}%
                    </p>
                  </div>
                )}
                {experimentData.results.completedAt && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Completed</label>
                    <p className="mt-1 text-sm">
                      {formatDistanceToNow(new Date(experimentData.results.completedAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No results yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Results will appear here once the experiment is completed
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

