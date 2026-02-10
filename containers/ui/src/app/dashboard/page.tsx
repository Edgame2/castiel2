/**
 * Dashboard landing — links to manager/executive/board; optional prioritized count from API.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, getApiBaseUrl } from '@/lib/api';

export default function DashboardPage() {
  const [prioritizedCount, setPrioritizedCount] = useState<number | null>(null);

  useEffect(() => {
    document.title = 'Dashboard | Castiel';
    if (!getApiBaseUrl()) return;
    apiFetch('/api/dashboard/api/v1/dashboards/manager/prioritized')
      .then((r) => r.ok ? r.json() : null)
      .then((data: { opportunities?: unknown[] } | null) => {
        if (data && Array.isArray(data.opportunities)) setPrioritizedCount(data.opportunities.length);
      })
      .catch(() => {});
    return () => { document.title = 'Castiel'; };
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
      <p className="text-muted-foreground mb-4">
        Manager and executive dashboard views.
      </p>
      {prioritizedCount !== null && prioritizedCount > 0 && (
        <p className="text-sm text-muted-foreground mb-4">
          {prioritizedCount} prioritized opportunity{prioritizedCount !== 1 ? 'ies' : ''} in Manager view.
        </p>
      )}
      <ul className="list-disc list-inside space-y-1">
        <li>
          <Link href="/dashboard/manager" className="hover:underline">
            Manager view
          </Link>
        </li>
        <li>
          <Link href="/dashboard/executive" className="hover:underline">
            Executive view
          </Link>
        </li>
        <li>
          <Link href="/dashboard/board" className="hover:underline">
            Board view
          </Link>
        </li>
        <li>
          <Link href="/opportunities" className="hover:underline">
            Opportunities
          </Link>
        </li>
        <li>
          <Link href="/accounts" className="hover:underline">
            Accounts
          </Link>
        </li>
        <li>
          <Link href="/contacts" className="hover:underline">
            Contacts
          </Link>
        </li>
        <li>
          <Link href="/products" className="hover:underline">
            Products
          </Link>
        </li>
      </ul>
    </div>
  );
}
