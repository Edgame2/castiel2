"use client"

import { Database, Lock, Unlock, Users } from "lucide-react"
import { useTranslation } from "react-i18next"
import { StatsCard } from "@/components/dashboard/stats-card"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { RecentShards } from "@/components/dashboard/recent-shards"
import { MyShardTypes } from "@/components/dashboard/my-shard-types"
import { MembershipSummary } from "@/components/dashboard/membership-summary"
import { useDashboardStats } from "@/hooks/use-dashboard"
import { useAuth } from "@/contexts/auth-context"

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats()
  const { user } = useAuth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { t } = useTranslation(['dashboard', 'common']) as any

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('dashboard:title' as any)}</h1>
          <p className="text-muted-foreground">
            {t('dashboard:welcome', { name: user?.name || 'User' })}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t('dashboard:stats.totalShards' as any)}
          value={stats?.totalShards ?? 0}
          description={`${stats?.recentActivity?.shardsCreatedToday ?? 0} ${t('common:createdAt' as any).toLowerCase()}`}
          icon={Database}
          trend={
            stats?.trends?.shards
              ? {
                value: stats.trends.shards,
                isPositive: stats.trends.shards > 0,
              }
              : undefined
          }
          isLoading={isLoading}
        />
        <StatsCard
          title={t('shards:visibility.public', { ns: 'shards' })}
          value={stats?.publicShards ?? 0}
          description={t('common:viewAll' as any)}
          icon={Unlock}
          isLoading={isLoading}
        />
        <StatsCard
          title={t('shards:visibility.private', { ns: 'shards' })}
          value={stats?.privateShards ?? 0}
          description={t('common:viewAll' as any)}
          icon={Lock}
          isLoading={isLoading}
        />
        <StatsCard
          title={t('dashboard:stats.activeUsers' as any)}
          value={stats?.totalUsers ?? 0}
          description={t('common:active' as any)}
          icon={Users}
          trend={
            stats?.trends?.users
              ? {
                value: stats.trends.users,
                isPositive: stats.trends.users > 0,
              }
              : undefined
          }
          isLoading={isLoading}
        />
      </div>

      <MembershipSummary />

      <div className="grid gap-6 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <ActivityFeed />
        </div>
        <div className="lg:col-span-3 space-y-6">
          <QuickActions />
          <MyShardTypes />
          <RecentShards />
        </div>
      </div>
    </div>
  )
}
