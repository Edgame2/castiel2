"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  RefreshCw, 
  Search, 
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Pause,
  Play,
  AlertCircle,
  TrendingUp,
} from "lucide-react"
import { usePromptABTests, useUpdatePromptABTest } from "@/hooks/use-prompt-ab-tests"
import { formatDistanceToNow } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { PromptABTestStatus } from "@/lib/api/prompt-ab-tests"
import Link from "next/link"

export default function PromptABTestsPage() {
  const [statusFilter, setStatusFilter] = useState<PromptABTestStatus | undefined>(undefined)
  const [insightTypeFilter, setInsightTypeFilter] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")

  const { data, isLoading, refetch } = usePromptABTests({
    status: statusFilter,
    insightType: insightTypeFilter || undefined,
    limit: 50,
  })

  const updateMutation = useUpdatePromptABTest()

  const experiments = data?.items || []

  // Filter experiments by search query (client-side)
  const filteredExperiments = searchQuery
    ? experiments.filter(
        (exp) =>
          exp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          exp.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          exp.insightType.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : experiments

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

  const handleStatusChange = async (experimentId: string, newStatus: PromptABTestStatus) => {
    updateMutation.mutate({
      experimentId,
      input: { status: newStatus },
    })
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Prompt A/B Tests</h1>
          <p className="text-muted-foreground">
            Manage and monitor prompt A/B test experiments
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" asChild>
            <Link href="/admin/ai-settings/prompt-ab-tests/new">
              <Plus className="mr-2 h-4 w-4" />
              New Experiment
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, ID, or insight type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select 
              value={statusFilter || "all"} 
              onValueChange={(v) => setStatusFilter(v === "all" ? undefined : v as PromptABTestStatus)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value={PromptABTestStatus.Draft}>Draft</SelectItem>
                <SelectItem value={PromptABTestStatus.Active}>Active</SelectItem>
                <SelectItem value={PromptABTestStatus.Paused}>Paused</SelectItem>
                <SelectItem value={PromptABTestStatus.Completed}>Completed</SelectItem>
                <SelectItem value={PromptABTestStatus.Cancelled}>Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Insight Type"
              value={insightTypeFilter}
              onChange={(e) => setInsightTypeFilter(e.target.value)}
              className="w-[200px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Experiments List */}
      {isLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>Experiments</CardTitle>
            <CardDescription>List of prompt A/B test experiments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : filteredExperiments.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Experiments</CardTitle>
            <CardDescription>List of prompt A/B test experiments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No experiments found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Create your first A/B test experiment to get started
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Experiments ({filteredExperiments.length})</CardTitle>
            <CardDescription>List of prompt A/B test experiments</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Insight Type</TableHead>
                  <TableHead>Variants</TableHead>
                  <TableHead>Primary Metric</TableHead>
                  <TableHead>Impressions</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExperiments.map((experiment) => {
                  const totalImpressions = Object.values(experiment.metrics || {}).reduce(
                    (sum, m) => sum + (m.impressions || 0),
                    0
                  )
                  const variantCount = experiment.variants?.length || 0

                  return (
                    <TableRow key={experiment.id}>
                      <TableCell>
                        <Link
                          href={`/admin/ai-settings/prompt-ab-tests/${experiment.id}`}
                          className="font-medium hover:underline"
                        >
                          {experiment.name}
                        </Link>
                        {experiment.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {experiment.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(experiment.status)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{experiment.insightType}</Badge>
                      </TableCell>
                      <TableCell>{variantCount} variants</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{experiment.primaryMetric}</Badge>
                      </TableCell>
                      <TableCell>
                        {totalImpressions > 0 ? (
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-muted-foreground" />
                            {totalImpressions.toLocaleString()}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(experiment.createdAt), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {experiment.status === PromptABTestStatus.Active && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(experiment.id, PromptABTestStatus.Paused)}
                              disabled={updateMutation.isPending}
                            >
                              <Pause className="h-3 w-3" />
                            </Button>
                          )}
                          {experiment.status === PromptABTestStatus.Paused && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(experiment.id, PromptABTestStatus.Active)}
                              disabled={updateMutation.isPending}
                            >
                              <Play className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}









