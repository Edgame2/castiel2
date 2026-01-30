/**
 * Super Admin: Feature Engineering — Overview (§5)
 * Features, versioning, quality monitoring (ml-service Layer 2).
 */

'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function FeatureEngineeringOverviewPage() {
  useEffect(() => {
    document.title = 'Feature Engineering | Admin | Castiel';
    return () => {
      document.title = 'Admin | Castiel';
    };
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="text-sm font-medium hover:underline">← Dashboard</Link>
        <span className="text-sm text-gray-500">/</span>
        <Link href="/admin" className="text-sm font-medium hover:underline">Admin</Link>
        <span className="text-sm text-gray-500">/</span>
        <span className="text-sm font-medium">Feature Engineering</span>
      </div>
      <h1 className="text-2xl font-bold mb-2">Feature Engineering</h1>
      <p className="text-muted-foreground mb-4">
        Feature management, versioning, and quality monitoring for ml-service Layer 2. Super Admin §5.
      </p>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">
          Overview
        </span>
        <Link
          href="/admin/feature-engineering/features"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Features
        </Link>
        <Link
          href="/admin/feature-engineering/versioning"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Versioning
        </Link>
        <Link
          href="/admin/feature-engineering/quality"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Quality
        </Link>
      </nav>

      <div className="space-y-6">
        <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Features</h2>
            <Link
              href="/admin/feature-engineering/features"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View features →
            </Link>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Feature versions and schema (GET /api/v1/ml/features/versions, /schema) for ml-service Layer 2. §5.1, §4.3.
          </p>
        </section>
        <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Versioning</h2>
            <Link
              href="/admin/feature-engineering/versioning"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Version history & policy →
            </Link>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Version history, version policy (semantic/timestamp/hash), backward compatibility, deprecation. §5.2.
          </p>
        </section>
        <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Quality</h2>
            <Link
              href="/admin/feature-engineering/quality"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Quality dashboard & rules →
            </Link>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Quality dashboard (missing rate, outliers, drift), quality rules per feature. §5.3.
          </p>
        </section>
      </div>
    </div>
  );
}
