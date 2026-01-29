/**
 * Super Admin: ML Models — Overview (§4)
 * Links to Models (health), Endpoints, Features, Monitoring (ml-service).
 */

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'ML Models',
};

export default function MLModelsOverviewPage() {
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
        <span className="text-sm font-medium">ML Models</span>
      </div>
      <h1 className="text-2xl font-bold mb-2">ML Models</h1>
      <p className="text-muted-foreground mb-4">
        Model/endpoint health, features, and monitoring for ml-service (Azure ML). Super Admin §4.
      </p>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">
          Overview
        </span>
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
        <Link
          href="/admin/ml-models/features"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Features
        </Link>
        <Link
          href="/admin/ml-models/monitoring"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Monitoring
        </Link>
      </nav>

      <div className="space-y-6">
        <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Models & health</h2>
            <Link
              href="/admin/ml-models/models"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View health →
            </Link>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Azure ML endpoint health (status, latency) via GET /api/v1/ml/models/health. Model list, detail, test, retrain, and A/B when backend supports full §4.1.
          </p>
        </section>
        <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Endpoints</h2>
            <Link
              href="/admin/ml-models/endpoints"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View endpoints →
            </Link>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Endpoint management and connectivity tests (§4.2). Currently covered by Models & health; dedicated endpoint table when available.
          </p>
        </section>
        <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Features</h2>
            <Link
              href="/admin/ml-models/features"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Feature store →
            </Link>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Feature versions and schema (ml-service Layer 2). Full feature store config at §4.3 when available; versions/schema in Feature Engineering.
          </p>
        </section>
        <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Monitoring</h2>
            <Link
              href="/admin/ml-models/monitoring"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Monitoring & alerts →
            </Link>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Model health dashboard, alert rules, drift (§4.4). Grafana/Prometheus runbooks in deployment/monitoring.
          </p>
        </section>
      </div>
    </div>
  );
}
