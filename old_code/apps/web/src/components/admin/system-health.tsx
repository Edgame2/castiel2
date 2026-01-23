"use client"

import { CheckCircle2, AlertTriangle, XCircle, Clock } from "lucide-react"
import { format } from "date-fns"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useSystemHealth } from "@/hooks/use-admin"
import { Skeleton } from "@/components/ui/skeleton"

export function SystemHealth() {
  const { data: health, isLoading } = useSystemHealth()

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-amber-600" />
      case 'down':
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'default'
      case 'degraded':
        return 'secondary'
      case 'down':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else {
      return `${minutes}m`
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
          <CardDescription>Monitor platform services status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center justify-between border rounded-lg p-4">
                <div className="flex items-center gap-4 flex-1">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!health) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>System Health</CardTitle>
            <CardDescription>Monitor platform services status</CardDescription>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              {getStatusIcon(health.status)}
              <Badge variant={getStatusBadgeVariant(health.status)}>
                {health.status.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Uptime: {formatUptime(health.uptime)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {health.services.map((service) => (
            <div
              key={service.name}
              className="flex items-center justify-between border rounded-lg p-4"
            >
              <div className="flex items-center gap-4 flex-1">
                {getStatusIcon(service.status)}
                <div>
                  <h3 className="font-semibold">{service.name}</h3>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>
                      Checked {format(new Date(service.lastChecked), "HH:mm:ss")}
                    </span>
                    {service.responseTime && (
                      <span>{service.responseTime}ms</span>
                    )}
                  </div>
                  {service.message && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {service.message}
                    </p>
                  )}
                </div>
              </div>
              <Badge variant={getStatusBadgeVariant(service.status)}>
                {service.status}
              </Badge>
            </div>
          ))}
        </div>

        {health.lastIncident && (
          <div className="mt-6 pt-6 border-t">
            <h3 className="font-semibold mb-2">Last Incident</h3>
            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                {format(new Date(health.lastIncident.timestamp), "MMM d, yyyy 'at' HH:mm")}
              </div>
              <p className="text-sm">{health.lastIncident.description}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
