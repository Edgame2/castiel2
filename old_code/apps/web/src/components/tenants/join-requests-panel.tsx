"use client"

import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { useJoinRequestActions, useJoinRequests } from '@/hooks/use-join-requests'
import type { TenantJoinRequestStatus } from '@/types/api'
import { AlertCircle, CheckCircle2, Clock, Loader2, Users } from 'lucide-react'

const STATUS_OPTIONS: { label: string; value: TenantJoinRequestStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Declined', value: 'declined' },
  { label: 'Expired', value: 'expired' },
]

interface TenantJoinRequestsPanelProps {
  tenantId: string
}

export function TenantJoinRequestsPanel({ tenantId }: TenantJoinRequestsPanelProps) {
  const [statusFilter, setStatusFilter] = useState<TenantJoinRequestStatus | 'all'>('pending')
  const { data, isLoading, isRefetching } = useJoinRequests(
    tenantId,
    statusFilter === 'all' ? undefined : statusFilter
  )
  const { approve, decline, isPending } = useJoinRequestActions(tenantId)

  const hasResults = (data?.items.length || 0) > 0

  const summary = useMemo(() => {
    const pending = data?.items.filter((item) => item.status === 'pending').length ?? 0
    const approved = data?.items.filter((item) => item.status === 'approved').length ?? 0
    const declined = data?.items.filter((item) => item.status === 'declined').length ?? 0
    return { pending, approved, declined }
  }, [data?.items])

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 space-y-0 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Join requests
          </CardTitle>
          <CardDescription>Review and action membership requests scoped to this tenant.</CardDescription>
        </div>
        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Updated {isRefetching ? 'just now' : 'recently'}
          </div>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
            <SelectTrigger className="md:w-[180px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : hasResults ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <SummaryTile
                title="Pending approval"
                value={summary.pending}
                icon={<AlertCircle className="h-4 w-4 text-amber-500" />}
                tone="pending"
              />
              <SummaryTile
                title="Approved this week"
                value={summary.approved}
                icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                tone="approved"
              />
              <SummaryTile
                title="Declined / expired"
                value={summary.declined}
                icon={<Users className="h-4 w-4 text-muted-foreground" />}
                tone="muted"
              />
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requester</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.items.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{request.requesterEmail}</p>
                          <p className="text-xs text-muted-foreground">ID: {request.requesterUserId}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {request.message || 'No additional context provided.'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={request.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {request.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isPending}
                              onClick={() => decline(request.id)}
                            >
                              Decline
                            </Button>
                            <Button
                              size="sm"
                              disabled={isPending}
                              onClick={() => approve(request.id)}
                            >
                              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              Approve
                            </Button>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">No actions</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
            <p>No join requests match this filter.</p>
            <p>Users with matching domains can request access from their dashboard.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: TenantJoinRequestStatus }) {
  switch (status) {
    case 'pending':
      return <Badge variant="secondary">Pending</Badge>
    case 'approved':
      return <Badge className="bg-emerald-100 text-emerald-700">Approved</Badge>
    case 'declined':
      return <Badge className="bg-rose-100 text-rose-700">Declined</Badge>
    case 'expired':
      return <Badge className="bg-amber-100 text-amber-800">Expired</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}

interface SummaryTileProps {
  title: string
  value: number
  icon: ReactNode
  tone: 'pending' | 'approved' | 'muted'
}

function SummaryTile({ title, value, icon, tone }: SummaryTileProps) {
  const bg =
    tone === 'pending'
      ? 'bg-amber-50'
      : tone === 'approved'
        ? 'bg-emerald-50'
        : 'bg-muted/50'

  return (
    <div className={`rounded-lg border p-4 ${bg}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-semibold">{value}</p>
        </div>
        {icon}
      </div>
    </div>
  )
}
