"use client"

import { useState } from "react"
import { Info, AlertTriangle, XCircle } from "lucide-react"
import { format } from "date-fns"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useEnrichmentJobLogs } from "@/hooks/use-enrichment"
import { Skeleton } from "@/components/ui/skeleton"
import type { EnrichmentLogEntry } from "@/types/api"

interface JobLogsProps {
  jobId: string
}

export function JobLogs({ jobId }: JobLogsProps) {
  const [levelFilter, setLevelFilter] = useState<string>("")
  
  const { data, isLoading } = useEnrichmentJobLogs(jobId, {
    level: levelFilter || undefined,
    limit: 100,
  })

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'info':
        return <Info className="h-4 w-4 text-blue-600" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-600" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Info className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getLevelBadgeVariant = (level: string) => {
    switch (level) {
      case 'info':
        return 'default'
      case 'warning':
        return 'secondary'
      case 'error':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Job Logs</CardTitle>
          <CardDescription>Real-time logs for this enrichment job</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="border rounded-lg p-3">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Job Logs</CardTitle>
            <CardDescription>Real-time logs for this enrichment job</CardDescription>
          </div>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="flex h-9 w-32 rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="">All Levels</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {data?.items && data.items.length === 0 ? (
          <div className="text-center py-8">
            <Info className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No logs found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Logs will appear here as the job processes
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {data?.items.map((log: EnrichmentLogEntry) => (
              <div
                key={log.id}
                className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {getLevelIcon(log.level)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant={getLevelBadgeVariant(log.level)}>
                        {log.level}
                      </Badge>
                      {log.processor && (
                        <Badge variant="outline">{log.processor}</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.timestamp), "HH:mm:ss.SSS")}
                      </span>
                    </div>
                    <p className="text-sm break-words">{log.message}</p>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                          View details
                        </summary>
                        <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {data && data.total > data.items.length && (
          <div className="mt-4 pt-4 border-t text-center">
            <p className="text-sm text-muted-foreground">
              Showing {data.items.length} of {data.total} log entries
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
