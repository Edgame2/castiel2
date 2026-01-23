"use client"

import * as React from "react"
import { Sparkles, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Loader2, Clock, Zap, FileCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatDistanceToNow } from "date-fns"
import { useEmbeddingStatus, useGenerateEmbedding, useRegenerateEmbedding, useValidateEmbedding, useEmbeddingHistory, embeddingKeys } from "@/hooks/use-embeddings"
import { useQuery } from "@tanstack/react-query"
import { embeddingsApi } from "@/lib/api/embeddings"
import { Progress } from "@/components/ui/progress"
import { useEmbeddingJobs } from "@/hooks/use-embedding-jobs"
import { Skeleton } from "@/components/ui/skeleton"
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
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

interface EmbeddingStatusPanelProps {
  shardId: string
  className?: string
}

export function EmbeddingStatusPanel({ shardId, className }: EmbeddingStatusPanelProps) {
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useEmbeddingStatus(shardId)
  const { data: history, isLoading: historyLoading } = useEmbeddingHistory(shardId, 5)
  const generateEmbedding = useGenerateEmbedding()
  const regenerateEmbedding = useRegenerateEmbedding()
  const validateEmbedding = useValidateEmbedding()

  // Get active embedding jobs for this shard
  const { data: activeJobsData } = useEmbeddingJobs({
    shardId,
    status: 'processing', // Only get processing jobs
    limit: 1,
  })
  const activeJob = activeJobsData?.jobs?.[0]

  // Fetch validation results if available (from cache, don't auto-fetch)
  // The validation mutation sets this data when user clicks "Validate Quality"
  const { data: validationResult } = useQuery({
    queryKey: embeddingKeys.validation(shardId),
    queryFn: () => embeddingsApi.validate(shardId),
    enabled: false, // Only fetch when explicitly requested via validate mutation
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    // Use cached data if available (set by validation mutation)
    initialData: undefined,
  })

  const handleGenerate = async (force: boolean = false) => {
    try {
      await generateEmbedding.mutateAsync({ shardId, force })
      refetchStatus()
    } catch (error) {
      // Error handled by hook
    }
  }

  const handleRegenerate = async () => {
    try {
      await regenerateEmbedding.mutateAsync(shardId)
      refetchStatus()
    } catch (error) {
      // Error handled by hook
    }
  }

  const handleValidate = async () => {
    try {
      await validateEmbedding.mutateAsync(shardId)
    } catch (error) {
      // Error handled by hook
    }
  }

  if (statusLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Embedding Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-8 w-32" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!status) {
    return null
  }

  const isGenerating = generateEmbedding.isPending || regenerateEmbedding.isPending
  const isRecent = status.isRecent
  const hasEmbeddings = status.hasEmbeddings

  // Calculate quality score from validation metrics
  const qualityScore = React.useMemo(() => {
    if (!validationResult || !hasEmbeddings) return null

    const { metrics, issues } = validationResult
    let score = 100

    // Deduct points for issues
    score -= issues.length * 15

    // Deduct points for missing metrics
    if (!metrics.isNormalized) score -= 10
    if (!metrics.hasValidModel) score -= 10
    if (metrics.dimensions === null) score -= 10

    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, score))
  }, [validationResult, hasEmbeddings])

  // Calculate freshness score (0-100, where 100 is very recent, 0 is very old)
  const freshnessScore = React.useMemo(() => {
    if (!status.latestVectorDate) return null

    const daysSinceGeneration = (Date.now() - new Date(status.latestVectorDate).getTime()) / (1000 * 60 * 60 * 24)
    
    // Score decreases over time:
    // 0-7 days: 100-80
    // 7-30 days: 80-50
    // 30-90 days: 50-20
    // 90+ days: 20-0
    if (daysSinceGeneration <= 7) {
      return 100 - (daysSinceGeneration / 7) * 20
    } else if (daysSinceGeneration <= 30) {
      return 80 - ((daysSinceGeneration - 7) / 23) * 30
    } else if (daysSinceGeneration <= 90) {
      return 50 - ((daysSinceGeneration - 30) / 60) * 30
    } else {
      return Math.max(0, 20 - ((daysSinceGeneration - 90) / 90) * 20)
    }
  }, [status.latestVectorDate])

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            <CardTitle className="text-lg">Embedding Status</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Actions
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!hasEmbeddings ? (
                  <DropdownMenuItem onClick={() => handleGenerate(false)} disabled={isGenerating}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Embeddings
                  </DropdownMenuItem>
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => handleRegenerate()} disabled={isGenerating}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Regenerate Embeddings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleGenerate(true)} disabled={isGenerating}>
                      <Zap className="mr-2 h-4 w-4" />
                      Force Regenerate
                    </DropdownMenuItem>
                  </>
                )}
                {hasEmbeddings && (
                  <DropdownMenuItem onClick={() => handleValidate()} disabled={validateEmbedding.isPending}>
                    <FileCheck className="mr-2 h-4 w-4" />
                    Validate Quality
                    {validateEmbedding.isPending && (
                      <Loader2 className="ml-auto h-4 w-4 animate-spin" />
                    )}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          {hasEmbeddings ? (
            <>
              <Badge
                variant={isRecent ? "default" : "secondary"}
                className={cn(
                  "gap-1",
                  isRecent && "bg-green-500 hover:bg-green-600"
                )}
              >
                {isRecent ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    Active
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3 w-3" />
                    Stale
                  </>
                )}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {status.vectorCount} vector{status.vectorCount !== 1 ? 's' : ''}
              </span>
              {/* Quality Score Badge */}
              {qualityScore !== null && (
                <Badge
                  variant="outline"
                  className={cn(
                    "gap-1",
                    qualityScore >= 80 && "border-green-500 text-green-700 bg-green-50 dark:bg-green-950 dark:text-green-400",
                    qualityScore >= 60 && qualityScore < 80 && "border-yellow-500 text-yellow-700 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-400",
                    qualityScore < 60 && "border-red-500 text-red-700 bg-red-50 dark:bg-red-950 dark:text-red-400"
                  )}
                >
                  <FileCheck className="h-3 w-3" />
                  Quality: {qualityScore}%
                </Badge>
              )}
            </>
          ) : (
            <Badge variant="outline" className="gap-1">
              <XCircle className="h-3 w-3" />
              No Embeddings
            </Badge>
          )}
        </div>

        {/* Quality Score Progress Bar */}
        {hasEmbeddings && qualityScore !== null && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Quality Score</span>
              <span className={cn(
                "font-medium",
                qualityScore >= 80 && "text-green-600",
                qualityScore >= 60 && qualityScore < 80 && "text-yellow-600",
                qualityScore < 60 && "text-red-600"
              )}>
                {qualityScore}%
              </span>
            </div>
            <Progress 
              value={qualityScore} 
              className="h-2"
            />
            {validationResult && validationResult.issues.length > 0 && (
              <div className="mt-2 space-y-1">
                {validationResult.issues.slice(0, 3).map((issue, idx) => (
                  <div key={idx} className="flex items-start gap-1 text-xs text-muted-foreground">
                    <AlertTriangle className="h-3 w-3 text-yellow-600 mt-0.5 shrink-0" />
                    <span>{issue}</span>
                  </div>
                ))}
                {validationResult.issues.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{validationResult.issues.length - 3} more issue{validationResult.issues.length - 3 !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Freshness Indicator */}
        {hasEmbeddings && freshnessScore !== null && status.latestVectorDate && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Freshness
              </span>
              <span className={cn(
                "font-medium",
                freshnessScore >= 80 && "text-green-600",
                freshnessScore >= 50 && freshnessScore < 80 && "text-yellow-600",
                freshnessScore < 50 && "text-red-600"
              )}>
                {freshnessScore.toFixed(0)}%
              </span>
            </div>
            <Progress 
              value={freshnessScore} 
              className={cn(
                "h-2",
                freshnessScore >= 80 && "[&>div]:bg-green-500",
                freshnessScore >= 50 && freshnessScore < 80 && "[&>div]:bg-yellow-500",
                freshnessScore < 50 && "[&>div]:bg-red-500"
              )}
            />
            <p className="text-xs text-muted-foreground">
              Generated {formatDistanceToNow(new Date(status.latestVectorDate), { addSuffix: true })}
            </p>
          </div>
        )}

        {/* Details */}
        {hasEmbeddings && (
          <div className="space-y-2 text-sm">
            {status.latestVectorDate && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last Generated
                </span>
                <span className="font-medium">
                  {formatDistanceToNow(new Date(status.latestVectorDate), { addSuffix: true })}
                </span>
              </div>
            )}
            {status.model && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Model</span>
                <span className="font-medium">{status.model}</span>
              </div>
            )}
            {status.dimensions && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Dimensions</span>
                <span className="font-medium">{status.dimensions}</span>
              </div>
            )}
          </div>
        )}

        {/* Active Job Progress */}
        {activeJob && (activeJob.status === 'processing' || activeJob.status === 'pending') && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Generation in Progress
                </h4>
                <Badge variant="outline" className="text-xs">
                  {activeJob.status === 'processing' ? 'Processing' : 'Pending'}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium capitalize">{activeJob.status}</span>
                </div>
                {activeJob.metadata?.processingTimeMs && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Elapsed Time</span>
                    <span className="font-medium">
                      {((activeJob.metadata.processingTimeMs || 0) / 1000).toFixed(1)}s
                    </span>
                  </div>
                )}
                {activeJob.retryCount > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Retry Count</span>
                    <span className="font-medium">{activeJob.retryCount}</span>
                  </div>
                )}
                {/* Progress indicator (indeterminate for now since we don't have detailed progress) */}
                <div className="space-y-1">
                  <Progress value={activeJob.status === 'processing' ? 50 : 10} className="h-2" />
                  <p className="text-xs text-muted-foreground text-center">
                    {activeJob.status === 'processing' 
                      ? 'Generating embeddings...' 
                      : 'Waiting to start...'}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* History */}
        {hasEmbeddings && history && history.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Recent History</h4>
              <div className="space-y-1">
                {history.slice(0, 3).map((item) => (
                  <div
                    key={item.jobId}
                    className="flex items-center justify-between text-xs p-2 rounded bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      {item.status === 'completed' ? (
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                      ) : item.status === 'failed' ? (
                        <XCircle className="h-3 w-3 text-red-500" />
                      ) : (
                        <Loader2 className="h-3 w-3 text-yellow-500 animate-spin" />
                      )}
                      <span className="capitalize">{item.status}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Empty State */}
        {!hasEmbeddings && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              No embeddings generated yet. Generate embeddings to enable semantic search.
            </p>
            <Button
              size="sm"
              onClick={() => handleGenerate(false)}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Embeddings
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

