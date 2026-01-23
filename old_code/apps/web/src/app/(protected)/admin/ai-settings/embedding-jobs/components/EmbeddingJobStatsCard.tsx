"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react"
import type { EmbeddingJobStats } from "@/lib/api/embedding-jobs"

interface EmbeddingJobStatsCardProps {
  stats: EmbeddingJobStats
  isLoading: boolean
}

export function EmbeddingJobStatsCard({ stats, isLoading }: EmbeddingJobStatsCardProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const total = stats.pending + stats.processing + stats.completed + stats.failed

  const statCards = [
    {
      label: "Pending",
      value: stats.pending,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
    {
      label: "Processing",
      value: stats.processing,
      icon: Loader2,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Completed",
      value: stats.completed,
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      label: "Failed",
      value: stats.failed,
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
  ]

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>Total embedding jobs: {total}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {statCards.map((stat) => {
              const Icon = stat.icon
              const percentage = total > 0 ? ((stat.value / total) * 100).toFixed(1) : 0
              return (
                <Card key={stat.label} className={`${stat.bgColor} border-0`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                        <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                        <p className="text-xs text-muted-foreground mt-1">{percentage}%</p>
                      </div>
                      <Icon className={`h-8 w-8 ${stat.color}`} />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Success Rate */}
      <Card>
        <CardHeader>
          <CardTitle>Success Rate</CardTitle>
          <CardDescription>
            Percentage of completed jobs out of total processed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall</span>
              <span className="text-2xl font-bold">
                {total > 0
                  ? (((stats.completed / (stats.completed + stats.failed)) * 100) || 0).toFixed(1)
                  : 0}
                %
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{
                  width: `${
                    total > 0
                      ? ((stats.completed / (stats.completed + stats.failed)) * 100) || 0
                      : 0
                  }%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{stats.completed} completed</span>
              <span>{stats.failed} failed</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}






