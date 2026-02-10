/**
 * Account detail — GET /api/v1/shards/:id (base), GET /api/v1/accounts/:id/health (health).
 * Loading and error states; no mock data.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AccountHealthCard } from '@/components/account/AccountHealthCard';
import { apiFetch, getApiBaseUrl, GENERIC_ERROR_MESSAGE } from '@/lib/api';

interface ShardItem {
  id: string;
  structuredData?: Record<string, unknown>;
}

interface HealthResponse {
  healthScore?: number;
  trendDirection?: 'improving' | 'stable' | 'degrading';
  criticalOpportunities?: string[];
  lastUpdated?: string;
}

function getAccountName(shard: ShardItem | null): string {
  if (!shard?.structuredData) return '';
  const sd = shard.structuredData;
  if (typeof sd.Name === 'string') return sd.Name;
  if (typeof sd.name === 'string') return sd.name;
  return shard.id;
}

export default function AccountDetailPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';
  const [shard, setShard] = useState<ShardItem | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    const base = getApiBaseUrl();
    if (!base) {
      setLoading(false);
      setError('API base URL not configured');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [shardRes, healthRes] = await Promise.all([
        apiFetch(`/api/v1/shards/${id}`),
        apiFetch(`/api/v1/accounts/${id}/health`),
      ]);
      if (shardRes.ok) {
        const shardData: ShardItem = await shardRes.json();
        setShard(shardData);
      } else {
        setShard(null);
      }
      if (healthRes.ok) {
        const healthData: HealthResponse = await healthRes.json();
        setHealth(healthData);
      } else {
        setHealth(null);
      }
      if (!shardRes.ok && !healthRes.ok) setError('Account not found');
    } catch (e) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') console.error(e);
      setError(GENERIC_ERROR_MESSAGE);
      setShard(null);
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (id) document.title = `Account ${getAccountName(shard) || id} | Castiel`;
    return () => { document.title = 'Castiel'; };
  }, [id, shard]);

  if (loading) {
    return (
      <div className="p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-24 w-64" />
      </div>
    );
  }

  if (error && !shard && !health) {
    return (
      <div className="p-6">
        <p className="text-destructive mb-4" role="alert">
          {error}
        </p>
        <Link href="/accounts">
          <Button variant="outline">Back to accounts</Button>
        </Link>
      </div>
    );
  }

  const name = getAccountName(shard) || id;

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/accounts" className="text-sm font-medium hover:underline">
          ← Accounts
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">Account {name}</h1>
      <p className="text-muted-foreground mb-6">
        Account health and critical opportunities.
      </p>
      {health != null && (
        <div className="max-w-sm">
          <AccountHealthCard
            healthScore={health.healthScore ?? 0}
            trend={health.trendDirection}
            criticalOpportunities={health.criticalOpportunities ?? []}
            lastUpdated={health.lastUpdated}
            title="Account health"
          />
        </div>
      )}
      {health == null && !loading && (
        <p className="text-muted-foreground">No health data yet. Run the account-health batch job to populate.</p>
      )}
      <div className="mt-6">
        <Link href="/accounts">
          <Button variant="outline">Back to accounts</Button>
        </Link>
      </div>
    </div>
  );
}
