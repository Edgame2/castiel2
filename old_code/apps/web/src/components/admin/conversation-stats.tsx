"use client"

import { MessageSquare, Users, DollarSign, Zap } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useConversationSystemStats } from "@/hooks/use-admin"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format } from "date-fns"

export function ConversationStats() {
  const { data: stats, isLoading } = useConversationSystemStats()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!stats) return null

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount)
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalConversations)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(stats.activeConversations)} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalMessages)}</div>
            <p className="text-xs text-muted-foreground">
              Avg {stats.averageMessagesPerConversation.toFixed(1)} per conversation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalUsers)}</div>
            <p className="text-xs text-muted-foreground">
              Across {formatNumber(stats.totalTenants)} tenants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalCost)}</div>
            <p className="text-xs text-muted-foreground">
              Avg {formatCurrency(stats.averageCostPerConversation)} per conversation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By Status</CardTitle>
            <CardDescription>Conversation status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats.conversationsByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={status === 'active' ? 'default' : 'secondary'}>
                      {status}
                    </Badge>
                  </div>
                  <span className="text-sm font-medium">{formatNumber(count)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">By Visibility</CardTitle>
            <CardDescription>Conversation visibility breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats.conversationsByVisibility).map(([visibility, count]) => (
                <div key={visibility} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{visibility}</Badge>
                  </div>
                  <span className="text-sm font-medium">{formatNumber(count)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Tenants */}
      {stats.topTenants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Tenants by Conversations</CardTitle>
            <CardDescription>Tenants with the most conversations</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant ID</TableHead>
                  <TableHead className="text-right">Conversations</TableHead>
                  <TableHead className="text-right">Messages</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.topTenants.map((tenant) => (
                  <TableRow key={tenant.tenantId}>
                    <TableCell className="font-mono text-xs">{tenant.tenantId}</TableCell>
                    <TableCell className="text-right">{formatNumber(tenant.conversationCount)}</TableCell>
                    <TableCell className="text-right">{formatNumber(tenant.messageCount)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(tenant.totalCost)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Growth Trend */}
      {stats.growthTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Growth Trend (Last 30 Days)</CardTitle>
            <CardDescription>Daily conversation and message counts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.growthTrend.slice(-7).map((day) => (
                <div key={day.date} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {format(new Date(day.date), 'MMM d')}
                  </span>
                  <div className="flex items-center gap-4">
                    <span>
                      <MessageSquare className="inline h-3 w-3 mr-1" />
                      {formatNumber(day.conversations)}
                    </span>
                    <span>
                      <Zap className="inline h-3 w-3 mr-1" />
                      {formatNumber(day.messages)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

