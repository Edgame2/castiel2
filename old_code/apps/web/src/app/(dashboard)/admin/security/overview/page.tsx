'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Shield,
  Users,
  ShieldCheck,
  ShieldAlert,
  Key,
  Lock,
  Unlock,
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  RefreshCw,
  Loader2,
  LogIn,
  UserCheck,
  UserX,
  Link2,
  Fingerprint,
  Mail,
  Clock,
} from 'lucide-react'
import { useAuthDashboard, useSecurityAlerts, useDismissAlert } from '@/hooks/use-auth-stats'
import { format, subDays, formatDistanceToNow } from 'date-fns'
import type { SecurityAlert } from '@/types/auth-stats'

// Mock data for demo - in production this would come from API
const mockDashboardData = {
  overview: {
    totalUsers: 15782,
    activeUsers: 12456,
    pendingUsers: 892,
    suspendedUsers: 234,
    usersWithMFA: 8934,
    mfaAdoptionRate: 56.6,
    totalLogins: 45234,
    failedLogins: 1234,
    uniqueLoginUsers: 8765,
    oauthUsers: 4532,
    ssoUsers: 2345,
    magicLinkUsers: 876,
  },
  loginTrends: Array.from({ length: 7 }, (_, i) => ({
    date: subDays(new Date(), 6 - i).toISOString(),
    successful: Math.floor(Math.random() * 2000) + 3000,
    failed: Math.floor(Math.random() * 200) + 100,
    total: Math.floor(Math.random() * 2200) + 3100,
  })),
  methodBreakdown: {
    password: 8234,
    oauth: 4532,
    sso: 2345,
    magicLink: 876,
    mfa: 8934,
  },
  oauthProviders: {
    google: 2845,
    github: 1234,
    microsoft: 453,
  },
  recentAlerts: [
    {
      id: '1',
      type: 'warning' as const,
      title: 'High failed login rate',
      description: 'Unusual spike in failed login attempts detected from IP range 192.168.x.x',
      timestamp: subDays(new Date(), 0.1).toISOString(),
    },
    {
      id: '2',
      type: 'error' as const,
      title: 'Potential brute force attack',
      description: 'Multiple failed login attempts for user admin@example.com',
      timestamp: subDays(new Date(), 0.5).toISOString(),
    },
    {
      id: '3',
      type: 'info' as const,
      title: 'MFA adoption below target',
      description: 'Current MFA adoption rate (56.6%) is below the recommended 75%',
      timestamp: subDays(new Date(), 1).toISOString(),
    },
  ],
}

export default function AuthOverviewDashboard() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { t } = useTranslation('common') as any
  const [dateRange, setDateRange] = useState('7d')
  const dismissAlert = useDismissAlert()

  // In production, use actual API:
  // const { data, isLoading, error, refetch } = useAuthDashboard()
  const data = mockDashboardData
  const isLoading = false

  const stats = data?.overview || {
    totalUsers: 0,
    activeUsers: 0,
    pendingUsers: 0,
    suspendedUsers: 0,
    usersWithMFA: 0,
    mfaAdoptionRate: 0,
    totalLogins: 0,
    failedLogins: 0,
    uniqueLoginUsers: 0,
    oauthUsers: 0,
    ssoUsers: 0,
    magicLinkUsers: 0,
  }

  const alertIconMap = {
    warning: AlertTriangle,
    error: XCircle,
    info: Info,
  }

  const alertColorMap = {
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
              <Shield className="h-6 w-6 text-white" />
            </div>
            Authentication Overview
          </h1>
          <p className="text-muted-foreground mt-1">
            System-wide authentication and security metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Security Alerts */}
      {data?.recentAlerts && data.recentAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Security Alerts
          </h3>
          {data.recentAlerts.map((alert: SecurityAlert) => {
            const Icon = alertIconMap[alert.type]
            return (
              <div
                key={alert.id}
                className={`flex items-start justify-between p-4 rounded-lg border ${alertColorMap[alert.type]}`}
              >
                <div className="flex gap-3">
                  <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">{alert.title}</p>
                    <p className="text-sm opacity-80">{alert.description}</p>
                    <p className="text-xs opacity-60 mt-1">
                      {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dismissAlert.mutate(alert.id)}
                  disabled={dismissAlert.isPending}
                >
                  Dismiss
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 bg-blue-500/10 rounded-full blur-2xl" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalUsers.toLocaleString()}</div>
            <div className="flex items-center gap-2 mt-2 text-sm">
              <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
                <UserCheck className="mr-1 h-3 w-3" />
                {stats.activeUsers.toLocaleString()} active
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* MFA Adoption */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 bg-green-500/10 rounded-full blur-2xl" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-green-500" />
              MFA Adoption
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.mfaAdoptionRate.toFixed(1)}%</div>
            <Progress value={stats.mfaAdoptionRate} className="mt-2 h-2" />
            <p className="text-sm text-muted-foreground mt-2">
              {stats.usersWithMFA.toLocaleString()} users protected
            </p>
          </CardContent>
        </Card>

        {/* Login Success Rate */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 bg-purple-500/10 rounded-full blur-2xl" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <LogIn className="h-4 w-4 text-purple-500" />
              Login Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalLogins.toLocaleString()}</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
                <CheckCircle className="mr-1 h-3 w-3" />
                {((1 - stats.failedLogins / stats.totalLogins) * 100).toFixed(1)}% success
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Failed Logins */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 bg-red-500/10 rounded-full blur-2xl" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-500" />
              Failed Attempts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">
              {stats.failedLogins.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Potential security concerns
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Status Distribution
            </CardTitle>
            <CardDescription>
              Current state of all user accounts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>Active Users</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{stats.activeUsers.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground">
                  ({((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
            <Progress 
              value={(stats.activeUsers / stats.totalUsers) * 100} 
              className="h-2 bg-muted [&>div]:bg-green-500" 
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span>Pending Users</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{stats.pendingUsers.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground">
                  ({((stats.pendingUsers / stats.totalUsers) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
            <Progress 
              value={(stats.pendingUsers / stats.totalUsers) * 100} 
              className="h-2 bg-muted [&>div]:bg-amber-500" 
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>Suspended Users</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{stats.suspendedUsers.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground">
                  ({((stats.suspendedUsers / stats.totalUsers) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
            <Progress 
              value={(stats.suspendedUsers / stats.totalUsers) * 100} 
              className="h-2 bg-muted [&>div]:bg-red-500" 
            />
          </CardContent>
        </Card>

        {/* Authentication Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Authentication Methods
            </CardTitle>
            <CardDescription>
              How users are authenticating
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Lock className="h-4 w-4" />
                  Password
                </div>
                <div className="text-2xl font-bold">
                  {data.methodBreakdown.password.toLocaleString()}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Link2 className="h-4 w-4" />
                  OAuth
                </div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.oauthUsers.toLocaleString()}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/30 dark:to-violet-900/30">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Fingerprint className="h-4 w-4" />
                  SSO
                </div>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {stats.ssoUsers.toLocaleString()}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/30 dark:to-cyan-900/30">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Mail className="h-4 w-4" />
                  Magic Link
                </div>
                <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                  {stats.magicLinkUsers.toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* OAuth Provider Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              OAuth Providers
            </CardTitle>
            <CardDescription>
              Breakdown by social login provider
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm">
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                </div>
                <span className="font-medium">Google</span>
              </div>
              <span className="text-xl font-bold">{data.oauthProviders.google.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                </div>
                <span className="font-medium">GitHub</span>
              </div>
              <span className="text-xl font-bold">{data.oauthProviders.github.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm">
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#00A4EF" d="M11.4 24H0V12.6h11.4V24z" />
                    <path fill="#FFB900" d="M24 24H12.6V12.6H24V24z" />
                    <path fill="#F25022" d="M11.4 11.4H0V0h11.4v11.4z" />
                    <path fill="#7FBA00" d="M24 11.4H12.6V0H24v11.4z" />
                  </svg>
                </div>
                <span className="font-medium">Microsoft</span>
              </div>
              <span className="text-xl font-bold">{data.oauthProviders.microsoft.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Login Trend Mini Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Login Trends (7 days)
            </CardTitle>
            <CardDescription>
              Daily login activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.loginTrends.slice(-7).map((day, index) => {
                const maxLogins = Math.max(...data.loginTrends.map((d) => d.total))
                const percentage = (day.successful / maxLogins) * 100
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {format(new Date(day.date), 'EEE, MMM d')}
                      </span>
                      <span className="font-medium">{day.successful.toLocaleString()}</span>
                    </div>
                    <div className="flex gap-1">
                      <div 
                        className="h-2 rounded-full bg-green-500 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                      <div 
                        className="h-2 rounded-full bg-red-400 transition-all"
                        style={{ width: `${(day.failed / maxLogins) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center gap-4 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-muted-foreground">Successful</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <span className="text-muted-foreground">Failed</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

