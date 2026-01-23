"use client"

import { Users, Database, Activity, HardDrive } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useUsageStats } from "@/hooks/use-tenant"
import { Skeleton } from "@/components/ui/skeleton"

export function UsageStats() {
  const { data: stats, isLoading } = useUsageStats()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage & Limits</CardTitle>
          <CardDescription>Monitor your organization's resource usage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return null
  }

  const usersPercentage = (stats.users.total / stats.users.limit) * 100
  const shardsPercentage = (stats.shards.total / stats.shards.limit) * 100
  const apiCallsPercentage = (stats.apiCalls.total / stats.apiCalls.limit) * 100
  const storagePercentage = (stats.storage.used / stats.storage.limit) * 100

  const formatBytes = (bytes: number) => {
    const sizes = ["B", "KB", "MB", "GB", "TB"]
    if (bytes === 0) return "0 B"
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage & Limits</CardTitle>
        <CardDescription>
          Monitor your organization's resource usage
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Users */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Users</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total users</span>
                <span className="font-medium">
                  {formatNumber(stats.users.total)} / {formatNumber(stats.users.limit)}
                </span>
              </div>
              <Progress value={usersPercentage} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{stats.users.active} active</span>
                <span>{Math.round(usersPercentage)}% used</span>
              </div>
            </div>
          </div>

          {/* Shards */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Shards</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total shards</span>
                <span className="font-medium">
                  {formatNumber(stats.shards.total)} / {formatNumber(stats.shards.limit)}
                </span>
              </div>
              <Progress value={shardsPercentage} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatNumber(stats.shards.createdThisPeriod)} this period</span>
                <span>{Math.round(shardsPercentage)}% used</span>
              </div>
            </div>
          </div>

          {/* API Calls */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">API Calls</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">This period</span>
                <span className="font-medium">
                  {formatNumber(stats.apiCalls.total)} / {formatNumber(stats.apiCalls.limit)}
                </span>
              </div>
              <Progress value={apiCallsPercentage} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Resets in {stats.apiCalls.resetInDays} days</span>
                <span>{Math.round(apiCallsPercentage)}% used</span>
              </div>
            </div>
          </div>

          {/* Storage */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Storage</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Data stored</span>
                <span className="font-medium">
                  {formatBytes(stats.storage.used)} / {formatBytes(stats.storage.limit)}
                </span>
              </div>
              <Progress value={storagePercentage} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatBytes(stats.storage.available)} available</span>
                <span>{Math.round(storagePercentage)}% used</span>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="mt-6 pt-6 border-t">
          <h3 className="font-semibold mb-4">Period Statistics</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{formatNumber(stats.apiCalls.total)}</p>
              <p className="text-sm text-muted-foreground">API Calls</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{formatNumber(stats.shards.createdThisPeriod)}</p>
              <p className="text-sm text-muted-foreground">Shards Created</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{stats.users.active}</p>
              <p className="text-sm text-muted-foreground">Active Users</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
