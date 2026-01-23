"use client"

import { format } from "date-fns"
import { CheckCircle2, XCircle, User, FileText, Settings, Shield } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuditLogs } from "@/hooks/use-audit"
import { Skeleton } from "@/components/ui/skeleton"
import type { AuditLog } from "@/types/api"

interface ActivityTimelineProps {
  userId?: string
  limit?: number
}

export function ActivityTimeline({ userId, limit = 10 }: ActivityTimelineProps) {
  const { data, isLoading } = useAuditLogs({ userId, limit })

  const getResourceIcon = (resource: string) => {
    switch (resource.toLowerCase()) {
      case 'user':
        return <User className="h-4 w-4" />
      case 'shard':
        return <FileText className="h-4 w-4" />
      case 'settings':
        return <Settings className="h-4 w-4" />
      case 'tenant':
        return <Shield className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getStatusIcon = (status: string) => {
    return status === 'success' ? (
      <CheckCircle2 className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Timeline of recent actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data?.items || data.items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Timeline of recent actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No activity yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Activity will appear here as actions are performed
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Timeline of recent actions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.items.map((log: AuditLog, index: number) => (
            <div key={log.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  {getResourceIcon(log.resource)}
                </div>
                {index < data.items.length - 1 && (
                  <div className="w-px h-full bg-border mt-2" />
                )}
              </div>
              <div className="flex-1 space-y-1 pb-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{log.action}</p>
                  {getStatusIcon(log.status)}
                  <Badge variant="outline" className="text-xs">
                    {log.resource}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  by {log.userName} ({log.userEmail})
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(log.timestamp), "MMM d, yyyy 'at' HH:mm:ss")}
                </p>
                {log.resourceId && (
                  <p className="text-xs text-muted-foreground font-mono">
                    ID: {log.resourceId.substring(0, 16)}...
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
