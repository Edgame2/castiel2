'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, getApiBaseUrl, GENERIC_ERROR_MESSAGE } from '@/lib/api';

interface MethodologyCard {
  id: string;
  name: string;
  type: 'standard' | 'custom';
  description: string;
  stages: number;
  requiredFields: number;
  exitCriteria: number;
  tenantsUsing: number;
  activeOpportunities: number | null;
  avgComplianceScore: number | null;
}

export function MethodologyCardGrid() {
  const [cards, setCards] = useState<MethodologyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getApiBaseUrl()) {
      setError('NEXT_PUBLIC_API_BASE_URL is not set');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiFetch('/api/v1/sales-methodology/templates')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: MethodologyCard[]) => {
        if (!cancelled) setCards(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setError(GENERIC_ERROR_MESSAGE);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!getApiBaseUrl()) {
    return (
      <p className="text-sm text-amber-800 dark:text-amber-200">
        Set NEXT_PUBLIC_API_BASE_URL to the API gateway URL to load methodologies.
      </p>
    );
  }
  if (loading) {
    return <p className="text-sm text-gray-500">Loading methodologies…</p>;
  }
  if (error) {
    return <p className="text-sm text-red-600 dark:text-red-400">Failed to load: {error}</p>;
  }
  if (cards.length === 0) {
    return <p className="text-sm text-gray-500">No methodology templates available.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.id}
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{card.name}</h3>
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              {card.type}
            </span>
          </div>
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-400 line-clamp-3">{card.description}</p>
          <dl className="mb-3 grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <span>Stages: {card.stages}</span>
            <span>Required fields: {card.requiredFields}</span>
            <span>Exit criteria: {card.exitCriteria}</span>
            <span>Tenants using: {card.tenantsUsing}</span>
            {card.activeOpportunities != null && <span>Active opps: {card.activeOpportunities}</span>}
            {card.avgComplianceScore != null && (
              <span>Avg compliance: {(card.avgComplianceScore * 100).toFixed(0)}%</span>
            )}
          </dl>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/sales-methodology/config"
              className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              View
            </Link>
            <Link
              href={card.id === 'MEDDIC' || card.id === 'MEDDPICC' ? '/admin/sales-methodology/meddic' : '/admin/sales-methodology/config'}
              className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Edit
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
