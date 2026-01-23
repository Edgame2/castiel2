"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { ArrowLeft, Pencil, Shield, ShieldOff, Trash, KeyRound, Clock, Mail, CheckCircle2, XCircle, Monitor, Smartphone, Tablet, MapPin, LogOut } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  useUser, 
  useActivateUser, 
  useDeactivateUser, 
  useDeleteUser, 
  useAdminPasswordReset,
  useUserActivity 
} from "@/hooks/use-users"
import { useUserSessions, useRevokeSession, useAdminRevokeAllSessions } from "@/hooks/use-sessions"
import { ExternalUserIdsSection } from "@/components/users/external-user-ids-section"
import type { Session } from "@/lib/api/sessions"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import type { User, UserStatus } from "@/types/api"

interface UserDetailPageProps {
  params: Promise<{ id: string }>
}

// Helper functions
function getUserDisplayName(user: User): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`
  }
  if (user.firstName) return user.firstName
  if (user.lastName) return user.lastName
  return user.email.split('@' as any)[0]
}

function getUserInitials(user: User): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
  }
  if (user.firstName) return user.firstName.substring(0, 2).toUpperCase()
  return user.email.substring(0, 2).toUpperCase()
}

function getStatusVariant(status: UserStatus): "default" | "outline" | "destructive" | "secondary" {
  switch (status) {
    case 'active': return 'default'
    case 'suspended': return 'destructive'
    case 'pending': return 'secondary'
    case 'deleted': return 'outline'
    default: return 'outline'
  }
}

export default function UserDetailPage({ params }: UserDetailPageProps) {
  const { t } = useTranslation('users')
  const { id } = use(params)
  const router = useRouter()

  const getStatusLabel = (status: UserStatus): string => {
    switch (status) {
      case 'active': return t('status.active' as any)
      case 'inactive': return t('status.inactive' as any)
      case 'suspended': return t('status.suspended' as any)
      case 'pending': return t('status.pending' as any)
      case 'deleted': return t('status.deleted' as any)
      default: return status
    }
  }
  const { data: user, isLoading } = useUser(id)
  const { data: activityData } = useUserActivity(id, { page: 1, limit: 10 })
  const { data: sessionsData, isLoading: sessionsLoading } = useUserSessions(user?.tenantId || '', id)
  const activateUser = useActivateUser()
  const deactivateUser = useDeactivateUser()
  const deleteUser = useDeleteUser()
  const resetPassword = useAdminPasswordReset()
  const revokeSession = useRevokeSession()
  const revokeAllSessions = useAdminRevokeAllSessions()

  const [sessionToRevoke, setSessionToRevoke] = useState<Session | null>(null)
  const [showRevokeAllDialog, setShowRevokeAllDialog] = useState(false)

  const handleActivate = () => {
    if (confirm(t('detail.confirms.activate' as any, { name: getUserDisplayName(user!) }))) {
      activateUser.mutate(id)
    }
  }

  const handleDeactivate = () => {
    if (confirm(t('detail.confirms.deactivate' as any, { name: getUserDisplayName(user!) }))) {
      deactivateUser.mutate(id)
    }
  }

  const handleResetPassword = () => {
    if (confirm(t('detail.confirms.resetPassword' as any, { email: user!.email }))) {
      resetPassword.mutate({ id, data: { sendEmail: true } })
    }
  }

  const handleRevokeSession = () => {
    if (!sessionToRevoke || !user) return
    revokeSession.mutate(
      {
        sessionId: sessionToRevoke.sessionId,
        tenantId: user.tenantId,
        userId: user.id,
      },
      {
        onSuccess: () => setSessionToRevoke(null),
      }
    )
  }

  const handleRevokeAllSessions = () => {
    if (!user) return
    revokeAllSessions.mutate(
      {
        tenantId: user.tenantId,
        userId: user.id,
      },
      {
        onSuccess: () => setShowRevokeAllDialog(false),
      }
    )
  }

  const getDeviceIcon = (deviceType?: string) => {
    if (!deviceType) return <Monitor className="h-4 w-4" />
    switch (deviceType.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />
      case 'tablet':
        return <Tablet className="h-4 w-4" />
      default:
        return <Monitor className="h-4 w-4" />
    }
  }

  const handleDelete = () => {
    if (confirm(t('detail.confirms.delete' as any, { name: getUserDisplayName(user!) }))) {
      deleteUser.mutate(id, {
        onSuccess: () => {
          router.push("/users")
        },
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-[300px]" />
            <Skeleton className="h-[200px]" />
          </div>
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-6">
        <h2 className="text-2xl font-semibold">{t('detail.userNotFound' as any)}</h2>
        <Button onClick={() => router.push("/users")}>{t('detail.backToUsers' as any)}</Button>
      </div>
    )
  }

  const canActivate = user.status === 'suspended' || user.status === 'inactive'
  const canDeactivate = user.status === 'active'
  const displayName = getUserDisplayName(user)
  const initials = getUserInitials(user)

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/users")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{t('detail.title' as any)}</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/users/${id}/edit`)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            {t('actions.edit' as any)}
          </Button>
          <Button variant="outline" onClick={handleResetPassword}>
            <KeyRound className="mr-2 h-4 w-4" />
            {t('actions.resetPassword' as any)}
          </Button>
          {canActivate && (
            <Button variant="outline" onClick={handleActivate}>
              <Shield className="mr-2 h-4 w-4" />
              {t('actions.activate' as any)}
            </Button>
          )}
          {canDeactivate && (
            <Button variant="outline" onClick={handleDeactivate}>
              <ShieldOff className="mr-2 h-4 w-4" />
              {t('actions.deactivate' as any)}
            </Button>
          )}
          <Button variant="destructive" onClick={handleDelete}>
            <Trash className="mr-2 h-4 w-4" />
            {t('actions.delete' as any)}
          </Button>
        </div>
      </div>

      {/* Status Alert */}
      {user.status === 'suspended' && (
        <Alert variant="destructive">
          <ShieldOff className="h-4 w-4" />
          <AlertDescription>
            {t('detail.alerts.suspended' as any)}
          </AlertDescription>
        </Alert>
      )}
      {user.status === 'pending' && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            {t('detail.alerts.pending' as any)}
          </AlertDescription>
        </Alert>
      )}
      {user.status === 'deleted' && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            {t('detail.alerts.deleted' as any)}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t('detail.profileInfo' as any)}</CardTitle>
              <CardDescription>{t('detail.profileInfoDesc' as any)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="text-2xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold">{displayName}</h3>
                  <p className="text-muted-foreground">{user.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {user.emailVerified ? (
                      <Badge variant="outline" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {t('detail.emailVerified' as any)}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <Mail className="h-3 w-3" />
                        {t('detail.emailNotVerified' as any)}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">{t('detail.firstName' as any)}</p>
                  <p className="font-medium">{user.firstName || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">{t('detail.lastName' as any)}</p>
                  <p className="font-medium">{user.lastName || '—'}</p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground mb-2">{t('detail.roles' as any)}</p>
                <div className="flex flex-wrap gap-2">
                  {user.roles && user.roles.length > 0 ? (
                    user.roles.map((role) => (
                      <Badge key={role} variant="secondary">
                        {role}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">{t('detail.noRoles' as any)}</span>
                  )}
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground mb-2">{t('detail.status' as any)}</p>
                <Badge variant={getStatusVariant(user.status)}>
                  {getStatusLabel(user.status)}
                </Badge>
              </div>

              {/* Metadata */}
              {user.metadata && Object.keys(user.metadata).length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">{t('detail.metadata' as any)}</p>
                    <div className="rounded-lg bg-muted p-4 space-y-2">
                      {Object.entries(user.metadata).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-sm font-medium">{key}:</span>
                          <span className="text-sm text-muted-foreground">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Activity */}
          <Card>
            <CardHeader>
              <CardTitle>{t('detail.activity' as any)}</CardTitle>
              <CardDescription>{t('detail.activityDesc' as any)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('detail.lastLogin' as any)}</p>
                  <p className="text-lg font-medium">
                    {user.lastLoginAt
                      ? format(new Date(user.lastLoginAt), "MMM d, yyyy 'at' HH:mm")
                      : t('detail.never' as any)}
                  </p>
                </div>

                <Separator />

                {activityData && activityData.activities.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">{t('detail.activityLog' as any)}</p>
                    {activityData.activities.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 text-sm">
                        <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div className="flex-1">
                          <p>{activity.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(activity.timestamp), "MMM d, yyyy HH:mm")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>{t('detail.noActivity' as any)}</p>
                    <p className="text-xs mt-1">{t('detail.noActivityDesc' as any)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* External User IDs */}
          <ExternalUserIdsSection userId={id} readOnly={true} />

          {/* Active Sessions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('detail.sessions' as any)}</CardTitle>
                  <CardDescription>{t('detail.sessionsDesc' as any)}</CardDescription>
                </div>
                {sessionsData && sessionsData.sessions.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowRevokeAllDialog(true)}
                    disabled={revokeAllSessions.isPending}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {t('detail.terminateAllSessions' as any)}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {sessionsLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-start gap-4">
                      <Skeleton className="h-12 w-12 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : sessionsData && sessionsData.sessions.length > 0 ? (
                <div className="space-y-4">
                  {sessionsData.sessions.map((session) => (
                    <div
                      key={session.sessionId}
                      className="flex items-start gap-4 p-4 border rounded-lg"
                    >
                      <div className="mt-1">
                        {getDeviceIcon(session.deviceInfo?.device)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm">
                            {session.deviceInfo?.browser || t('detail.unknownBrowser' as any)} •{' '}
                            {session.deviceInfo?.os || t('detail.unknownOS' as any)} •{' '}
                            {session.deviceInfo?.device || t('detail.desktop' as any)}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {session.locationInfo && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span>
                                {session.locationInfo.city && session.locationInfo.country
                                  ? `${session.locationInfo.city}, ${session.locationInfo.country}`
                                  : session.locationInfo.ip || t('detail.unknownLocation' as any)}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {t('detail.lastActive' as any)}{' '}
                              {format(new Date(session.lastActivityAt), "MMM d, yyyy 'at' HH:mm")}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('detail.signedIn' as any)} {format(new Date(session.createdAt), "MMM d, yyyy 'at' HH:mm")}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSessionToRevoke(session)}
                        disabled={revokeSession.isPending}
                      >
                        {t('detail.terminateSession' as any)}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <Monitor className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>{t('detail.noSessions' as any)}</p>
                  <p className="text-xs mt-1">{t('detail.noSessionsDesc' as any)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('detail.details' as any)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('detail.userId' as any)}</p>
                <p className="text-sm font-mono break-all">{user.id}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">{t('detail.tenantId' as any)}</p>
                <p className="text-sm font-mono break-all">{user.tenantId}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">{t('detail.created' as any)}</p>
                <p className="text-sm">
                  {format(new Date(user.createdAt), "MMM d, yyyy 'at' HH:mm")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('detail.lastUpdated' as any)}</p>
                <p className="text-sm">
                  {format(new Date(user.updatedAt), "MMM d, yyyy 'at' HH:mm")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>{t('detail.quickActions' as any)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push(`/users/${id}/edit`)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                {t('detail.editProfile' as any)}
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleResetPassword}
                disabled={resetPassword.isPending}
              >
                <KeyRound className="mr-2 h-4 w-4" />
                {t('actions.resetPassword' as any)}
              </Button>
              {canActivate && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleActivate}
                  disabled={activateUser.isPending}
                >
                  <Shield className="mr-2 h-4 w-4" />
                  {t('detail.activateAccount' as any)}
                </Button>
              )}
              {canDeactivate && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleDeactivate}
                  disabled={deactivateUser.isPending}
                >
                  <ShieldOff className="mr-2 h-4 w-4" />
                  {t('detail.deactivateAccount' as any)}
                </Button>
              )}
              <Separator />
              <Button
                variant="destructive"
                className="w-full justify-start"
                onClick={handleDelete}
                disabled={deleteUser.isPending}
              >
                <Trash className="mr-2 h-4 w-4" />
                {t('detail.deleteUser' as any)}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Revoke Single Session Dialog */}
      <Dialog open={!!sessionToRevoke} onOpenChange={(open) => !open && setSessionToRevoke(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('detail.revokeSession' as any)}</DialogTitle>
            <DialogDescription>
              {t('detail.revokeSessionDesc' as any)}
            </DialogDescription>
          </DialogHeader>
          {sessionToRevoke && (
            <div className="py-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                {getDeviceIcon(sessionToRevoke.deviceInfo?.device)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {sessionToRevoke.deviceInfo?.browser || t('detail.unknownBrowser' as any)} •{' '}
                    {sessionToRevoke.deviceInfo?.os || t('detail.unknownOS' as any)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {sessionToRevoke.locationInfo?.ip || t('detail.unknownLocation' as any)}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSessionToRevoke(null)}
              disabled={revokeSession.isPending}
            >
              {t('detail.cancel' as any)}
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevokeSession}
              disabled={revokeSession.isPending}
            >
              {revokeSession.isPending ? t('detail.revoking' as any) : t('detail.revokeSession' as any)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke All Sessions Dialog */}
      <Dialog open={showRevokeAllDialog} onOpenChange={setShowRevokeAllDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('detail.revokeAllSessions' as any)}</DialogTitle>
            <DialogDescription>
              {t('detail.revokeAllSessionsDesc' as any)}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Alert>
              <AlertDescription>
                {sessionsData && t('detail.revokeAllSessionsWarning' as any, { count: sessionsData.sessions.length })}
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRevokeAllDialog(false)}
              disabled={revokeAllSessions.isPending}
            >
              {t('detail.cancel' as any)}
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevokeAllSessions}
              disabled={revokeAllSessions.isPending}
            >
              {revokeAllSessions.isPending ? t('detail.revoking' as any) : t('detail.revokeAllSessions' as any)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
