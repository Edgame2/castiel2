"use client"

import { useState } from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { Download, FileDown, Loader2, X, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useDataExports,
  useRequestDataExport,
  useDownloadDataExport,
  useCancelDataExport,
} from "@/hooks/use-data-export"
import { format } from "date-fns"

export default function DataExportPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { t } = (useTranslation as any)('settings')
  const { data: exports, isLoading } = useDataExports()
  const requestExport = useRequestDataExport()
  const downloadExport = useDownloadDataExport()
  const cancelExport = useCancelDataExport()

  const handleRequestExport = async () => {
    await requestExport.mutateAsync({
      format: 'json',
      includeShards: true,
      includeAuditLogs: true,
      includeProfile: true,
    })
  }

  const handleDownload = async (exportData: any) => {
    await downloadExport.mutateAsync(exportData)
  }

  const handleCancel = async (id: string) => {
    await cancelExport.mutateAsync(id)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'expired':
        return <AlertCircle className="h-4 w-4 text-gray-500" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default">{t('dataExport.status.completed' as any)}</Badge>
      case 'processing':
        return <Badge variant="secondary">{t('dataExport.status.processing' as any)}</Badge>
      case 'pending':
        return <Badge variant="outline">{t('dataExport.status.pending' as any)}</Badge>
      case 'failed':
        return <Badge variant="destructive">{t('dataExport.status.failed' as any)}</Badge>
      case 'expired':
        return <Badge variant="secondary">{t('dataExport.status.expired' as any)}</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2">
          <Link
            href="/settings"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t('backToSettings' as any)}
          </Link>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{t('dataExport.title' as any)}</h1>
        <p className="text-muted-foreground">
          {t('dataExport.subtitle' as any)}
        </p>
      </div>

      <Alert>
        <AlertDescription>
          {t('dataExport.gdprNotice' as any)}
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>{t('dataExport.requestTitle' as any)}</CardTitle>
          <CardDescription>
            {t('dataExport.requestDescription' as any)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p className="mb-2 font-medium">{t('dataExport.includesTitle' as any)}</p>
              <ul className="list-inside list-disc space-y-1">
                <li>{t('dataExport.includeProfile' as any)}</li>
                <li>{t('dataExport.includeShards' as any)}</li>
                <li>{t('dataExport.includeAuditLogs' as any)}</li>
                <li>{t('dataExport.includeApiKeys' as any)}</li>
                <li>{t('dataExport.includeUsage' as any)}</li>
              </ul>
            </div>
            <Button
              onClick={handleRequestExport}
              disabled={requestExport.isPending}
            >
              {requestExport.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('dataExport.requesting' as any)}
                </>
              ) : (
                <>
                  <FileDown className="mr-2 h-4 w-4" />
                  {t('dataExport.requestNew' as any)}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
      ) : exports && exports.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('dataExport.historyTitle' as any)}</CardTitle>
            <CardDescription>
              {t('dataExport.historyDescription' as any)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {exports.map((exportItem: any) => (
                <div
                  key={exportItem.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(exportItem.status)}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {t('dataExport.requestedOn' as any)} {format(new Date(exportItem.requestedAt), 'PPP')}
                        </p>
                        {getStatusBadge(exportItem.status)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>{t('dataExport.format' as any)}: {exportItem.format.toUpperCase()}</p>
                        {exportItem.completedAt && (
                          <p>{t('dataExport.completed' as any)}: {format(new Date(exportItem.completedAt), 'PPp')}</p>
                        )}
                        {exportItem.expiresAt && exportItem.status === 'completed' && (
                          <p>{t('dataExport.expires' as any)}: {format(new Date(exportItem.expiresAt), 'PPp')}</p>
                        )}
                        {exportItem.fileSize && (
                          <p>{t('dataExport.size' as any)}: {(exportItem.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                        )}
                        {exportItem.error && (
                          <p className="text-destructive">{t('dataExport.error' as any)}: {exportItem.error}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {exportItem.status === 'completed' && (
                      <Button
                        size="sm"
                        onClick={() => handleDownload(exportItem)}
                        disabled={downloadExport.isPending}
                      >
                        {downloadExport.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="mr-2 h-4 w-4" />
                        )}
                        {t('dataExport.download' as any)}
                      </Button>
                    )}
                    {(exportItem.status === 'pending' || exportItem.status === 'processing') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancel(exportItem.id)}
                        disabled={cancelExport.isPending}
                      >
                        <X className="mr-2 h-4 w-4" />
                        {t('dataExport.cancel' as any)}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <FileDown className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              {t('dataExport.noExports' as any)}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('dataExport.importantInfo' as any)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <p className="mb-1 font-medium text-foreground">{t('dataExport.processingTime' as any)}</p>
            <p>
              {t('dataExport.processingTimeDesc' as any)}
            </p>
          </div>
          <div>
            <p className="mb-1 font-medium text-foreground">{t('dataExport.downloadAvailability' as any)}</p>
            <p>
              {t('dataExport.downloadAvailabilityDesc' as any)}
            </p>
          </div>
          <div>
            <p className="mb-1 font-medium text-foreground">{t('dataExport.dataFormat' as any)}</p>
            <p>
              {t('dataExport.dataFormatDesc' as any)}
            </p>
          </div>
          <div>
            <p className="mb-1 font-medium text-foreground">{t('dataExport.security' as any)}</p>
            <p>
              {t('dataExport.securityDesc' as any)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
