'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Bell,
  Mail,
  Shield,
  Megaphone,
  CalendarDays,
  AtSign,
  RefreshCw,
} from 'lucide-react'
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/hooks/use-profile'
import { cn } from '@/lib/utils'

interface NotificationsCardProps {
  className?: string
}

interface NotificationSettingProps {
  icon: React.ElementType
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}

function NotificationSetting({
  icon: Icon,
  title,
  description,
  checked,
  onCheckedChange,
  disabled,
}: NotificationSettingProps) {
  return (
    <div className="flex items-center justify-between space-x-4 py-4">
      <div className="flex items-center space-x-4">
        <div className="p-2 bg-muted rounded-lg">
          <Icon className="h-4 w-4" />
        </div>
        <div className="space-y-0.5">
          <Label className="text-base">{title}</Label>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  )
}

/**
 * NotificationsCard - Widget-compatible notification preferences card
 * Allows users to manage their notification settings
 */
export function NotificationsCard({ className }: NotificationsCardProps) {
  const { data: preferences, isLoading, error, refetch } = useNotificationPreferences()
  const updateMutation = useUpdateNotificationPreferences()

  const handleToggle = async (key: string, value: boolean) => {
    await updateMutation.mutateAsync({ [key]: value })
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
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between py-4">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <Skeleton className="h-6 w-10 rounded-full" />
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
              <span>{error.message || 'Failed to load notification preferences'}</span>
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

  // Default preferences if not loaded
  const prefs = preferences || {
    emailNotifications: true,
    securityAlerts: true,
    productUpdates: false,
    weeklyDigest: false,
    mentionNotifications: true,
  }

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Choose how you want to be notified about activity
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <NotificationSetting
            icon={Mail}
            title="Email Notifications"
            description="Receive notifications via email"
            checked={prefs.emailNotifications}
            onCheckedChange={(checked) => handleToggle('emailNotifications', checked)}
            disabled={updateMutation.isPending}
          />
          
          <Separator />
          
          <NotificationSetting
            icon={Shield}
            title="Security Alerts"
            description="Get notified about important security events"
            checked={prefs.securityAlerts}
            onCheckedChange={(checked) => handleToggle('securityAlerts', checked)}
            disabled={updateMutation.isPending}
          />
          
          <Separator />
          
          <NotificationSetting
            icon={Megaphone}
            title="Product Updates"
            description="News about new features and improvements"
            checked={prefs.productUpdates}
            onCheckedChange={(checked) => handleToggle('productUpdates', checked)}
            disabled={updateMutation.isPending}
          />
          
          <Separator />
          
          <NotificationSetting
            icon={CalendarDays}
            title="Weekly Digest"
            description="Summary of your activity sent weekly"
            checked={prefs.weeklyDigest}
            onCheckedChange={(checked) => handleToggle('weeklyDigest', checked)}
            disabled={updateMutation.isPending}
          />
          
          <Separator />
          
          <NotificationSetting
            icon={AtSign}
            title="Mentions"
            description="Get notified when someone mentions you"
            checked={prefs.mentionNotifications}
            onCheckedChange={(checked) => handleToggle('mentionNotifications', checked)}
            disabled={updateMutation.isPending}
          />
        </div>

        <p className="text-xs text-muted-foreground mt-6">
          Security alerts cannot be disabled for account safety.
        </p>
      </CardContent>
    </Card>
  )
}
