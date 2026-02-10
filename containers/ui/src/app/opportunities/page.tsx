/**
 * Opportunities list — GET /api/v1/shards?shardTypeName=c_opportunity.
 * Data table: first column clickable → /opportunities/[id]; Actions: View.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch, getApiBaseUrl, GENERIC_ERROR_MESSAGE } from '@/lib/api';

interface ShardItem {
  id: string;
  shardTypeName?: string;
  structuredData?: Record<string, unknown>;
  createdAt?: string;
  status?: string;
}

interface ListResponse {
  items?: ShardItem[];
  continuationToken?: string;
}

function getOpportunityDisplayName(row: ShardItem): string {
  const sd = row.structuredData;
  if (sd && typeof sd.Name === 'string') return sd.Name;
  if (sd && typeof sd.name === 'string') return sd.name;
  if (sd && (sd.Amount != null || sd.amount != null)) return `Opportunity ${row.id.slice(0, 8)}`;
  return row.id;
}

function getAmount(sd: Record<string, unknown> | undefined): string {
  if (!sd) return '—';
  const v = sd.Amount ?? sd.amount;
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return v;
  return '—';
}

function getStageName(sd: Record<string, unknown> | undefined): string {
  if (!sd) return '—';
  const v = sd.StageName ?? sd.stageName;
  return typeof v === 'string' ? v : '—';
}

export default function OpportunitiesListPage() {
  const [items, setItems] = useState<ShardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchOpportunities = useCallback(async () => {
    const base = getApiBaseUrl();
    if (!base) {
      setLoading(false);
      setError('API base URL not configured');
      return;
    }
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set('shardTypeName', 'c_opportunity');
    params.set('limit', '100');
    try {
      const res = await apiFetch(`/api/v1/shards?${params.toString()}`);
      if (!res.ok) throw new Error(res.statusText || 'Failed to load opportunities');
      const data: ListResponse = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') console.error(e);
      setError(GENERIC_ERROR_MESSAGE);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  useEffect(() => {
    document.title = 'Opportunities | Castiel';
    return () => { document.title = 'Castiel'; };
  }, []);

  const filtered = items.filter((row) => {
    const name = getOpportunityDisplayName(row).toLowerCase();
    const id = row.id.toLowerCase();
    const stage = getStageName(row.structuredData).toLowerCase();
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return name.includes(q) || id.includes(q) || stage.includes(q);
  });

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Opportunities</h1>
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Opportunities</h1>
        <Link href="/dashboard">
          <Button variant="outline" size="sm">Dashboard</Button>
        </Link>
      </div>

      {error && (
        <p className="text-sm text-destructive mb-4" role="alert">
          {error}
        </p>
      )}

      <div className="mb-4">
        <Input
          placeholder="Search by name, ID, or stage..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
          aria-label="Search opportunities"
        />
      </div>

      {!error && filtered.length === 0 && (
        <p className="text-muted-foreground">No opportunities found.</p>
      )}

      {!error && filtered.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Link
                    href={`/opportunities/${row.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {getOpportunityDisplayName(row)}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{getStageName(row.structuredData)}</TableCell>
                <TableCell>{getAmount(row.structuredData)}</TableCell>
                <TableCell>{row.status ?? '—'}</TableCell>
                <TableCell className="text-right">
                  <Link href={`/opportunities/${row.id}`}>
                    <Button variant="ghost" size="sm">View</Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
