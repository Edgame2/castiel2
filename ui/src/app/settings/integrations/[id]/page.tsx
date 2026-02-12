/**
 * Integration detail — single page for health, sync, and field-mappings.
 * UI inventory §3.10: "Integration detail (health + sync + field-mappings on one page)".
 * Sub-routes remain for full UIs; this page is the entry point with links to each.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, getApiBaseUrl, GENERIC_ERROR_MESSAGE } from '@/lib/api';

interface Integration {
  id: string;
  name?: string;
  integrationType?: string;
  status?: string;
  connectionStatus?: string;
}

const SECTIONS = [
  {
    href: 'health',
    title: 'Health & monitoring',
    description: 'View health status, sync history, errors, data quality, and performance.',
  },
  {
    href: 'sync',
    title: 'Sync configuration',
    description: 'Configure sync schedule, entities, direction, and filters.',
  },
  {
    href: 'field-mappings',
    title: 'Field mappings',
    description: 'Map external fields to internal fields and configure transforms.',
  },
] as const;

export default function IntegrationDetailPage() {
  const params = useParams();
  const integrationId = params.id as string;
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIntegration = useCallback(async () => {
    if (!getApiBaseUrl()) {
      setLoading(false);
      setError(GENERIC_ERROR_MESSAGE);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/v1/integrations/${encodeURIComponent(integrationId)}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || (j?.error as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setIntegration(json);
    } catch {
      setError(GENERIC_ERROR_MESSAGE);
    } finally {
      setLoading(false);
    }
  }, [integrationId]);

  useEffect(() => {
    fetchIntegration();
  }, [fetchIntegration]);

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Loading integration…</p>
      </div>
    );
  }

  if (error || !integration) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <p className="text-sm text-red-600 dark:text-red-400 mb-2">{error ?? 'Integration not found'}</p>
          <Link href="/settings/integrations" className="text-sm font-medium text-blue-600 hover:text-blue-700 underline">
            Back to integrations
          </Link>
        </div>
      </div>
    );
  }

  const name = integration.name ?? integration.integrationType ?? integrationId;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-2">
        <Link href="/settings/integrations" className="text-sm font-medium hover:underline">
          Integrations
        </Link>
        <span className="text-sm text-gray-500">/</span>
        <span className="text-sm font-medium">{name}</span>
      </div>
      <h1 className="text-2xl font-bold mb-2">{name}</h1>
      {integration.integrationType && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{integration.integrationType}</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SECTIONS.map(({ href, title, description }) => (
          <Link
            key={href}
            href={`/settings/integrations/${integrationId}/${href}`}
            className="rounded-lg border border-gray-200 dark:border-gray-700 p-5 bg-white dark:bg-gray-900 hover:border-blue-500 dark:hover:border-blue-500 transition-colors block"
          >
            <h2 className="text-lg font-semibold mb-2">{title}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
            <span className="inline-block mt-2 text-sm font-medium text-blue-600 dark:text-blue-400">Open →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
