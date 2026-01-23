"use client"

import dynamic from 'next/dynamic'
import { useTranslation } from 'react-i18next'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/contexts/auth-context"

// Lazy load heavy settings components
const OrganizationProfile = dynamic(
  () => import("@/components/settings/organization-profile" as any).then(mod => ({ default: mod.OrganizationProfile })),
  { loading: () => <Skeleton className="h-96" /> }
)
const FeatureFlags = dynamic(
  () => import("@/components/settings/feature-flags" as any).then(mod => ({ default: mod.FeatureFlags })),
  { loading: () => <Skeleton className="h-96" /> }
)
const ApiKeys = dynamic(
  () => import("@/components/settings/api-keys" as any).then(mod => ({ default: mod.ApiKeys })),
  { loading: () => <Skeleton className="h-96" /> }
)
const UsageStats = dynamic(
  () => import("@/components/settings/usage-stats" as any).then(mod => ({ default: mod.UsageStats })),
  { loading: () => <Skeleton className="h-96" /> }
)
const SSOConfiguration = dynamic(
  () => import("@/components/settings/sso-configuration" as any).then(mod => ({ default: mod.SSOConfiguration })),
  { loading: () => <Skeleton className="h-96" /> }
)
const CookiePreferencesSettings = dynamic(
  () => import("@/components/settings/cookie-preferences" as any).then(mod => ({ default: mod.CookiePreferencesSettings })),
  { loading: () => <Skeleton className="h-96" /> }
)
const DataPrivacySettings = dynamic(
  () => import("@/components/settings/data-privacy" as any).then(mod => ({ default: mod.DataPrivacySettings })),
  { loading: () => <Skeleton className="h-96" /> }
)
const TenantSecuritySettings = dynamic(
  () => import("@/components/tenants/security-settings" as any).then(mod => ({ default: mod.TenantSecuritySettings })),
  { loading: () => <Skeleton className="h-96" /> }
) as React.ComponentType<{ tenantId: string }>
const RedactionConfiguration = dynamic(
  () => import("@/components/settings/redaction-configuration" as any).then(mod => ({ default: mod.RedactionConfiguration })),
  { loading: () => <Skeleton className="h-96" /> }
)
const AISettingsComponent = dynamic(
  () => import("./ai/page" as any),
  { loading: () => <Skeleton className="h-96" /> }
)

export default function OrganizationSettingsPage() {
  const { user } = useAuth()
  const { t } = useTranslation(['settings', 'common'])
  const isAdmin = user?.roles?.includes('admin') || user?.roles?.includes('owner') || user?.roles?.includes('super-admin')

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="space-y-0.5">
        <h2 className="text-3xl font-bold tracking-tight">
          {t('settings:title' as any)}
        </h2>
        <p className="text-muted-foreground">
          {t('settings:subtitle' as any)}
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="profile">{t('settings:tabs.profile' as any)}</TabsTrigger>
          <TabsTrigger value="features">{t('settings:tabs.features' as any)}</TabsTrigger>
          {isAdmin && <TabsTrigger value="ai">AI</TabsTrigger>}
          <TabsTrigger value="api-keys">{t('settings:tabs.apiKeys' as any)}</TabsTrigger>
          <TabsTrigger value="usage">{t('settings:tabs.usage' as any)}</TabsTrigger>
          {isAdmin && <TabsTrigger value="security">{t('settings:tabs.security' as any)}</TabsTrigger>}
          {isAdmin && <TabsTrigger value="redaction">Redaction</TabsTrigger>}
          <TabsTrigger value="sso">{t('settings:tabs.sso' as any)}</TabsTrigger>
          <TabsTrigger value="privacy">{t('settings:tabs.privacy' as any)}</TabsTrigger>
          <TabsTrigger value="cookies">{t('settings:tabs.cookies' as any)}</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <OrganizationProfile />
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <FeatureFlags />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="ai" className="space-y-4">
            <AISettingsComponent />
          </TabsContent>
        )}

        <TabsContent value="api-keys" className="space-y-4">
          <ApiKeys />
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <UsageStats />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="security" className="space-y-4">
            <TenantSecuritySettings tenantId={user?.tenantId || ''} />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="redaction" className="space-y-4">
            <RedactionConfiguration />
          </TabsContent>
        )}

        <TabsContent value="sso" className="space-y-4">
          <SSOConfiguration />
        </TabsContent>

        <TabsContent value="privacy" className="space-y-4">
          <DataPrivacySettings />
        </TabsContent>

        <TabsContent value="cookies" className="space-y-4">
          <CookiePreferencesSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
