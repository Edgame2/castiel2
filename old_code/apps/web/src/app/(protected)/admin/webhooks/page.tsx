"use client"

import dynamic from 'next/dynamic'
import { useTranslation } from 'react-i18next'
import { Skeleton } from "@/components/ui/skeleton"

// Lazy load webhook list component
const WebhookList = dynamic(
  () => import("@/components/webhooks/webhook-list" as any).then(mod => ({ default: mod.WebhookList })),
  { loading: () => <Skeleton className="h-96" /> }
)

export default function WebhooksPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { t } = (useTranslation as any)('common')
  
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="space-y-0.5">
        <h2 className="text-3xl font-bold tracking-tight">
          {t('admin.webhooks.title', 'Webhooks')}
        </h2>
        <p className="text-muted-foreground">
          {t('admin.webhooks.subtitle', 'Manage webhook integrations for real-time event notifications')}
        </p>
      </div>

      <WebhookList />
    </div>
  )
}
