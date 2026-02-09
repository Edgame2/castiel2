/**
 * Super Admin: Audit log (W11 §10.4)
 * GET /api/logging/api/v1/logs (list), POST /api/logging/api/v1/export (create export) via gateway.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const AUDIT_PAGE_TITLE = 'Audit | Admin | Castiel';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

type LogCategory = 'ACTION' | 'ACCESS' | 'SECURITY' | 'SYSTEM' | 'CUSTOM';
type LogSeverity = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

interface AuditLogRow {
  id: string;
  timestamp?: string;
  userId?: string | null;
  action?: string;
  category?: LogCategory;
  severity?: LogSeverity;
  resourceType?: string | null;
  resourceId?: string | null;
  message?: string;
  ipAddress?: string | null;
  source?: string;
}

interface LogsResponse {
  data?: AuditLogRow[];
  pagination?: { total: number; limit: number; offset: number; hasMore: boolean };
}

const CATEGORIES: LogCategory[] = ['ACTION', 'ACCESS', 'SECURITY', 'SYSTEM', 'CUSTOM'];
const SEVERITIES: LogSeverity[] = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'];
const LIMIT = 50;

export default function SecurityAuditPage() {
  const [items, setItems] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [userId, setUserId] = useState('');
  const [action, setAction] = useState('');
  const [category, setCategory] = useState<LogCategory | ''>('');
  const [severity, setSeverity] = useState<LogSeverity | ''>('');
  const [resourceType, setResourceType] = useState('');
  const [exportJobId, setExportJobId] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    document.title = AUDIT_PAGE_TITLE;
    return () => {
      document.title = 'Admin | Castiel';
    };
  }, []);

  const fetchLogs = useCallback(async (overrideOffset?: number) => {
    if (!apiBaseUrl) return;
    const currentOffset = overrideOffset !== undefined ? overrideOffset : offsetRef.current;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(LIMIT));
      params.set('offset', String(currentOffset));
      params.set('sortBy', 'timestamp');
      params.set('sortOrder', sortOrder);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (userId) params.set('userId', userId);
      if (action) params.set('action', action);
      if (category) params.set('category', category);
      if (severity) params.set('severity', severity);
      if (resourceType) params.set('resourceType', resourceType);
      const res = await fetch(`${apiBaseUrl}/api/logging/api/v1/logs?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: LogsResponse = await res.json();
      setItems(Array.isArray(json?.data) ? json.data : []);
      const p = json?.pagination;
      if (p) {
        setTotal(p.total);
        setHasMore(Boolean(p.hasMore));
      } else {
        setTotal((json?.data?.length ?? 0));
        setHasMore(false);
      }
      if (overrideOffset !== undefined) {
        offsetRef.current = overrideOffset;
        setOffset(overrideOffset);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setItems([]);
      setTotal(0);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, startDate, endDate, userId, action, category, severity, resourceType, sortOrder]);

  const offsetRef = useRef(0);
  offsetRef.current = offset;

  useEffect(() => {
    offsetRef.current = 0;
    setOffset(0);
  }, [sortOrder]);

  useEffect(() => {
    if (apiBaseUrl) fetchLogs(offsetRef.current);
    else {
      setError('NEXT_PUBLIC_API_BASE_URL is not set');
      setLoading(false);
    }
  }, [apiBaseUrl, fetchLogs]);

  const handleExport = useCallback(async () => {
    if (!apiBaseUrl) return;
    setExportError(null);
    setExportJobId(null);
    try {
      const body: { format: 'CSV' | 'JSON'; filters?: Record<string, string> } = { format: 'CSV' };
      if (startDate || endDate || userId || action || category || severity) {
        body.filters = {};
        if (startDate) body.filters.startDate = startDate;
        if (endDate) body.filters.endDate = endDate;
        if (userId) body.filters.userId = userId;
        if (action) body.filters.action = action;
        if (category) body.filters.category = category;
        if (severity) body.filters.severity = severity;
      }
      const res = await fetch(`${apiBaseUrl}/api/logging/api/v1/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const job = await res.json();
      setExportJobId(job?.id ?? job?.exportId ?? 'unknown');
    } catch (e) {
      setExportError(e instanceof Error ? e.message : String(e));
    }
  }, [startDate, endDate, userId, action, category, severity]);

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="text-sm font-medium hover:underline">← Dashboard</Link>
        <span className="text-sm text-gray-500">/</span>
        <Link href="/admin" className="text-sm font-medium hover:underline">Admin</Link>
        <span className="text-sm text-gray-500">/</span>
        <Link href="/admin/security" className="text-sm font-medium hover:underline">Security & Access Control</Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">Audit Log</h1>
      <p className="text-muted-foreground mb-4">
        Searchable audit log (date range, user, action, resource). Data from logging service via gateway (§10.4).
      </p>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <Link href="/admin/security" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Overview</Link>
        <Link href="/admin/security/roles" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Roles</Link>
        <Link href="/admin/security/users" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Users</Link>
        <Link href="/admin/security/api-keys" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">API Keys</Link>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">Audit Log</span>
      </nav>

      {!apiBaseUrl && (
        <div className="rounded-lg border p-6 bg-amber-50 dark:bg-amber-900/20 mb-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">Set NEXT_PUBLIC_API_BASE_URL to the API gateway URL.</p>
        </div>
      )}

      {apiBaseUrl && (
        <>
          <div className="rounded-lg border bg-white dark:bg-gray-900 p-4 mb-4">
            <h2 className="text-sm font-semibold mb-3">Filters</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <Label className="block font-medium mb-1">Start date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-8" />
              </div>
              <div>
                <Label className="block font-medium mb-1">End date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-8" />
              </div>
              <div>
                <Label className="block font-medium mb-1">User ID</Label>
                <Input type="text" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="Optional" className="w-full h-8" />
              </div>
              <div>
                <Label className="block font-medium mb-1">Action</Label>
                <Input type="text" value={action} onChange={(e) => setAction(e.target.value)} placeholder="Optional" className="w-full h-8" />
              </div>
              <div>
                <Label className="block font-medium mb-1">Category</Label>
                <Select value={category || '_all'} onValueChange={(v) => setCategory(v === '_all' ? '' : (v as LogCategory))}>
                  <SelectTrigger className="w-full h-8">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">All</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="block font-medium mb-1">Severity</Label>
                <Select value={severity || '_all'} onValueChange={(v) => setSeverity(v === '_all' ? '' : (v as LogSeverity))}>
                  <SelectTrigger className="w-full h-8">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">All</SelectItem>
                    {SEVERITIES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="block font-medium mb-1">Resource type</Label>
                <Input type="text" value={resourceType} onChange={(e) => setResourceType(e.target.value)} placeholder="Optional" className="w-full h-8" />
              </div>
              <div>
                <Label className="block font-medium mb-1">Sort order (§10.4)</Label>
                <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as 'asc' | 'desc')}>
                  <SelectTrigger className="w-full h-8" aria-label="Sort order">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Newest first</SelectItem>
                    <SelectItem value="asc">Oldest first</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button type="button" onClick={() => fetchLogs(0)} aria-label="Apply filters and load first page">Apply</Button>
              <Button type="button" variant="outline" onClick={() => fetchLogs(offset)} disabled={loading} title="Refetch current page" aria-label="Refresh audit log page">Refresh</Button>
              <Button type="button" variant="outline" onClick={handleExport} aria-label="Request CSV export of audit logs">Request CSV export</Button>
            </div>
            {exportJobId && <p className="text-sm text-green-600 dark:text-green-400 mt-2">Export job created: {exportJobId}. Check status at GET /api/v1/export/{exportJobId}</p>}
            {exportError && <p className="text-sm text-red-600 dark:text-red-400 mt-2">Export error: {exportError}</p>}
          </div>

          {loading && <div className="rounded-lg border p-6 bg-white dark:bg-gray-900"><p className="text-sm text-gray-500">Loading…</p></div>}
          {error && <div className="rounded-lg border p-6 bg-white dark:bg-gray-900 mb-4"><p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p></div>}

          {!loading && !error && (
            <div className="rounded-lg border bg-white dark:bg-gray-900 p-6">
              <h2 className="text-lg font-semibold mb-3">Logs (total: {total})</h2>
              {items.length === 0 ? (
                <p className="text-sm text-gray-500">No audit logs for the current filters.</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50 dark:bg-gray-800">
                          <th className="text-left py-2 px-4">Timestamp</th>
                          <th className="text-left py-2 px-4">User</th>
                          <th className="text-left py-2 px-4">Action</th>
                          <th className="text-left py-2 px-4">Resource</th>
                          <th className="text-left py-2 px-4">Details</th>
                          <th className="text-left py-2 px-4">IP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((row) => (
                          <tr key={row.id} className="border-b">
                            <td className="py-2 px-4">{row.timestamp ?? '—'}</td>
                            <td className="py-2 px-4">{row.userId ?? '—'}</td>
                            <td className="py-2 px-4">{row.action ?? '—'}</td>
                            <td className="py-2 px-4">{row.resourceType ?? '—'}{row.resourceId ? ` / ${row.resourceId}` : ''}</td>
                            <td className="py-2 px-4 max-w-xs truncate" title={row.message}>{row.message ?? '—'}</td>
                            <td className="py-2 px-4">{row.ipAddress ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-4 mt-3 text-sm">
                    <Button type="button" variant="outline" size="sm" disabled={offset === 0} onClick={() => fetchLogs(Math.max(0, offset - LIMIT))}>Prev</Button>
                    <span>Offset {offset} – {offset + items.length} of {total}</span>
                    <Button type="button" variant="outline" size="sm" disabled={!hasMore} onClick={() => fetchLogs(offset + LIMIT)}>Next</Button>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
