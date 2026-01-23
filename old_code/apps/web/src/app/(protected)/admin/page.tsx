"use client"

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, Webhook, Database, ArrowRight } from "lucide-react"

// Lazy load admin components (heavy and rarely accessed)
const PlatformStats = dynamic(
  () => import("@/components/admin/platform-stats" as any).then(mod => ({ default: mod.PlatformStats })),
  { loading: () => <Skeleton className="h-64" /> }
)
const TenantsList = dynamic(
  () => import("@/components/admin/tenants-list" as any).then(mod => ({ default: mod.TenantsList })),
  { loading: () => <Skeleton className="h-96" /> }
)
const SystemHealth = dynamic(
  () => import("@/components/admin/system-health" as any).then(mod => ({ default: mod.SystemHealth })),
  { loading: () => <Skeleton className="h-96" /> }
)
const SystemLogs = dynamic(
  () => import("@/components/admin/system-logs" as any).then(mod => ({ default: mod.SystemLogs })),
  { loading: () => <Skeleton className="h-96" /> }
)
const ConversationStats = dynamic(
  () => import("@/components/admin/conversation-stats" as any).then(mod => ({ default: mod.ConversationStats })),
  { loading: () => <Skeleton className="h-96" /> }
)

// Quick links for admin sections
const adminLinks = [
  {
    title: "AI Settings",
    description: "Manage AI models and system-wide AI configuration",
    href: "/admin/ai-settings",
    icon: Sparkles,
  },
  {
    title: "Intent Patterns",
    description: "Manage intent classification patterns for AI Insights",
    href: "/admin/intent-patterns",
    icon: Sparkles,
  },
  {
    title: "Webhooks",
    description: "Configure webhook endpoints and delivery settings",
    href: "/admin/webhooks",
    icon: Webhook,
  },
  {
    title: "Schema Migrations",
    description: "Manage shard type schema migrations",
    href: "/admin/schema-migrations",
    icon: Database,
  },
]

export default function AdminDashboard() {
  const { t } = useTranslation('common')
  
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="space-y-0.5">
        <h2 className="text-3xl font-bold tracking-tight">{t('admin.title', 'Super Admin')}</h2>
        <p className="text-muted-foreground">
          {t('admin.subtitle', 'Platform-wide administration and monitoring')}
        </p>
      </div>

      <PlatformStats />

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-3">
        {adminLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <link.icon className="h-5 w-5 text-primary" />
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-lg">{link.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{link.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Tabs defaultValue="tenants" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tenants">{t('admin.tabs.tenants', 'Tenants')}</TabsTrigger>
          <TabsTrigger value="conversations">{t('admin.tabs.conversations', 'Conversations')}</TabsTrigger>
          <TabsTrigger value="health">{t('admin.tabs.health', 'System Health')}</TabsTrigger>
          <TabsTrigger value="logs">{t('admin.tabs.logs', 'System Logs')}</TabsTrigger>
        </TabsList>

        <TabsContent value="tenants" className="space-y-4">
          <TenantsList />
        </TabsContent>

        <TabsContent value="conversations" className="space-y-4">
          <ConversationStats />
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <SystemHealth />
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <SystemLogs />
        </TabsContent>
      </Tabs>
    </div>
  )
}
