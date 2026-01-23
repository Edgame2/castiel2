'use client';
// @ts-nocheck
// TODO: Fix type mismatches between MFAAuditStats and page usage

/**
 * MFA Audit Page
 * Admin interface for viewing MFA audit logs
 */

import { useState } from 'react';
import { useMFAAuditLogs, useMFAAuditStats } from '@/hooks/use-mfa-audit';
import { mfaAuditApi } from '@/lib/api/mfa-audit';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Filter, RefreshCw, Shield } from 'lucide-react';
import { format } from 'date-fns';
import type { MFAAuditQueryParams } from '@/types/mfa-audit';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

export default function MFAAuditPage() {
  const [query, setQuery] = useState<MFAAuditQueryParams>({
    limit: 50,
    offset: 0,
  });

  const { data: auditData, isLoading, refetch } = useMFAAuditLogs(query);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: stats } = useMFAAuditStats() as { data: any };

  const handleExport = async () => {
    try {
      const blob = await mfaAuditApi.exportLogs(query);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a' as any);
      a.href = url;
      a.download = `mfa-audit-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Export failed in MFA audit page', 3, {
        errorMessage: errorObj.message,
      })
    }
  };

  const getActionBadge = (action: string) => {
    if (action.includes('success')) return <Badge variant="default" className="bg-green-500">Success</Badge>;
    if (action.includes('failed')) return <Badge variant="destructive">Failed</Badge>;
    if (action.includes('disabled')) return <Badge variant="secondary">Disabled</Badge>;
    return <Badge variant="outline">{action.replace('mfa_', '').replace(/_/g, ' ')}</Badge>;
  };

  const getMethodBadge = (method?: string) => {
    if (!method) return null;
    const colors: Record<string, string> = {
      totp: 'bg-blue-500',
      sms: 'bg-green-500',
      email: 'bg-purple-500',
    };
    return <Badge className={colors[method] || 'bg-gray-500'}>{method.toUpperCase()}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            MFA Audit Logs
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor multi-factor authentication events and security activity
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEvents}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats.successRate * 100).toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Successful verifications</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Most Used Method</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {String(Object.entries((stats as any).eventsByMethod || (stats as any).byMethod || {}).sort((a: any, b: any) => b[1] - a[1])[0]?.[0]?.toUpperCase() || 'N/A')}
              </div>
              <p className="text-xs text-muted-foreground">
                {String(Object.entries((stats as any).eventsByMethod || (stats as any).byMethod || {}).sort((a: any, b: any) => b[1] - a[1])[0]?.[1] || 0)} events
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Failed Attempts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalEvents - Math.round(stats.totalEvents * stats.successRate)}
              </div>
              <p className="text-xs text-muted-foreground">Requires attention</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>Filter audit events by criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">User Email</label>
              <Input
                placeholder="user@example.com"
                value={query.userId || ''}
                onChange={(e) => setQuery({ ...query, userId: e.target.value || undefined })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Action</label>
              <Select
                value={query.eventType || 'all'}
                onValueChange={(value) => setQuery({ ...query, eventType: value === 'all' ? undefined : value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="mfa_enrollment_completed">Enrollment Completed</SelectItem>
                  <SelectItem value="mfa_enrollment_failed">Enrollment Failed</SelectItem>
                  <SelectItem value="mfa_verification_success">Verification Success</SelectItem>
                  <SelectItem value="mfa_verification_failed">Verification Failed</SelectItem>
                  <SelectItem value="mfa_method_disabled">Method Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Method</label>
              <Select
                value={query.method || 'all'}
                onValueChange={(value) => setQuery({ ...query, method: value === 'all' ? undefined : value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="totp">TOTP</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Events</CardTitle>
          <CardDescription>
            {auditData ? `Showing ${auditData.logs.length} of ${auditData.total} events` : 'Loading...'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading audit events...</div>
          ) : auditData && auditData.logs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditData.logs.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-mono text-sm">
                      {format(new Date(event.createdAt), 'MMM dd, yyyy HH:mm:ss')}
                    </TableCell>
                    <TableCell>{event.userEmail}</TableCell>
                    <TableCell>{getActionBadge(event.eventType)}</TableCell>
                    <TableCell>{getMethodBadge(event.method)}</TableCell>
                    <TableCell>
                      {event.success ? (
                        <Badge variant="default" className="bg-green-500">Success</Badge>
                      ) : (
                        <Badge variant="destructive">Failed</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{event.ipAddress || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No audit events found</div>
          )}

          {/* Pagination */}
          {auditData && auditData.total > auditData.limit && (
            <div className="flex items-center justify-between mt-4">
              <Button
                variant="outline"
                disabled={query.offset === 0}
                onClick={() => setQuery({ ...query, offset: Math.max(0, (query.offset || 0) - (query.limit || 50)) })}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {Math.floor((query.offset || 0) / (query.limit || 50)) + 1} of{' '}
                {Math.ceil(auditData.total / auditData.limit)}
              </span>
              <Button
                variant="outline"
                disabled={(query.offset || 0) + (query.limit || 50) >= auditData.total}
                onClick={() => setQuery({ ...query, offset: (query.offset || 0) + (query.limit || 50) })}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
