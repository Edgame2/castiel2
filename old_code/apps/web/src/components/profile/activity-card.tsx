'use client'

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
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Activity,
  LogIn,
  LogOut,
  Key,
  Shield,
  Settings,
  User,
  RefreshCw,
  Clock,
  MapPin,
} from 'lucide-react'
import { useProfileActivity, type ProfileActivityEntry } from '@/hooks/use-profile'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

interface ActivityCardProps {
  className?: string
  limit?: number
}

/**
 * Get icon for activity action
 */
function getActivityIcon(action: string) {
  const actionLower = action.toLowerCase()
  if (actionLower.includes('login') || actionLower.includes('sign_in')) return LogIn
  if (actionLower.includes('logout') || actionLower.includes('sign_out')) return LogOut
  if (actionLower.includes('password')) return Key
  if (actionLower.includes('mfa') || actionLower.includes('2fa') || actionLower.includes('security')) return Shield
  if (actionLower.includes('settings') || actionLower.includes('update')) return Settings
  if (actionLower.includes('profile')) return User
  return Activity
}

/**
 * Get badge variant for activity action
 */
function getActivityBadge(action: string): { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' } {
  const actionLower = action.toLowerCase()
  if (actionLower.includes('login') || actionLower.includes('sign_in')) {
    return { label: 'Login', variant: 'default' }
  }
  if (actionLower.includes('logout') || actionLower.includes('sign_out')) {
    return { label: 'Logout', variant: 'secondary' }
  }
  if (actionLower.includes('password')) {
    return { label: 'Password', variant: 'outline' }
  }
  if (actionLower.includes('mfa') || actionLower.includes('2fa')) {
    return { label: 'MFA', variant: 'outline' }
  }
  if (actionLower.includes('failed') || actionLower.includes('error')) {
    return { label: 'Failed', variant: 'destructive' }
  }
  return { label: 'Activity', variant: 'secondary' }
}

/**
 * ActivityCard - Widget-compatible recent activity card
 * Shows recent account activity
 */
export function ActivityCard({ className, limit = 10 }: ActivityCardProps) {
  const { data: activities, isLoading, error, refetch } = useProfileActivity(limit)

  // Loading state
  if (isLoading) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-4">
                <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
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
              <span>{error.message || 'Failed to load activity'}</span>
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
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
        <CardDescription>
          Your recent account activity and security events
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!activities || activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No recent activity</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {activities.map((activity) => {
                const Icon = getActivityIcon(activity.action)
                const badge = getActivityBadge(activity.action)

                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0"
                  >
                    <div className="p-2 bg-muted rounded-lg shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">
                          {activity.description}
                        </p>
                        <Badge variant={badge.variant} className="text-xs">
                          {badge.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </span>
                        {activity.ipAddress && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {activity.ipAddress}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
