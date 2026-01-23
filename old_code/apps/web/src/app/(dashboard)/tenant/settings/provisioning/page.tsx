"use client"

import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useSCIMActivityLogs } from '@/hooks/use-scim-provisioning'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2, RefreshCw, Users, FileText, CheckCircle2, XCircle } from 'lucide-react'
import { format } from 'date-fns'

export default function SCIMActivityLogsPage() {
  const { user } = useAuth()
  const tenantId = user?.tenantId || ''
  const [limit] = useState(100)
  const { data, isLoading, isError, refetch } = useSCIMActivityLogs(tenantId, limit)

  const logs = data?.logs || []
  const total = data?.total || 0

  const getOperationBadge = (operation: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      create: 'default',
      update: 'secondary',
      delete: 'destructive',
      get: 'outline',
      list: 'outline',
      patch: 'secondary',
    }
    return variants[operation] || 'outline'
  }

  const getResourceTypeIcon = (resourceType: string) => {
    return resourceType === 'User' ? (
      <Users className="h-4 w-4" />
    ) : (
      <FileText className="h-4 w-4" />
    )
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading activity logs...
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <Card>
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertDescription>Failed to load SCIM activity logs.</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold">SCIM Activity Logs</h1>
            <p className="text-muted-foreground mt-1">
              Monitor SCIM provisioning operations and activity
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Showing {logs.length} of {total} total operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <Alert>
              <AlertDescription>
                No SCIM activity logs found. Activity will appear here once SCIM provisioning is enabled and used.
              </AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Operation</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Resource ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">
                      {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getOperationBadge(log.operation)}>
                        {log.operation.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getResourceTypeIcon(log.resourceType)}
                        <span>{log.resourceType}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {log.resourceId || '-'}
                    </TableCell>
                    <TableCell>
                      {log.success ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Success</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-red-600">
                          <XCircle className="h-4 w-4" />
                          <span>Failed</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                      {log.error || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}









