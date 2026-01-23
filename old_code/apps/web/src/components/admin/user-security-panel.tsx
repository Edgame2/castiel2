'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Shield,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  Key,
  Lock,
  Unlock,
  LogOut,
  RefreshCw,
  Activity,
  Clock,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Smartphone,
  Mail,
} from 'lucide-react'
import {
  useUserSecurity,
  useForcePasswordReset,
  useRevokeSessions,
  useDisableMFA,
  useLockAccount,
  useUnlockAccount,
} from '@/hooks/use-user-security'
import { formatDistanceToNow } from 'date-fns'

import { SYSTEM_PERMISSIONS } from '@castiel/shared-types'
import { usePermissionCheck } from '@/hooks/use-permission-check'

interface UserSecurityPanelProps {
  userId: string
  className?: string
}

export function UserSecurityPanel({ userId, className }: UserSecurityPanelProps) {
  const { data: security, isLoading, error } = useUserSecurity(userId)
  const canWriteUsers = usePermissionCheck(SYSTEM_PERMISSIONS.USERS.UPDATE)
  const forceReset = useForcePasswordReset()
  const revokeSessions = useRevokeSessions()
  const disableMFA = useDisableMFA()
  const lockAccount = useLockAccount()
  const unlockAccount = useUnlockAccount()

  const [lockReason, setLockReason] = useState('')
  const [showLockDialog, setShowLockDialog] = useState(false)

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error || !security) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
          <AlertTriangle className="h-5 w-5 mr-2" />
          Failed to load security information
        </CardContent>
      </Card>
    )
  }

  const isLocked = security.status === 'suspended'

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security
        </CardTitle>
        <CardDescription>
          Manage user security settings and access
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Account Status */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            {isLocked ? (
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                <Lock className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
            ) : (
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            )}
            <div>
              <div className="font-medium">Account Status</div>
              <div className="text-sm text-muted-foreground">
                {isLocked ? security.lockReason || 'Locked by administrator' : 'Active and accessible'}
              </div>
            </div>
          </div>
          <Badge variant={isLocked ? 'destructive' : 'default'}>
            {security.status}
          </Badge>
        </div>

        {/* MFA Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {security.mfaEnabled ? (
                <ShieldCheck className="h-4 w-4 text-green-500" />
              ) : (
                <ShieldX className="h-4 w-4 text-amber-500" />
              )}
              <span className="font-medium">Multi-Factor Authentication</span>
            </div>
            <Badge variant={security.mfaEnabled ? 'default' : 'secondary'}>
              {security.mfaEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>

          {security.mfaEnabled && security.mfaMethods.length > 0 && (
            <div className="flex items-center gap-2 ml-6">
              {security.mfaMethods.map((method) => (
                <Badge key={method} variant="outline" className="gap-1">
                  {method === 'totp' && <Smartphone className="h-3 w-3" />}
                  {method === 'email' && <Mail className="h-3 w-3" />}
                  {method === 'sms' && <Smartphone className="h-3 w-3" />}
                  {method}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Session Info */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <span className="font-medium">Active Sessions</span>
            </div>
            <Badge variant="outline">{security.activeSessions}</Badge>
          </div>

          {security.lastLogin && (
            <div className="flex items-center gap-2 ml-6 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              Last login: {formatDistanceToNow(new Date(security.lastLogin), { addSuffix: true })}
            </div>
          )}
        </div>

        {/* Failed Attempts Warning */}
        {security.failedLoginAttempts > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <div className="text-sm">
              <span className="font-medium text-amber-800 dark:text-amber-300">
                {security.failedLoginAttempts} failed login attempts
              </span>
            </div>
          </div>
        )}

        {/* Password Change Required */}
        {security.mustChangePassword && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <Key className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div className="text-sm">
              <span className="font-medium text-blue-800 dark:text-blue-300">
                User must change password on next login
              </span>
            </div>
          </div>
        )}

        <Separator />

        {/* Actions */}
        {canWriteUsers && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Security Actions</h4>

            <div className="grid grid-cols-2 gap-2">
              {/* Force Password Reset */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <Key className="mr-2 h-4 w-4" />
                    Force Reset Password
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Force Password Reset?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will invalidate the user's current password and send them an email with a reset link.
                      They will be logged out of all sessions.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => forceReset.mutate({ userId })}
                      disabled={forceReset.isPending}
                    >
                      {forceReset.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Reset Password
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Revoke Sessions */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <LogOut className="mr-2 h-4 w-4" />
                    Revoke All Sessions
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Revoke All Sessions?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will immediately log out the user from all devices and invalidate all their sessions.
                      They will need to sign in again.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => revokeSessions.mutate(userId)}
                      disabled={revokeSessions.isPending}
                    >
                      {revokeSessions.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Revoke Sessions
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Disable MFA */}
              {security.mfaEnabled && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-amber-600 hover:text-amber-700">
                      <ShieldX className="mr-2 h-4 w-4" />
                      Disable MFA
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Disable MFA?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove all multi-factor authentication methods from this user's account.
                        Their account will be less secure until they re-enable MFA.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => disableMFA.mutate({ userId })}
                        disabled={disableMFA.isPending}
                        className="bg-amber-600 hover:bg-amber-700"
                      >
                        {disableMFA.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Disable MFA
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {/* Lock/Unlock Account */}
              {isLocked ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-green-600 hover:text-green-700">
                      <Unlock className="mr-2 h-4 w-4" />
                      Unlock Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Unlock Account?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will restore the user's access to the system. They will be able to sign in again.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => unlockAccount.mutate(userId)}
                        disabled={unlockAccount.isPending}
                      >
                        {unlockAccount.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Unlock Account
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Dialog open={showLockDialog} onOpenChange={setShowLockDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700">
                      <Lock className="mr-2 h-4 w-4" />
                      Lock Account
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Lock User Account</DialogTitle>
                      <DialogDescription>
                        This will prevent the user from signing in. They will be logged out immediately.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Label htmlFor="lock-reason">Reason (optional)</Label>
                      <Input
                        id="lock-reason"
                        value={lockReason}
                        onChange={(e) => setLockReason(e.target.value)}
                        placeholder="Enter reason for locking..."
                        className="mt-2"
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowLockDialog(false)}>
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          lockAccount.mutate({ userId, reason: lockReason })
                          setShowLockDialog(false)
                          setLockReason('')
                        }}
                        disabled={lockAccount.isPending}
                      >
                        {lockAccount.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Lock Account
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

