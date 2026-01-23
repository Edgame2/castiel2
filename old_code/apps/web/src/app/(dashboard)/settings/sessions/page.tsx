'use client'

import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Monitor, Smartphone, Globe, Clock, Trash2, AlertCircle, Shield } from 'lucide-react'
import { useProfile } from '@/hooks/use-profile'
import { useSessions, useRevokeSession, useRevokeAllSessions } from '@/hooks/use-sessions'
import { formatDistanceToNow } from 'date-fns'

export default function SessionsPage() {
    const { t } = useTranslation(['settings', 'common'])
    const { data: profile } = useProfile()

    // Fetch sessions only when profile is available
    const {
        data: sessionsData,
        isLoading: isLoadingSessions,
        error: sessionsError
    } = useSessions(profile?.tenantId || '', profile?.id || '', '') // Empty sessionId for list

    const revokeSessionMutation = useRevokeSession()
    const revokeAllSessionsMutation = useRevokeAllSessions()

    const handleRevokeSession = (sessionId: string) => {
        if (!profile) return
        revokeSessionMutation.mutate({
            sessionId,
            tenantId: profile.tenantId,
            userId: profile.id,
        })
    }

    const handleRevokeAllSessions = () => {
        if (!profile) return
        revokeAllSessionsMutation.mutate({
            tenantId: profile.tenantId,
            userId: profile.id,
            currentSessionId: sessionsData?.sessions.find(s => s.isCurrent)?.sessionId
        })
    }

    const getDeviceIcon = (deviceType?: string) => {
        switch (deviceType?.toLowerCase()) {
            case 'mobile':
                return <Smartphone className="h-5 w-5 text-slate-500" />
            case 'tablet':
                return <Smartphone className="h-5 w-5 text-slate-500" />
            default:
                return <Monitor className="h-5 w-5 text-slate-500" />
        }
    }

    if (!profile && !isLoadingSessions) {
        return null
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">{t('settings:sessions.title', 'Active Sessions')}</h2>
                <p className="text-muted-foreground">
                    {t('settings:sessions.description', 'Manage your active sessions and devices.')}
                </p>
            </div>

            {sessionsError && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        {t('common:error.loadFailed' as any, 'Failed to load sessions.')}
                    </AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="space-y-1">
                        <CardTitle>{t('settings:sessions.activeSessions', 'Active Sessions')}</CardTitle>
                        <CardDescription>
                            {t('settings:sessions.activeSessionsWithCount', 'Active Sessions', { count: sessionsData?.total || 0 })}
                        </CardDescription>
                    </div>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleRevokeAllSessions}
                        disabled={!sessionsData?.sessions?.length || sessionsData.sessions.length <= 1 || revokeAllSessionsMutation.isPending}
                    >
                        {revokeAllSessionsMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Shield className="mr-2 h-4 w-4" />
                        )}
                        {t('settings:sessions.revokeAll', 'Revoke All Other Sessions')}
                    </Button>
                </CardHeader>
                <CardContent>
                    {isLoadingSessions ? (
                        <div className="flex h-32 items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="space-y-4 pt-4">
                            {sessionsData?.sessions.map((session) => (
                                <div
                                    key={session.sessionId}
                                    className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="rounded-full bg-slate-100 p-2 dark:bg-slate-800">
                                            {getDeviceIcon(session.deviceInfo?.deviceType)}
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium leading-none">
                                                    {session.deviceInfo?.device || 'Unknown Device'}
                                                    {session.deviceInfo?.os ? ` (${session.deviceInfo.os})` : ''}
                                                </p>
                                                {session.isCurrent && (
                                                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">
                                                        {t('settings:sessions.currentSession', 'Current Session')}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Globe className="h-3.5 w-3.5" />
                                                    {session.locationInfo?.city}, {session.locationInfo?.country || 'Unknown Location'}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Monitor className="h-3.5 w-3.5" />
                                                    {session.deviceInfo?.browser}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    {session.lastActivityAt ? (
                                                        <span>Active {formatDistanceToNow(new Date(session.lastActivityAt), { addSuffix: true })}</span>
                                                    ) : (
                                                        <span>{t('settings:sessions.justNow', 'Just now')}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {!session.isCurrent && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground hover:text-destructive"
                                            onClick={() => handleRevokeSession(session.sessionId)}
                                            disabled={revokeSessionMutation.isPending}
                                        >
                                            {revokeSessionMutation.isPending && revokeSessionMutation.variables?.sessionId === session.sessionId ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="h-4 w-4" />
                                            )}
                                            <span className="sr-only">{t('settings:sessions.revoke', 'Revoke')}</span>
                                        </Button>
                                    )}
                                </div>
                            ))}

                            {!sessionsData?.sessions?.length && (
                                <div className="text-center text-muted-foreground py-8">
                                    {t('settings:sessions.noSessions', 'No active sessions found.')}
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
