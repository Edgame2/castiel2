'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  Monitor,
  Smartphone,
  Tablet,
  MapPin,
  Clock,
  AlertTriangle,
  LogOut,
  Trash2,
  CheckCircle2,
  Globe,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useSessions, useRevokeSession, useRevokeAllSessions } from '@/hooks/use-sessions';
import { useAuth } from '@/contexts/auth-context';
import type { Session } from '@/lib/api/sessions';

export default function SessionsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [sessionToRevoke, setSessionToRevoke] = useState<string | null>(null);
  const [showRevokeAllDialog, setShowRevokeAllDialog] = useState(false);

  // Get user data from auth context
  const tenantId = user?.tenantId;
  const userId = user?.id;

  // Fetch sessions (sessionId is optional - backend determines from cookie)
  // Only fetch if user is loaded and we have the required IDs
  const { data, isLoading: sessionsLoading, error } = useSessions(
    tenantId || '',
    userId || ''
  );

  const isLoading = authLoading || sessionsLoading;

  // Mutations
  const revokeSessionMutation = useRevokeSession();
  const revokeAllSessionsMutation = useRevokeAllSessions();

  const handleRevokeSession = (sessionId: string) => {
    if (!tenantId || !userId) return;
    
    revokeSessionMutation.mutate(
      {
        sessionId,
        tenantId,
        userId,
      },
      {
        onSuccess: () => setSessionToRevoke(null),
      }
    );
  };

  const handleRevokeAllSessions = () => {
    if (!tenantId || !userId) return;
    
    // Get current session from the list (backend marks it with isCurrent)
    const currentSession = data?.sessions?.find((s: Session) => s.isCurrent);
    
    revokeAllSessionsMutation.mutate(
      {
        tenantId,
        userId,
        currentSessionId: currentSession?.sessionId,
      },
      {
        onSuccess: () => setShowRevokeAllDialog(false),
      }
    );
  };

  const getDeviceIcon = (session: Session) => {
    const deviceType = session.deviceInfo?.deviceType;
    const size = 20;

    if (deviceType === 'mobile') return <Smartphone className="h-5 w-5" />;
    if (deviceType === 'tablet') return <Tablet className="h-5 w-5" />;
    return <Monitor className="h-5 w-5" />;
  };

  const getDeviceDescription = (session: Session) => {
    const { deviceInfo } = session;
    if (!deviceInfo) return 'Unknown Device';

    const parts = [];
    if (deviceInfo.browser) parts.push(deviceInfo.browser);
    if (deviceInfo.os) parts.push(deviceInfo.os);
    if (deviceInfo.device) parts.push(deviceInfo.device);

    return parts.join(' • ') || 'Unknown Device';
  };

  const getLocationDescription = (session: Session) => {
    const { locationInfo } = session;
    if (!locationInfo?.ip) return null;

    const parts = [];
    if (locationInfo.city) parts.push(locationInfo.city);
    if (locationInfo.region) parts.push(locationInfo.region);
    if (locationInfo.country) parts.push(locationInfo.country);

    return parts.length > 0 ? parts.join(', ') : locationInfo.ip;
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-8 space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-4xl py-8">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Error Loading Sessions
            </CardTitle>
            <CardDescription>
              {error.message || 'Failed to load your sessions. Please try again later.'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const sessions = data?.sessions || [];
  const otherSessions = sessions.filter((s) => !s.isCurrent);
  const currentSession = sessions.find((s) => s.isCurrent);

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Active Sessions</h1>
        <p className="text-muted-foreground mt-2">
          Manage your active sessions across all devices. You can revoke access to any device at
          any time.
        </p>
      </div>

      {/* Current Session */}
      {currentSession && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Current Session
            </CardTitle>
            <CardDescription>This is the device you're currently using</CardDescription>
          </CardHeader>
          <CardContent>
            <SessionCard session={currentSession} isCurrent />
          </CardContent>
        </Card>
      )}

      {/* Other Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Other Devices</CardTitle>
              <CardDescription>
                {otherSessions.length === 0
                  ? 'No other active sessions'
                  : `${otherSessions.length} other active session(s)`}
              </CardDescription>
            </div>
            {otherSessions.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowRevokeAllDialog(true)}
                disabled={revokeAllSessionsMutation.isPending}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout All Other Devices
              </Button>
            )}
          </div>
        </CardHeader>
        {otherSessions.length > 0 && (
          <CardContent className="space-y-4">
            {otherSessions.map((session, index) => (
              <div key={session.sessionId}>
                {index > 0 && <Separator className="my-4" />}
                <SessionCard
                  session={session}
                  onRevoke={() => setSessionToRevoke(session.sessionId)}
                  isRevoking={
                    revokeSessionMutation.isPending &&
                    revokeSessionMutation.variables?.sessionId === session.sessionId
                  }
                />
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* Revoke Single Session Dialog */}
      <Dialog
        open={!!sessionToRevoke}
        onOpenChange={(open: boolean) => !open && setSessionToRevoke(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke this session? The device will be logged out
              immediately and will need to sign in again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSessionToRevoke(null)}
              disabled={revokeSessionMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => sessionToRevoke && handleRevokeSession(sessionToRevoke)}
              disabled={revokeSessionMutation.isPending}
            >
              {revokeSessionMutation.isPending ? 'Revoking...' : 'Revoke Session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke All Sessions Dialog */}
      <Dialog open={showRevokeAllDialog} onOpenChange={setShowRevokeAllDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Logout All Other Devices</DialogTitle>
            <DialogDescription>
              Are you sure you want to logout from all other devices? This will revoke{' '}
              {otherSessions.length} session(s). Your current session will remain active.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRevokeAllDialog(false)}
              disabled={revokeAllSessionsMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevokeAllSessions}
              disabled={revokeAllSessionsMutation.isPending}
            >
              {revokeAllSessionsMutation.isPending ? 'Logging out...' : 'Logout All'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Session Card Component
interface SessionCardProps {
  session: Session;
  isCurrent?: boolean;
  onRevoke?: () => void;
  isRevoking?: boolean;
}

function SessionCard({ session, isCurrent, onRevoke, isRevoking }: SessionCardProps) {
  const getDeviceIcon = (session: Session) => {
    const deviceType = session.deviceInfo?.deviceType;
    if (deviceType === 'mobile') return <Smartphone className="h-5 w-5" />;
    if (deviceType === 'tablet') return <Tablet className="h-5 w-5" />;
    return <Monitor className="h-5 w-5" />;
  };

  const getDeviceDescription = (session: Session) => {
    const { deviceInfo } = session;
    if (!deviceInfo) return 'Unknown Device';

    const parts = [];
    if (deviceInfo.browser) parts.push(deviceInfo.browser);
    if (deviceInfo.os) parts.push(deviceInfo.os);

    return parts.join(' • ') || 'Unknown Device';
  };

  const location = session.locationInfo?.ip
    ? [
        session.locationInfo.city,
        session.locationInfo.region,
        session.locationInfo.country,
      ]
        .filter(Boolean)
        .join(', ') || session.locationInfo.ip
    : null;

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex gap-4 flex-1">
        <div className="mt-1">{getDeviceIcon(session)}</div>
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium">{getDeviceDescription(session)}</p>
            {isCurrent && (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                Current
              </Badge>
            )}
          </div>

          <div className="space-y-1 text-sm text-muted-foreground">
            {location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" />
                <span>{location}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              <span>
                Last active {format(new Date(session.lastActivityAt), 'MMM d, yyyy h:mm a')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5" />
              <span>Signed in {format(new Date(session.createdAt), 'MMM d, yyyy')}</span>
            </div>
          </div>
        </div>
      </div>

      {!isCurrent && onRevoke && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRevoke}
          disabled={isRevoking}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {isRevoking ? 'Revoking...' : 'Revoke'}
        </Button>
      )}
    </div>
  );
}
