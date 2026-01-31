/**
 * Super Admin: API security configuration (W11 §8.4)
 * Rate limits, CORS, and API auth are per-service/gateway via config; distinct from Security area 10 (roles, users, API keys, audit).
 */

'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function SystemApiSecurityPage() {
  useEffect(() => {
    document.title = 'API Security | Admin | Castiel';
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
        <Link href="/admin/system" className="text-sm font-medium hover:underline">System Configuration</Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">API Security Configuration</h1>
      <p className="text-muted-foreground mb-4">
        System-level rate limits, CORS, and API authentication (§8.4). Roles, users, API keys, and audit are under Security & Access Control.
      </p>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <Link href="/admin/system" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Overview</Link>
        <Link href="/admin/system/performance" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Performance</Link>
        <Link href="/admin/system/data-lake" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Data Lake</Link>
        <Link href="/admin/system/logging" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Logging</Link>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">API Security</span>
      </nav>
      <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-lg font-semibold">API Security (§8.4)</h2>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 text-sm font-medium rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
            aria-label="Refresh page"
          >
            Refresh
          </button>
        </div>
        <section>
          <h3 className="text-sm font-semibold mb-2">Configurable settings (§8.4)</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            System-level API security (rate limit, CORS, encryption, audit) is configured at the gateway or per-service via config and env. Configuration remains per-service; no central Super Admin API. When a central backend exists, this page will offer forms for rate limits, CORS, and audit retention (§8.4).
          </p>
          <ul className="list-none space-y-2" aria-label="API security settings">
            <li className="flex items-center gap-2 rounded border border-gray-200 dark:border-gray-700 p-3">
              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">Rate limits</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">Gateway: rate_limit.max, rate_limit.timeWindow (RATE_LIMIT_MAX, RATE_LIMIT_WINDOW); per-service in config</span>
            </li>
            <li className="flex items-center gap-2 rounded border border-gray-200 dark:border-gray-700 p-3">
              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">CORS</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">API gateway or per-service server; config/env per deployment</span>
            </li>
            <li className="flex items-center gap-2 rounded border border-gray-200 dark:border-gray-700 p-3">
              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">JWT / API authentication</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">Bearer JWT at gateway; service-to-service JWT with service identity; API keys under Admin → Security</span>
            </li>
          </ul>
        </section>
        <section>
          <h3 className="text-sm font-semibold mb-2">Rate limits</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            API gateway: <code className="rounded bg-gray-100 dark:bg-gray-800 px-1">rate_limit.max</code>, <code className="rounded bg-gray-100 dark:bg-gray-800 px-1">rate_limit.timeWindow</code> (env: <code className="rounded bg-gray-100 dark:bg-gray-800 px-1">RATE_LIMIT_MAX</code>, <code className="rounded bg-gray-100 dark:bg-gray-800 px-1">RATE_LIMIT_WINDOW</code>). Integration manager exposes system rate-limit settings. Logging and other services may have per-service rate_limit in config. No central Super Admin API to edit gateway limits yet.
          </p>
        </section>
        <section>
          <h3 className="text-sm font-semibold mb-2">CORS</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            CORS is configured at the API gateway or per-service server (config/env). Override per deployment; no central admin UI for CORS yet.
          </p>
        </section>
        <section>
          <h3 className="text-sm font-semibold mb-2">API authentication (system-level)</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Requests are authenticated via JWT (Bearer) at the gateway and validated by services. Service-to-service calls use JWT with service identity. API keys and role management are under Admin → Security (area 10).
          </p>
        </section>
        <Link href="/admin/system" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
          ← Back to System Configuration
        </Link>
      </div>
    </div>
  );
}
