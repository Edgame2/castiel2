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
        <section>
          <h2 className="text-sm font-semibold mb-2">Rate limits</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            API gateway: <code className="rounded bg-gray-100 dark:bg-gray-800 px-1">rate_limit.max</code>, <code className="rounded bg-gray-100 dark:bg-gray-800 px-1">rate_limit.timeWindow</code> (env: <code className="rounded bg-gray-100 dark:bg-gray-800 px-1">RATE_LIMIT_MAX</code>, <code className="rounded bg-gray-100 dark:bg-gray-800 px-1">RATE_LIMIT_WINDOW</code>). Integration manager exposes system rate-limit settings. Logging and other services may have per-service rate_limit in config. No central Super Admin API to edit gateway limits yet.
          </p>
        </section>
        <section>
          <h2 className="text-sm font-semibold mb-2">CORS</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            CORS is configured at the API gateway or per-service server (config/env). Override per deployment; no central admin UI for CORS yet.
          </p>
        </section>
        <section>
          <h2 className="text-sm font-semibold mb-2">API authentication (system-level)</h2>
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
