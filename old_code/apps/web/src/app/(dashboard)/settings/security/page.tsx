'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Shield,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  Lock,
  Key,
  Users,
  Activity,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Clock,
  Smartphone,
  Mail,
  Link2,
  UserCheck,
  UserX,
  Loader2,
  ChevronRight,
  Eye,
  RotateCcw,
  LogOut,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import Link from 'next/link'

// Mock data - in production this would come from API
const mockSecurityData = {
  // Security score and overview
  securityScore: 78,
  mfaAdoption: 65,
  usersWithMFA: 156,
  totalUsers: 240,
  activeSessionsCount: 189,
  recentFailedLogins: 12,
  
  // Security settings
  settings: {
    requireMFA: false,
    allowPasswordAuth: true,
    allowOAuth: true,
    allowMagicLink: true,
    ssoEnabled: false,
    sessionTimeout: 8,
    maxLoginAttempts: 5,
    passwordMinLength: 8,
    passwordRequireSpecial: true,
    passwordRequireNumbers: true,
  },

  // Recent security events
  recentEvents: [
    { id: '1', type: 'login_failed', userId: 'user-1', email: 'john@example.com', ip: '192.168.1.100', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
    { id: '2', type: 'mfa_enabled', userId: 'user-2', email: 'jane@example.com', ip: '192.168.1.101', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
    { id: '3', type: 'password_reset', userId: 'user-3', email: 'bob@example.com', ip: '192.168.1.102', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
    { id: '4', type: 'session_revoked', userId: 'user-4', email: 'alice@example.com', ip: '192.168.1.103', timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
    { id: '5', type: 'login_success', userId: 'user-5', email: 'charlie@example.com', ip: '192.168.1.104', timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
  ],

  // Users without MFA
  usersWithoutMFA: [
    { id: 'user-1', email: 'john@example.com', name: 'John Doe', lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
    { id: 'user-3', email: 'bob@example.com', name: 'Bob Smith', lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
    { id: 'user-6', email: 'david@example.com', name: 'David Brown', lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString() },
  ],
}

const eventTypeConfig = {
  login_failed: { label: 'Failed Login', icon: XCircle, color: 'text-red-500' },
  login_success: { label: 'Successful Login', icon: CheckCircle, color: 'text-green-500' },
  mfa_enabled: { label: 'MFA Enabled', icon: ShieldCheck, color: 'text-blue-500' },
  mfa_disabled: { label: 'MFA Disabled', icon: ShieldX, color: 'text-orange-500' },
  password_reset: { label: 'Password Reset', icon: Key, color: 'text-purple-500' },
  session_revoked: { label: 'Session Revoked', icon: LogOut, color: 'text-amber-500' },
}

export default function TenantSecurityDashboard() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { t } = (useTranslation as any)('settings')
  const [settings, setSettings] = useState(mockSecurityData.settings)
  const [showMFAReminder, setShowMFAReminder] = useState(false)

  const data = mockSecurityData

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500'
    if (score >= 60) return 'text-amber-500'
    return 'text-red-500'
  }

  const getScoreGradient = (score: number) => {
    if (score >= 80) return 'from-green-500 to-emerald-500'
    if (score >= 60) return 'from-amber-500 to-yellow-500'
    return 'from-red-500 to-rose-500'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            Security Dashboard
          </h1>
          <p className="text-muted-foreground">
            Monitor and manage your organization's security settings
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Security Score & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Security Score Card */}
        <Card className="lg:col-span-1 relative overflow-hidden">
          <div className={`absolute inset-0 bg-gradient-to-br ${getScoreGradient(data.securityScore)} opacity-10`} />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Security Score
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className={`text-5xl font-bold ${getScoreColor(data.securityScore)}`}>
              {data.securityScore}
            </div>
            <p className="text-sm text-muted-foreground mt-2">out of 100</p>
            <Progress value={data.securityScore} className="mt-4 h-2" />
            {data.securityScore < 80 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-3 text-center">
                Enable MFA requirement to improve your score
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-green-500" />
              MFA Protection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.mfaAdoption}%</div>
            <p className="text-sm text-muted-foreground">
              {data.usersWithMFA} of {data.totalUsers} users
            </p>
            <Progress value={data.mfaAdoption} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              Active Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.activeSessionsCount}</div>
            <p className="text-sm text-muted-foreground">
              Currently logged in users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-500" />
              Failed Logins (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">
              {data.recentFailedLogins}
            </div>
            <p className="text-sm text-muted-foreground">
              Requires attention if high
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Security Settings
          </CardTitle>
          <CardDescription>
            Configure authentication and security policies for your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Authentication Methods */}
            <div className="space-y-4">
              <h4 className="font-medium">Authentication Methods</h4>
              
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label htmlFor="require-mfa" className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-green-500" />
                    Require MFA for all users
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Users must set up MFA to access the system
                  </p>
                </div>
                <Switch
                  id="require-mfa"
                  checked={settings.requireMFA}
                  onCheckedChange={(checked) => setSettings({ ...settings, requireMFA: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label htmlFor="password-auth" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Password Authentication
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Allow users to sign in with email and password
                  </p>
                </div>
                <Switch
                  id="password-auth"
                  checked={settings.allowPasswordAuth}
                  onCheckedChange={(checked) => setSettings({ ...settings, allowPasswordAuth: checked })}
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label htmlFor="oauth" className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-blue-500" />
                    Social Login (OAuth)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Allow Google, GitHub, Microsoft sign-in
                  </p>
                </div>
                <Switch
                  id="oauth"
                  checked={settings.allowOAuth}
                  onCheckedChange={(checked) => setSettings({ ...settings, allowOAuth: checked })}
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label htmlFor="magic-link" className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-purple-500" />
                    Magic Link
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Allow passwordless email sign-in
                  </p>
                </div>
                <Switch
                  id="magic-link"
                  checked={settings.allowMagicLink}
                  onCheckedChange={(checked) => setSettings({ ...settings, allowMagicLink: checked })}
                />
              </div>
            </div>

            {/* Security Policies */}
            <div className="space-y-4">
              <h4 className="font-medium">Security Policies</h4>

              <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Session Timeout</span>
                  <Badge variant="outline">{settings.sessionTimeout} hours</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Max Login Attempts</span>
                  <Badge variant="outline">{settings.maxLoginAttempts} attempts</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Min Password Length</span>
                  <Badge variant="outline">{settings.passwordMinLength} characters</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Require Special Characters</span>
                  <Badge variant={settings.passwordRequireSpecial ? 'default' : 'secondary'}>
                    {settings.passwordRequireSpecial ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Require Numbers</span>
                  <Badge variant={settings.passwordRequireNumbers ? 'default' : 'secondary'}>
                    {settings.passwordRequireNumbers ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>

              <Button variant="outline" className="w-full" asChild>
                <Link href="/settings/security/policies">
                  <Settings className="mr-2 h-4 w-4" />
                  Advanced Policy Settings
                  <ChevronRight className="ml-auto h-4 w-4" />
                </Link>
              </Button>

              {/* SSO Configuration Link */}
              <div className="p-4 rounded-lg border bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <Key className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-purple-900 dark:text-purple-100">
                      Enterprise SSO
                    </h4>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      {settings.ssoEnabled 
                        ? 'SSO is configured for your organization'
                        : 'Configure SAML or Azure AD for enterprise sign-in'}
                    </p>
                    <Button variant="link" className="px-0 text-purple-600" asChild>
                      <Link href="/admin/settings/sso">
                        {settings.ssoEnabled ? 'Manage SSO' : 'Configure SSO'}
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Security Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Security Events
            </CardTitle>
            <CardDescription>
              Latest authentication and security activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentEvents.map((event) => {
                const config = eventTypeConfig[event.type as keyof typeof eventTypeConfig]
                const Icon = config?.icon || Activity
                return (
                  <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <Icon className={`h-5 w-5 mt-0.5 ${config?.color || 'text-gray-500'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm truncate">{event.email}</span>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {config?.label || event.type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                        <span className="font-mono">{event.ip}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <Button variant="ghost" className="w-full mt-4" asChild>
              <Link href="/admin/security/mfa-audit">
                View All Events
                <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Users Without MFA */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShieldX className="h-5 w-5 text-amber-500" />
                  Users Without MFA
                </CardTitle>
                <CardDescription>
                  These users are at higher security risk
                </CardDescription>
              </div>
              <Dialog open={showMFAReminder} onOpenChange={setShowMFAReminder}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Mail className="mr-2 h-4 w-4" />
                    Send Reminders
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Send MFA Reminder</DialogTitle>
                    <DialogDescription>
                      Send an email reminder to all users without MFA enabled to encourage them to set it up.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <p className="text-sm text-muted-foreground">
                      This will send an email to <strong>{data.usersWithoutMFA.length} users</strong> who haven't enabled multi-factor authentication.
                    </p>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowMFAReminder(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => setShowMFAReminder(false)}>
                      Send Reminders
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.usersWithoutMFA.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/users/${user.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {data.usersWithoutMFA.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <ShieldCheck className="h-12 w-12 mb-4 text-green-500" />
                <p className="font-medium">All users have MFA enabled!</p>
                <p className="text-sm">Great job keeping your organization secure.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button>
          Save Security Settings
        </Button>
      </div>
    </div>
  )
}

