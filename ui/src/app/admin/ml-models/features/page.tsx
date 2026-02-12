/**
 * Super Admin: ML Models — Features (§4.3)
 * Links to Feature Engineering (versions, schema); full feature store when available.
 */

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function MLModelsFeaturesPage() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="text-sm font-medium hover:underline">
          ← Dashboard
        </Link>
        <span className="text-sm text-gray-500">/</span>
        <Link href="/admin" className="text-sm font-medium hover:underline">
          Admin
        </Link>
        <span className="text-sm text-gray-500">/</span>
        <Link href="/admin/ml-models" className="text-sm font-medium hover:underline">
          ML Models
        </Link>
        <span className="text-sm text-gray-500">/</span>
        <span className="text-sm font-medium">Features</span>
      </div>
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">Features</h1>
          <p className="text-muted-foreground">
            Feature versions and schema for ml-service Layer 2 (§4.3). Full feature store config when available.
          </p>
        </div>
        <Button type="button" variant="link" onClick={() => window.location.reload()} className="shrink-0" aria-label="Refresh ML features page">Refresh</Button>
      </div>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <Link
          href="/admin/ml-models"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Overview
        </Link>
        <Link
          href="/admin/ml-models/models"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Models & health
        </Link>
        <Link
          href="/admin/ml-models/endpoints"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Endpoints
        </Link>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">
          Features
        </span>
        <Link
          href="/admin/ml-models/monitoring"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Monitoring
        </Link>
      </nav>
      <div className="rounded-lg border bg-white dark:bg-gray-900 p-6">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Feature versions and schema (ml-service Layer 2) are managed in Feature Engineering. Full feature store (quality, drift, per-feature config) will appear when §4.3 APIs are available.
        </p>
        <Button asChild>
          <Link href="/admin/feature-engineering/features">Open Feature Engineering (Features) →</Link>
        </Button>
      </div>
    </div>
  );
}
