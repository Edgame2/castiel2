"use client"

import dynamic from 'next/dynamic'
import { useTranslation } from 'react-i18next'
import { Skeleton } from "@/components/ui/skeleton"

// Lazy load migration list component
const MigrationList = dynamic(
  () => import("@/components/schema-migrations/migration-list" as any).then(mod => ({ default: mod.MigrationList })),
  { loading: () => <Skeleton className="h-96" /> }
)

export default function SchemaMigrationsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { t } = (useTranslation as any)('common')
  
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="space-y-0.5">
        <h2 className="text-3xl font-bold tracking-tight">
          {t('admin.schemaMigrations.title', 'Schema Migrations')}
        </h2>
        <p className="text-muted-foreground">
          {t('admin.schemaMigrations.subtitle', 'Manage schema versions and data transformations for shard types')}
        </p>
      </div>

      <MigrationList />
    </div>
  )
}
