'use client'

import dynamic from 'next/dynamic'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { User, Shield, Globe, Bell, Activity } from 'lucide-react'

// Lazy load profile components
const PersonalInfoCard = dynamic(
  () => import('@/components/profile/personal-info' as any).then((mod) => ({ default: mod.PersonalInfoCard })),
  { loading: () => <Skeleton className="h-96" /> }
)

const AccountInfoCard = dynamic(
  () => import('@/components/profile/personal-info' as any).then((mod) => ({ default: mod.AccountInfoCard })),
  { loading: () => <Skeleton className="h-64" /> }
)

const TenantMembershipsCard = dynamic(
  () => import('@/components/profile/tenant-memberships' as any).then((mod) => ({ default: mod.TenantMembershipsCard })),
  { loading: () => <Skeleton className="h-64" /> }
)

const SecurityCard = dynamic(
  () => import('@/components/profile/security-card' as any).then((mod) => ({ default: mod.SecurityCard })),
  { loading: () => <Skeleton className="h-96" /> }
)

const SessionsCard = dynamic(
  () => import('@/components/profile/sessions-card' as any).then((mod) => ({ default: mod.SessionsCard })),
  { loading: () => <Skeleton className="h-96" /> }
)

const NotificationsCard = dynamic(
  () => import('@/components/profile/notifications-card' as any).then((mod) => ({ default: mod.NotificationsCard })),
  { loading: () => <Skeleton className="h-96" /> }
)
const DeliveryPreferencesCard = dynamic(
  () => import('@/components/proactive-insights/delivery-preferences-card' as any).then((mod) => ({ default: mod.DeliveryPreferencesCard })),
  { loading: () => <Skeleton className="h-96" /> }
)

const ActivityCard = dynamic(
  () => import('@/components/profile/activity-card' as any).then((mod) => ({ default: mod.ActivityCard })),
  { loading: () => <Skeleton className="h-96" /> }
) as React.ComponentType<{ limit?: number; className?: string }>

export default function ProfilePage() {
  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header */}
      <div className="space-y-0.5">
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground">
          Manage your personal information, security, and preferences
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="sessions" className="gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Sessions</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Activity</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <PersonalInfoCard />
            <AccountInfoCard />
          </div>
          <TenantMembershipsCard />
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <SecurityCard />
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-6">
          <SessionsCard />
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <NotificationsCard />
          <DeliveryPreferencesCard />
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <ActivityCard limit={20} {...({} as any)} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
