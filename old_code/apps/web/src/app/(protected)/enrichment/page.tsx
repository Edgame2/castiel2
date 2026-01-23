"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table/data-table"
import { EnrichmentStats } from "@/components/enrichment/enrichment-stats"
import {
  useEnrichmentJobs,
  useRetryEnrichmentJob,
  useCancelEnrichmentJob,
} from "@/hooks/use-enrichment"
import { getEnrichmentColumns } from "./columns"

export default function EnrichmentPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { t } = (useTranslation as any)('settings')
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<string>("")
  
  const { data, isLoading, refetch } = useEnrichmentJobs({
    status: statusFilter || undefined,
  })
  const retryJob = useRetryEnrichmentJob()
  const cancelJob = useCancelEnrichmentJob()

  const handleRetry = (jobId: string) => {
    if (confirm(t('enrichment.retryConfirm' as any))) {
      retryJob.mutate(jobId)
    }
  }

  const handleCancel = (jobId: string) => {
    if (confirm(t('enrichment.cancelConfirm' as any))) {
      cancelJob.mutate(jobId)
    }
  }

  const columns = getEnrichmentColumns({
    onRetry: handleRetry,
    onCancel: handleCancel,
  })

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('enrichment.title' as any)}</h2>
          <p className="text-muted-foreground">
            {t('enrichment.subtitle' as any)}
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex h-10 w-40 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">{t('enrichment.allStatus' as any)}</option>
            <option value="queued">{t('enrichment.queued' as any)}</option>
            <option value="processing">{t('enrichment.processing' as any)}</option>
            <option value="completed">{t('enrichment.completed' as any)}</option>
            <option value="failed">{t('enrichment.failed' as any)}</option>
            <option value="cancelled">{t('enrichment.cancelled' as any)}</option>
          </select>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('enrichment.refresh' as any)}
          </Button>
        </div>
      </div>

      <EnrichmentStats />

      <DataTable
        columns={columns}
        data={data?.items || []}
        searchKey="shardName"
        searchPlaceholder={t('enrichment.searchPlaceholder' as any)}
        onRowClick={(job) => router.push(`/enrichment/${job.id}`)}
        isLoading={isLoading}
      />
    </div>
  )
}
