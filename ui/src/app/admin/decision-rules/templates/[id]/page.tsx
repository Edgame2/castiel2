'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch, getApiBaseUrl, GENERIC_ERROR_MESSAGE } from '@/lib/api';

interface TemplateItem {
  name: string;
  description: string;
}

export default function DecisionRuleTemplateDetailPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';
  const name = decodeURIComponent(id);

  const [template, setTemplate] = useState<TemplateItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(() => {
    if (!getApiBaseUrl()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    apiFetch('/api/v1/decisions/templates')
      .then((r: Response) => {
        if (!r.ok) throw new Error(r.statusText || 'Failed to load');
        return r.json();
      })
      .then((data: { items?: TemplateItem[] }) => {
        const items = data.items ?? [];
        const found = items.find((t) => t.name === name) ?? null;
        setTemplate(found);
      })
      .catch(() => {
        setError(GENERIC_ERROR_MESSAGE);
        setTemplate(null);
      })
      .finally(() => setLoading(false));
  }, [name]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return (
    <div className="p-6">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Link href="/admin">Admin</Link><span>/</span>
          <Link href="/admin/decision-rules">Decision Rules</Link><span>/</span>
          <Link href="/admin/decision-rules/templates">Templates</Link><span>/</span>
          <span className="text-foreground">Template</span>
        </div>

        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{error}</p>}

        {!loading && !error && template && (
          <>
            <h1 className="text-xl font-semibold mb-4">{template.name}</h1>
            <div className="border rounded-lg p-6 dark:border-gray-700 space-y-2">
              <p><span className="text-gray-500">Name:</span> {template.name}</p>
              <p><span className="text-gray-500">Description:</span> {template.description}</p>
              <div className="mt-4">
                <Link href="/admin/decision-rules/rules/new" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                  Create rule from this template →
                </Link>
              </div>
            </div>
          </>
        )}

        {!loading && !error && !template && (
          <p className="text-sm text-gray-500">Template not found.</p>
        )}
        <p className="mt-4"><Link href="/admin/decision-rules/templates" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Templates</Link></p>
      </div>
    </div>
  );
}
