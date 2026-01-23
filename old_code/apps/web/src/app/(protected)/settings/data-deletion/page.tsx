"use client"

import Link from "next/link"
import { useTranslation } from "react-i18next"
import { DataDeletion } from "@/components/settings/data-deletion"

export default function DataDeletionPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { t } = (useTranslation as any)('settings')
  
  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2">
          <Link
            href="/settings"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t('backToSettings' as any)}
          </Link>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{t('dataDeletion.title' as any)}</h1>
        <p className="text-muted-foreground">
          {t('dataDeletion.subtitle' as any)}
        </p>
      </div>

      <DataDeletion />
    </div>
  )
}
