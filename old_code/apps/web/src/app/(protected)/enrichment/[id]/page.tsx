"use client"

import { useParams, useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { ArrowLeft, RotateCw, X } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { JobStatusBadge } from "@/components/enrichment/job-status-badge"
import { JobLogs } from "@/components/enrichment/job-logs"
import {
  useEnrichmentJob,
  useRetryEnrichmentJob,
  useCancelEnrichmentJob,
} from "@/hooks/use-enrichment"

export default function EnrichmentJobDetailPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { t } = (useTranslation as any)('settings')
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string

  const { data: job, isLoading } = useEnrichmentJob(jobId)
  const retryJob = useRetryEnrichmentJob()
  const cancelJob = useCancelEnrichmentJob()

  const handleRetry = () => {
    if (confirm(t('enrichment.retryConfirm' as any))) {
      retryJob.mutate(jobId, {
        onSuccess: () => router.push('/enrichment'),
      })
    }
  }

  const handleCancel = () => {
    if (confirm(t('enrichment.cancelConfirm' as any))) {
      cancelJob.mutate(jobId)
    }
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold">{t('enrichment.detail.notFound', 'Job not found')}</h2>
          <p className="text-muted-foreground mt-2">
            {t('enrichment.detail.notFoundDesc', "The enrichment job you're looking for doesn't exist")}
          </p>
          <Button onClick={() => router.push('/enrichment')} className="mt-4">
            {t('enrichment.detail.backToJobs', 'Back to Jobs')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/enrichment')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{t('enrichment.detail.title', 'Job Details')}</h2>
            <p className="text-muted-foreground">{job.shardName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {job.status === 'failed' && (
            <Button onClick={handleRetry} disabled={retryJob.isPending}>
              <RotateCw className="mr-2 h-4 w-4" />
              {t('enrichment.detail.retryJob', 'Retry Job')}
            </Button>
          )}
          {(job.status === 'queued' || job.status === 'processing') && (
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelJob.isPending}
            >
              <X className="mr-2 h-4 w-4" />
              {t('enrichment.detail.cancelJob', 'Cancel Job')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('enrichment.detail.jobInfo', 'Job Information')}</CardTitle>
            <CardDescription>{t('enrichment.detail.jobInfoDesc', 'Details about this enrichment job')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t('common:status' as any)}</label>
              <div className="mt-1">
                <JobStatusBadge status={job.status} progress={job.progress} showProgress={false} />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">{t('enrichment.detail.progress', 'Progress')}</label>
              <div className="mt-1 text-lg font-semibold">
                {Math.round(job.progress)}%
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">{t('enrichment.detail.shard', 'Shard')}</label>
              <div className="mt-1">
                <p className="font-medium">{job.shardName}</p>
                <p className="text-sm text-muted-foreground font-mono">{job.shardId}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">{t('enrichment.detail.processors', 'Processors')}</label>
              <div className="mt-1 flex flex-wrap gap-1">
                {job.processors.map((processor) => (
                  <Badge key={processor} variant="outline">
                    {processor}
                  </Badge>
                ))}
              </div>
            </div>

            {job.error && (
              <div>
                <label className="text-sm font-medium text-destructive">{t('common:error' as any)}</label>
                <div className="mt-1 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-sm text-destructive">{job.error}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('enrichment.detail.timeline', 'Timeline')}</CardTitle>
            <CardDescription>{t('enrichment.detail.timelineDesc', 'Job execution timeline')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t('enrichment.detail.created', 'Created')}</label>
              <div className="mt-1">
                <p>{format(new Date(job.createdAt), "MMM d, yyyy 'at' HH:mm:ss")}</p>
              </div>
            </div>

            {job.startedAt && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t('enrichment.detail.started', 'Started')}</label>
                <div className="mt-1">
                  <p>{format(new Date(job.startedAt), "MMM d, yyyy 'at' HH:mm:ss")}</p>
                </div>
              </div>
            )}

            {job.completedAt && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t('enrichment.completed' as any)}</label>
                <div className="mt-1">
                  <p>{format(new Date(job.completedAt), "MMM d, yyyy 'at' HH:mm:ss")}</p>
                </div>
              </div>
            )}

            {job.duration && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t('enrichment.detail.duration', 'Duration')}</label>
                <div className="mt-1">
                  <p className="text-lg font-semibold">{formatDuration(job.duration)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <JobLogs jobId={jobId} />
    </div>
  )
}
