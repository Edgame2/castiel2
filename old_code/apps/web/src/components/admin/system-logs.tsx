"use client"

import { useState } from "react"
import { AlertCircle, Info, AlertTriangle, XCircle } from "lucide-react"
import { format } from "date-fns"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useSystemLogs } from "@/hooks/use-admin"
import { Skeleton } from "@/components/ui/skeleton"
import type { SystemLog } from "@/types/api"

export function SystemLogs() {
  const [levelFilter, setLevelFilter] = useState<string>("")
  const [serviceFilter, setServiceFilter] = useState<string>("")
  
  const { data, isLoading } = useSystemLogs({
    level: levelFilter || undefined,
    service: serviceFilter || undefined,
    limit: 50,
  })

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'info':
        return <Info className="h-4 w-4 text-blue-600" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-600" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-700" />
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
      case 'critical':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Logs</CardTitle>
          <CardDescription>View platform system logs</CardDescription>
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
            <CardTitle>System Logs</CardTitle>
            <CardDescription>View platform system logs</CardDescription>
          </div>
        </div>
        <div className="flex gap-4 mt-4">
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="flex h-10 w-40 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
          >
            <option value="">All Levels</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="critical">Critical</option>
          </select>
          <Input
            placeholder="Filter by service..."
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="max-w-xs"
          />
        </div>
      </CardHeader>
      <CardContent>
        {data?.items && data.items.length === 0 ? (
          <div className="text-center py-8">
            <Info className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No logs found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Try adjusting your filters
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {data?.items.map((log: SystemLog) => (
              <div
                key={log.id}
                className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {getLevelIcon(log.level)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getLevelBadgeVariant(log.level)}>
                        {log.level}
                      </Badge>
                      <Badge variant="outline">{log.service}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.timestamp), "MMM d, yyyy HH:mm:ss")}
                      </span>
                    </div>
                    <p className="text-sm break-words">{log.message}</p>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                          View metadata
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
              Showing {data.items.length} of {data.total} logs
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
