'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Shield,
  ShieldCheck,
  ShieldX,
  Download,
  Search,
  Calendar,
  RefreshCw,
  Smartphone,
  Mail,
  Key,
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  Clock,
} from 'lucide-react'
import { useMFAAuditLogs, useMFAAuditStats, useExportMFAAuditLogs } from '@/hooks/use-mfa-audit'
import type { MFAAuditQueryParams, MFAAuditEventType, MFAMethodType, MFAAuditLog } from '@/types/mfa-audit'
import { format, subDays, formatDistanceToNow } from 'date-fns'
import { trackTrace } from '@/lib/monitoring/app-insights'

// Event type display mapping
const eventTypeConfig: Record<MFAAuditEventType, { label: string; color: string; icon: typeof Shield }> = {
  mfa_enrolled: { label: 'Enrolled', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: ShieldCheck },
  mfa_verified: { label: 'Verified', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: ShieldCheck },
  mfa_failed: { label: 'Failed', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: ShieldX },
  mfa_disabled: { label: 'Disabled', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400', icon: Shield },
  recovery_code_used: { label: 'Recovery Used', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Key },
  recovery_codes_regenerated: { label: 'Codes Regenerated', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400', icon: Key },
  trusted_device_added: { label: 'Device Trusted', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400', icon: Smartphone },
  trusted_device_removed: { label: 'Device Removed', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', icon: Smartphone },
}

// Method display mapping
const methodConfig: Record<MFAMethodType, { label: string; icon: typeof Smartphone }> = {
  totp: { label: 'Authenticator', icon: Smartphone },
  sms: { label: 'SMS', icon: Smartphone },
  email: { label: 'Email', icon: Mail },
  recovery: { label: 'Recovery', icon: Key },
}

export default function MFAAuditDashboardPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { t } = useTranslation('common') as any
  const exportLogs = useExportMFAAuditLogs()

  // Filter state
  const [filters, setFilters] = useState<MFAAuditQueryParams>({
    limit: 50,
    offset: 0,
  })
  const [searchEmail, setSearchEmail] = useState('')
  const [dateRange, setDateRange] = useState('7d')

  // Calculate date range
  const getDateRange = () => {
    const now = new Date()
    switch (dateRange) {
      case '24h':
        return { startDate: subDays(now, 1).toISOString(), endDate: now.toISOString() }
      case '7d':
        return { startDate: subDays(now, 7).toISOString(), endDate: now.toISOString() }
      case '30d':
        return { startDate: subDays(now, 30).toISOString(), endDate: now.toISOString() }
      case '90d':
        return { startDate: subDays(now, 90).toISOString(), endDate: now.toISOString() }
      default:
        return {}
    }
  }

  const dateRangeParams = getDateRange()

  // Fetch data
  const { data: logsData, isLoading: logsLoading, refetch: refetchLogs } = useMFAAuditLogs({
    ...filters,
    ...dateRangeParams,
  })
  const { data: statsData, isLoading: statsLoading } = useMFAAuditStats(
    dateRangeParams.startDate,
    dateRangeParams.endDate
  )

  const handleSearch = () => {
    if (searchEmail) {
      // In a real implementation, this would search by email
      // Log search in development only
      if (process.env.NODE_ENV === 'development') {
        trackTrace('Searching for MFA audit logs', 0, { searchEmail })
      }
    }
    refetchLogs()
  }

  const handleExport = async () => {
    await exportLogs({
      ...filters,
      ...dateRangeParams,
    })
  }

  const handleFilterChange = (key: keyof MFAAuditQueryParams, value: string | undefined) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === 'all' ? undefined : value,
      offset: 0,
    }))
  }

  const renderEventBadge = (eventType: MFAAuditEventType) => {
    const config = eventTypeConfig[eventType]
    const Icon = config.icon
    return (
      <Badge variant="outline" className={`${config.color} border-0 gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const renderMethodBadge = (method?: MFAMethodType) => {
    if (!method) return null
    const config = methodConfig[method]
    const Icon = config.icon
    return (
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Icon className="h-3 w-3" />
        {config.label}
      </div>
    )
  }

  const stats = statsData || {
    totalEnrollments: 0,
    totalVerifications: 0,
    failedAttempts: 0,
    recoveryCodesUsed: 0,
    byMethod: { totp: 0, sms: 0, email: 0 },
    byDay: [],
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            MFA Audit Dashboard
          </h1>
          <p className="text-muted-foreground">
            Monitor and analyze multi-factor authentication activity
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetchLogs()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Total Enrollments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-800 dark:text-green-300">
              {statsLoading ? '...' : stats.totalEnrollments.toLocaleString()}
            </div>
            <p className="text-xs text-green-600 dark:text-green-500">
              Users with MFA enabled
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Verifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-800 dark:text-blue-300">
              {statsLoading ? '...' : stats.totalVerifications.toLocaleString()}
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-500">
              Successful authentications
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20 border-red-200 dark:border-red-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-2">
              <ShieldX className="h-4 w-4" />
              Failed Attempts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-800 dark:text-red-300">
              {statsLoading ? '...' : stats.failedAttempts.toLocaleString()}
            </div>
            <p className="text-xs text-red-600 dark:text-red-500">
              Requires attention if high
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-200 dark:border-amber-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <Key className="h-4 w-4" />
              Recovery Codes Used
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-800 dark:text-amber-300">
              {statsLoading ? '...' : stats.recoveryCodesUsed.toLocaleString()}
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-500">
              Users may need to regenerate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Method Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            MFA Methods Distribution
          </CardTitle>
          <CardDescription>
            Breakdown of MFA methods used by users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-violet-50 dark:bg-violet-950/20">
              <div className="p-2 rounded-full bg-violet-100 dark:bg-violet-900/30">
                <Smartphone className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-violet-800 dark:text-violet-300">
                  {stats.byMethod.totp.toLocaleString()}
                </div>
                <div className="text-sm text-violet-600 dark:text-violet-500">Authenticator App</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-teal-50 dark:bg-teal-950/20">
              <div className="p-2 rounded-full bg-teal-100 dark:bg-teal-900/30">
                <Smartphone className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-teal-800 dark:text-teal-300">
                  {stats.byMethod.sms.toLocaleString()}
                </div>
                <div className="text-sm text-teal-600 dark:text-teal-500">SMS</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-pink-50 dark:bg-pink-950/20">
              <div className="p-2 rounded-full bg-pink-100 dark:bg-pink-900/30">
                <Mail className="h-5 w-5 text-pink-600 dark:text-pink-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-pink-800 dark:text-pink-300">
                  {stats.byMethod.email.toLocaleString()}
                </div>
                <div className="text-sm text-pink-600 dark:text-pink-500">Email OTP</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Audit Logs
          </CardTitle>
          <CardDescription>
            Filter and search through MFA activity logs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search by email..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full"
              />
            </div>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[150px]">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.eventType || 'all'}
              onValueChange={(v) => handleFilterChange('eventType', v as MFAAuditEventType)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Event type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="mfa_enrolled">Enrolled</SelectItem>
                <SelectItem value="mfa_verified">Verified</SelectItem>
                <SelectItem value="mfa_failed">Failed</SelectItem>
                <SelectItem value="mfa_disabled">Disabled</SelectItem>
                <SelectItem value="recovery_code_used">Recovery Used</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.method || 'all'}
              onValueChange={(v) => handleFilterChange('method', v as MFAMethodType)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="totp">Authenticator</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="recovery">Recovery</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch}>
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </div>

          <Separator className="my-4" />

          {/* Logs Table */}
          {logsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : logsData?.logs?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Shield className="h-12 w-12 mb-4 opacity-50" />
              <p>No audit logs found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsData?.logs?.map((log: MFAAuditLog) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span title={log.createdAt}>
                            {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{log.userEmail}</div>
                      </TableCell>
                      <TableCell>{renderEventBadge(log.eventType)}</TableCell>
                      <TableCell>{renderMethodBadge(log.method)}</TableCell>
                      <TableCell>
                        {log.success ? (
                          <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0">
                            Success
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-0">
                            Failed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">
                        {log.ipAddress || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {logsData && logsData.total > logsData.limit && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {logsData.offset + 1} to {Math.min(logsData.offset + logsData.limit, logsData.total)} of{' '}
                {logsData.total} entries
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={logsData.offset === 0}
                  onClick={() => setFilters((prev) => ({ ...prev, offset: Math.max(0, prev.offset! - prev.limit!) }))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={logsData.offset + logsData.limit >= logsData.total}
                  onClick={() => setFilters((prev) => ({ ...prev, offset: prev.offset! + prev.limit! }))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

