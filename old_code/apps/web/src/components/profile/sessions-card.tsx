'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  LogOut,
  RefreshCw,
  MapPin,
  Clock,
  CheckCircle,
} from 'lucide-react'
import { useSessions, useRevokeSession, useRevokeAllSessions } from '@/hooks/use-sessions'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import type { Session } from '@/lib/api/sessions'

interface SessionsCardProps {
  className?: string
}

/**
 * Get device icon based on device info
 */
function getDeviceIcon(session: Session) {
  if (session.deviceInfo?.isMobile) {
    return Smartphone
  }
  if (session.deviceInfo?.deviceType === 'tablet') {
    return Tablet
  }
  return Monitor
}

/**
 * Get browser name from session
 */
function getBrowserName(session: Session) {
  return session.deviceInfo?.browser || 'Unknown Browser'
}

/**
 * Get OS from session
 */
function getOS(session: Session) {
  return session.deviceInfo?.os || 'Unknown OS'
}

/**
 * SessionsCard - Widget-compatible active sessions card
 * Shows all active sessions and allows revoking them
 */
export function SessionsCard({ className }: SessionsCardProps) {
  const { user } = useAuth()
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [sessionToRevoke, setSessionToRevoke] = useState<string | null>(null)
  const [revokeAllDialogOpen, setRevokeAllDialogOpen] = useState(false)

  const { 
    data: sessionsData, 
    isLoading, 
    error, 
    refetch 
  } = useSessions(user?.tenantId || '', user?.id || '')
  
  const revokeSessionMutation = useRevokeSession()
  const revokeAllMutation = useRevokeAllSessions()

  const sessions = sessionsData?.sessions || []

  const handleRevokeSession = async (targetSessionId: string) => {
    await revokeSessionMutation.mutateAsync({
      sessionId: targetSessionId,
      tenantId: user?.tenantId || '',
      userId: user?.id || '',
    })
    setConfirmDialogOpen(false)
    setSessionToRevoke(null)
  }

  const handleRevokeAllSessions = async () => {
    await revokeAllMutation.mutateAsync({
      tenantId: user?.tenantId || '',
      userId: user?.id || '',
      currentSessionId: undefined,
    })
    setRevokeAllDialogOpen(false)
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className={cn(className)}>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span>{error.message || 'Failed to load sessions'}</span>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className={cn(className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Active Sessions
              </CardTitle>
              <CardDescription>
                Devices where you&apos;re currently logged in
              </CardDescription>
            </div>
            {sessions.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRevokeAllDialogOpen(true)}
                disabled={revokeAllMutation.isPending}
              >
                {revokeAllMutation.isPending && (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                )}
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out All Others
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No active sessions found
            </div>
          ) : (
            sessions.map((session) => {
              const isCurrentSession = session.isCurrent
              const DeviceIcon = getDeviceIcon(session)
              const browser = getBrowserName(session)
              const os = getOS(session)

              return (
                <div
                  key={session.sessionId}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-lg border",
                    isCurrentSession && "bg-primary/5 border-primary"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-lg",
                    isCurrentSession ? "bg-primary/10" : "bg-muted"
                  )}>
                    <DeviceIcon className={cn(
                      "h-5 w-5",
                      isCurrentSession && "text-primary"
                    )} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">
                        {browser} on {os}
                      </p>
                      {isCurrentSession && (
                        <Badge variant="default" className="shrink-0">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Current
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      {session.locationInfo?.ip && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {session.locationInfo.city 
                            ? `${session.locationInfo.city}, ${session.locationInfo.country}` 
                            : session.locationInfo.ip}
                        </span>
                      )}
                      {session.lastActivityAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(session.lastActivityAt), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>

                  {!isCurrentSession && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSessionToRevoke(session.sessionId)
                        setConfirmDialogOpen(true)
                      }}
                      disabled={revokeSessionMutation.isPending}
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )
            })
          )}

          <p className="text-xs text-muted-foreground pt-2">
            If you don&apos;t recognize a session, sign out of it and change your password.
          </p>
        </CardContent>
      </Card>

      {/* Revoke Single Session Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign Out of This Session?</DialogTitle>
            <DialogDescription>
              This will sign out of the selected device. You&apos;ll need to sign in again on that device.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => sessionToRevoke && handleRevokeSession(sessionToRevoke)}
              disabled={revokeSessionMutation.isPending}
            >
              {revokeSessionMutation.isPending && (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              )}
              Sign Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke All Sessions Dialog */}
      <Dialog open={revokeAllDialogOpen} onOpenChange={setRevokeAllDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign Out of All Other Sessions?</DialogTitle>
            <DialogDescription>
              This will sign out of all devices except this one. You&apos;ll need to sign in again on those devices.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeAllDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRevokeAllSessions}
              disabled={revokeAllMutation.isPending}
            >
              {revokeAllMutation.isPending && (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              )}
              Sign Out All Others
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
