"use client"

import { useParams, useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react"
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
import { useAuditLog } from "@/hooks/use-audit"

export default function AuditLogDetailPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { t } = useTranslation('common') as any
  const params = useParams()
  const router = useRouter()
  const logId = params.id as string

  const { data: log, isLoading } = useAuditLog(logId)

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
        </div>
      </div>
    )
  }

  if (!log) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold">{t('detail.notFound', 'Log not found')}</h2>
          <p className="text-muted-foreground mt-2">
            {t('detail.notFoundDesc', "The audit log you're looking for doesn't exist")}
          </p>
          <Button onClick={() => router.push('/audit')} className="mt-4">
            {t('detail.backToLogs', 'Back to Audit Logs')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push('/audit')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('detail.title', 'Audit Log Details')}</h2>
          <p className="text-muted-foreground">{log.action}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('detail.logInfo', 'Log Information')}</CardTitle>
            <CardDescription>{t('detail.logInfoDesc', 'Details about this audit event')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t('common:status' as any)}</label>
              <div className="mt-1 flex items-center gap-2">
                {log.status === 'success' ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <Badge variant="default">{t('common:success' as any)}</Badge>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-600" />
                    <Badge variant="destructive">{t('detail.failure', 'Failure')}</Badge>
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">{t('detail.action', 'Action')}</label>
              <p className="mt-1 font-medium">{log.action}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">{t('detail.resource', 'Resource')}</label>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="outline">{log.resource}</Badge>
                {log.resourceId && (
                  <span className="text-sm font-mono">{log.resourceId}</span>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">{t('detail.timestamp', 'Timestamp')}</label>
              <p className="mt-1">
                {format(new Date(log.timestamp), "MMMM d, yyyy 'at' HH:mm:ss")}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('detail.userInfo', 'User Information')}</CardTitle>
            <CardDescription>{t('detail.userInfoDesc', 'Details about who performed this action')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t('detail.user', 'User')}</label>
              <div className="mt-1">
                <p className="font-medium">{log.userName}</p>
                <p className="text-sm text-muted-foreground">{log.userEmail}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">{t('detail.userId', 'User ID')}</label>
              <p className="mt-1 font-mono text-sm">{log.userId}</p>
            </div>

            {log.ipAddress && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t('detail.ipAddress', 'IP Address')}</label>
                <p className="mt-1 font-mono text-sm">{log.ipAddress}</p>
              </div>
            )}

            {log.userAgent && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t('detail.userAgent', 'User Agent')}</label>
                <p className="mt-1 text-sm break-words">{log.userAgent}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {log.changes && Object.keys(log.changes).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('detail.changes', 'Changes')}</CardTitle>
            <CardDescription>{t('detail.changesDesc', 'Fields that were modified')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(log.changes).map(([field, change]) => (
                <div key={field} className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">{field}</h3>
                  <div className="grid gap-2 md:grid-cols-2">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">{t('detail.oldValue', 'Old Value')}</label>
                      <pre className="mt-1 text-sm bg-muted p-2 rounded overflow-x-auto">
                        {JSON.stringify(change.old, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">{t('detail.newValue', 'New Value')}</label>
                      <pre className="mt-1 text-sm bg-muted p-2 rounded overflow-x-auto">
                        {JSON.stringify(change.new, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {log.metadata && Object.keys(log.metadata).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('detail.additionalMetadata', 'Additional Metadata')}</CardTitle>
            <CardDescription>{t('detail.additionalMetadataDesc', 'Extra information about this event')}</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-muted p-4 rounded overflow-x-auto">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
