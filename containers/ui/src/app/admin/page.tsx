/**
 * Super Admin Dashboard
 * Overview page for Super Admin features
 */

'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function AdminPage() {
  useEffect(() => {
    document.title = 'Super Admin | Admin | Castiel';
    return () => {
      document.title = 'Admin | Castiel';
    };
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="text-sm font-medium hover:underline">
          ← Dashboard
        </Link>
        <span className="text-sm text-gray-500">/</span>
        <span className="text-sm font-medium">Admin</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Super Admin</h1>
          <p className="text-muted-foreground">
            System administration and configuration (Super Admin only)
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-4 py-2 border rounded dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
          title="Reload page"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Link
          href="/admin/integrations/catalog"
          className="rounded-lg border p-6 bg-white dark:bg-gray-900 hover:border-blue-500 transition-colors"
        >
          <h2 className="text-lg font-semibold mb-2">Integration Catalog</h2>
          <p className="text-sm text-gray-500">
            Manage integration catalog entries and types
          </p>
        </Link>

        <Link
          href="/admin/shard-types"
          className="rounded-lg border p-6 bg-white dark:bg-gray-900 hover:border-blue-500 transition-colors"
        >
          <h2 className="text-lg font-semibold mb-2">Shard Types</h2>
          <p className="text-sm text-gray-500">
            Manage shard type definitions and schemas
          </p>
        </Link>

        <Link
          href="/admin/system"
          className="rounded-lg border p-6 bg-white dark:bg-gray-900 hover:border-blue-500 transition-colors"
        >
          <h2 className="text-lg font-semibold mb-2">System Configuration</h2>
          <p className="text-sm text-gray-500">
            Overview, Performance, Data Lake, Logging, API Security; §8
          </p>
        </Link>

        <Link
          href="/admin/tenant-ml-config"
          className="rounded-lg border p-6 bg-white dark:bg-gray-900 hover:border-blue-500 transition-colors"
        >
          <h2 className="text-lg font-semibold mb-2">Tenant ML Config</h2>
          <p className="text-sm text-gray-500">
            Risk tolerance, decision preferences, model preferences (current tenant)
          </p>
        </Link>

        <Link
          href="/admin/cais"
          className="rounded-lg border p-6 bg-white dark:bg-gray-900 hover:border-blue-500 transition-colors"
        >
          <h2 className="text-lg font-semibold mb-2">CAIS</h2>
          <p className="text-sm text-gray-500">
            Weights and model selection per tenant; outcome sync and automatic learning toggles
          </p>
        </Link>

        <Link
          href="/admin/sales-methodology"
          className="rounded-lg border p-6 bg-white dark:bg-gray-900 hover:border-blue-500 transition-colors"
        >
          <h2 className="text-lg font-semibold mb-2">Sales Methodology</h2>
          <p className="text-sm text-gray-500">
            Overview, Current tenant config, MEDDIC mapper; §3
          </p>
        </Link>

        <Link
          href="/admin/risk-catalog"
          className="rounded-lg border p-6 bg-white dark:bg-gray-900 hover:border-blue-500 transition-colors"
        >
          <h2 className="text-lg font-semibold mb-2">Risk Catalog</h2>
          <p className="text-sm text-gray-500">
            Tenant catalog view: categories, templates, industry and methodology risks
          </p>
        </Link>

        <Link
          href="/admin/feedback"
          className="rounded-lg border p-6 bg-white dark:bg-gray-900 hover:border-blue-500 transition-colors"
        >
          <h2 className="text-lg font-semibold mb-2">Feedback System</h2>
          <p className="text-sm text-gray-500">
            Feedback Types, Global Settings, aggregation; per-tenant config via Tenant Management (§1)
          </p>
        </Link>

        <Link
          href="/admin/decision-rules"
          className="rounded-lg border p-6 bg-white dark:bg-gray-900 hover:border-blue-500 transition-colors"
        >
          <h2 className="text-lg font-semibold mb-2">Decision Rules</h2>
          <p className="text-sm text-gray-500">
            Overview, Rules, Templates, Conflicts; §6
          </p>
        </Link>

        <Link
          href="/admin/action-catalog"
          className="rounded-lg border p-6 bg-white dark:bg-gray-900 hover:border-blue-500 transition-colors"
        >
          <h2 className="text-lg font-semibold mb-2">Action Catalog</h2>
          <p className="text-sm text-gray-500">
            Entries, Categories, Relationships (risks and recommendations); §2
          </p>
        </Link>

        <Link
          href="/admin/ml-models"
          className="rounded-lg border p-6 bg-white dark:bg-gray-900 hover:border-blue-500 transition-colors"
        >
          <h2 className="text-lg font-semibold mb-2">ML Models</h2>
          <p className="text-sm text-gray-500">
            Overview, Models & health, Endpoints, Features, Monitoring; §4
          </p>
        </Link>

        <Link
          href="/admin/feature-engineering"
          className="rounded-lg border p-6 bg-white dark:bg-gray-900 hover:border-blue-500 transition-colors"
        >
          <h2 className="text-lg font-semibold mb-2">Feature Engineering</h2>
          <p className="text-sm text-gray-500">
            Overview, Features, Versioning, Quality; §5
          </p>
        </Link>

        <Link
          href="/admin/tenants"
          className="rounded-lg border p-6 bg-white dark:bg-gray-900 hover:border-blue-500 transition-colors"
        >
          <h2 className="text-lg font-semibold mb-2">Tenant Management</h2>
          <p className="text-sm text-gray-500">
            Overview, Tenants list, Templates; §7
          </p>
        </Link>

        <Link
          href="/admin/analytics"
          className="rounded-lg border p-6 bg-white dark:bg-gray-900 hover:border-blue-500 transition-colors"
        >
          <h2 className="text-lg font-semibold mb-2">Analytics & Reporting</h2>
          <p className="text-sm text-gray-500">
            Overview, Dashboards, Reports, Data Export; §9
          </p>
        </Link>

        <Link
          href="/admin/security"
          className="rounded-lg border p-6 bg-white dark:bg-gray-900 hover:border-blue-500 transition-colors"
        >
          <h2 className="text-lg font-semibold mb-2">Security & Access Control</h2>
          <p className="text-sm text-gray-500">
            Overview, Roles, Users, API Keys, Audit Log; §10
          </p>
        </Link>

        <Link
          href="/admin/settings"
          className="rounded-lg border p-6 bg-white dark:bg-gray-900 hover:border-blue-500 transition-colors"
        >
          <h2 className="text-lg font-semibold mb-2">System Settings</h2>
          <p className="text-sm text-gray-500">
            Rate limits, capacity, queues, feature flags (integration-manager)
          </p>
        </Link>

        <Link
          href="/admin/monitoring"
          className="rounded-lg border p-6 bg-white dark:bg-gray-900 hover:border-blue-500 transition-colors"
        >
          <h2 className="text-lg font-semibold mb-2">Monitoring</h2>
          <p className="text-sm text-gray-500">
            System health, queues, processors, integrations
          </p>
        </Link>
      </div>
      <p className="mt-6 text-sm text-gray-500">
        Full screen list and UI spec: documentation/specifications/feedbacks and recommendations/SUPER_ADMIN_CONFIGURATION_REQUIREMENTS.md (§1–§10). Placeholder sub-pages and builders (e.g. feedback type create/edit, catalog entry builder, rule builder) are implemented incrementally per spec.
      </p>
    </div>
  );
}
