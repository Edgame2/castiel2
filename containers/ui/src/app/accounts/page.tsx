/**
 * Accounts list — GET /api/v1/shards?shardTypeName=c_account
 * Data table: first column (name/id) clickable → /accounts/[id]; Actions: View.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

function getAccountDisplayName(row: ShardItem): string {
  const sd = row.structuredData;
  if (sd && typeof sd.Name === 'string') return sd.Name;
  if (sd && typeof sd.name === 'string') return sd.name;
  return row.id;
}

export default function AccountsListPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<ShardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'id' | 'createdAt'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const fetchAccounts = useCallback(async () => {
    const base = getApiBaseUrl();
    if (!base) {
      setLoading(false);
      setError('API base URL not configured');
      return;
    }
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set('shardTypeName', 'c_account');
    params.set('limit', '100');
    try {
      const res = await apiFetch(`/api/v1/shards?${params.toString()}`);
      if (!res.ok) throw new Error(res.statusText || 'Failed to load accounts');
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
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    document.title = t('accounts.pageTitle');
    return () => { document.title = t('common.appName'); };
  }, [t]);

  const filtered = items.filter((row) => {
    const name = getAccountDisplayName(row).toLowerCase();
    const id = row.id.toLowerCase();
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return name.includes(q) || id.includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'name') {
      cmp = getAccountDisplayName(a).localeCompare(getAccountDisplayName(b), undefined, { sensitivity: 'base' });
    } else if (sortBy === 'id') {
      cmp = a.id.localeCompare(b.id);
    } else {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      cmp = ta - tb;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">{t('accounts.title')}</h1>
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
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
        <h1 className="text-2xl font-bold">{t('accounts.title')}</h1>
        <Link href="/dashboard">
          <Button variant="outline" size="sm">{t('nav.dashboard')}</Button>
        </Link>
      </div>

      {error && (
        <p className="text-sm text-destructive mb-4" role="alert">
          {error}
        </p>
      )}

      <div className="mb-4">
        <Input
          placeholder={t('accounts.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
          aria-label={t('accounts.searchAriaLabel')}
        />
      </div>

      <div className="flex gap-2 mb-2">
        <Button
          variant={sortBy === 'name' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => { setSortBy('name'); setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); }}
        >
          {t('accounts.sortName')} {sortDir === 'asc' ? '↑' : '↓'}
        </Button>
        <Button
          variant={sortBy === 'createdAt' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => { setSortBy('createdAt'); setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); }}
        >
          {t('accounts.sortCreated')} {sortDir === 'asc' ? '↑' : '↓'}
        </Button>
      </div>

      {!error && sorted.length === 0 && (
        <p className="text-muted-foreground">{t('accounts.noAccounts')}</p>
      )}

      {!error && sorted.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('accounts.tableName')}</TableHead>
              <TableHead>{t('accounts.tableId')}</TableHead>
              <TableHead>{t('accounts.tableStatus')}</TableHead>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Link
                    href={`/accounts/${row.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {getAccountDisplayName(row)}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{row.id}</TableCell>
                <TableCell>{row.status ?? '—'}</TableCell>
                <TableCell className="text-right">
                  <Link href={`/accounts/${row.id}`}>
                    <Button variant="ghost" size="sm">{t('view')}</Button>
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
