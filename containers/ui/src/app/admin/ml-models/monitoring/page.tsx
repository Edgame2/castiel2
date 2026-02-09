/**
 * Super Admin: ML Models — Monitoring (§4.4)
 * Model Health Dashboard (§4.4.1) from GET /api/v1/ml/endpoints. Alert config (§4.4.2) from GET /api/v1/ml/monitoring/alerts.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

interface EndpointItem {
  id: string;
  name: string;
  url: string;
  status: 'online' | 'offline' | 'degraded';
  latencyMs: number;
  models: string[];
  lastHealthCheck: string;
}

interface EndpointsResponse {
  items: EndpointItem[];
  timestamp: string;
}

interface AlertRuleItem {
  id?: string;
  name?: string;
  enabled?: boolean;
  metric?: string;
  operator?: string;
  threshold?: number;
  duration?: number;
  modelIds?: string[];
  severity?: string;
  throttleMinutes?: number;
}

const METRICS = ['accuracy', 'latency', 'error_rate', 'drift'];
const OPERATORS = ['>', '<', '=', '>=', '<='];
const SEVERITIES = ['critical', 'high', 'medium', 'low'];

type AlertFormOperator = '>' | '<' | '=' | '>=' | '<=';
type AlertFormSeverity = 'critical' | 'high' | 'medium' | 'low';

interface AlertFormState {
  name: string;
  metric: string;
  operator: AlertFormOperator;
  threshold: number;
  enabled: boolean;
  duration: number;
  severity: AlertFormSeverity;
  throttleMinutes: number;
}

const DEFAULT_ALERT_FORM: AlertFormState = {
  name: '',
  metric: 'accuracy',
  operator: '>',
  threshold: 0,
  enabled: true,
  duration: 60,
  severity: 'medium',
  throttleMinutes: 60,
};

export default function MLModelsMonitoringPage() {
  const [data, setData] = useState<EndpointsResponse | null>(null);
  const [alertsData, setAlertsData] = useState<AlertRuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateAlert, setShowCreateAlert] = useState(false);
  const [createForm, setCreateForm] = useState<AlertFormState>(DEFAULT_ALERT_FORM);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editAlert, setEditAlert] = useState<AlertRuleItem | null>(null);
  const [editForm, setEditForm] = useState<AlertFormState>(DEFAULT_ALERT_FORM);
  const [deleteAlert, setDeleteAlert] = useState<AlertRuleItem | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchEndpoints = useCallback(async () => {
    if (!apiBaseUrl) {
      setError('NEXT_PUBLIC_API_BASE_URL is not set');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [epRes, alRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/v1/ml/endpoints`, { credentials: 'include' }),
        fetch(`${apiBaseUrl}/api/v1/ml/monitoring/alerts`, { credentials: 'include' }),
      ]);
      if (!epRes.ok) {
        const j = await epRes.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${epRes.status}`);
      }
      const json = await epRes.json();
      setData(json);
      const alJson = alRes.ok ? await alRes.json() : { items: [] };
      setAlertsData(Array.isArray(alJson?.items) ? alJson.items : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setData(null);
      setAlertsData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEndpoints();
  }, [fetchEndpoints]);

  useEffect(() => {
    document.title = 'Monitoring | Admin | Castiel';
    return () => {
      document.title = 'Admin | Castiel';
    };
  }, []);

  const online = data?.items?.filter((i) => i.status === 'online').length ?? 0;
  const degraded = data?.items?.filter((i) => i.status === 'degraded').length ?? 0;
  const offline = data?.items?.filter((i) => i.status === 'offline').length ?? 0;

  const statusBadge = (status: EndpointItem['status']) => {
    const cls =
      status === 'online'
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
        : status === 'degraded'
          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    return <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${cls}`}>{status}</span>;
  };

  const closeCreateModal = () => {
    setShowCreateAlert(false);
    setCreateForm(DEFAULT_ALERT_FORM);
    setFormError(null);
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBaseUrl) return;
    const name = createForm.name.trim();
    if (!name) {
      setFormError('Name is required');
      return;
    }
    setFormSaving(true);
    setFormError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/ml/monitoring/alerts`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          metric: createForm.metric,
          operator: createForm.operator,
          threshold: Number(createForm.threshold),
          enabled: createForm.enabled,
          duration: createForm.duration,
          severity: createForm.severity,
          throttleMinutes: createForm.throttleMinutes,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      closeCreateModal();
      fetchEndpoints();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    } finally {
      setFormSaving(false);
    }
  };

  const closeEditModal = () => {
    setEditAlert(null);
    setEditForm(DEFAULT_ALERT_FORM);
    setFormError(null);
  };

  const openEdit = (a: AlertRuleItem) => {
    setEditAlert(a);
    const op = a.operator ?? '>';
    const sev = a.severity ?? 'medium';
    setEditForm({
      name: a.name ?? '',
      metric: a.metric ?? 'accuracy',
      operator: OPERATORS.includes(op) ? (op as AlertFormOperator) : '>',
      threshold: a.threshold ?? 0,
      enabled: a.enabled !== false,
      duration: a.duration ?? 60,
      severity: SEVERITIES.includes(sev) ? (sev as AlertFormSeverity) : 'medium',
      throttleMinutes: a.throttleMinutes ?? 60,
    });
    setFormError(null);
  };

  const handleEditAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBaseUrl || !editAlert?.id) return;
    const name = editForm.name.trim();
    if (!name) {
      setFormError('Name is required');
      return;
    }
    setFormSaving(true);
    setFormError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/ml/monitoring/alerts/${encodeURIComponent(editAlert.id)}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          metric: editForm.metric,
          operator: editForm.operator,
          threshold: Number(editForm.threshold),
          enabled: editForm.enabled,
          duration: editForm.duration,
          severity: editForm.severity,
          throttleMinutes: editForm.throttleMinutes,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      closeEditModal();
      fetchEndpoints();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    } finally {
      setFormSaving(false);
    }
  };

  const closeDeleteModal = () => {
    setDeleteAlert(null);
    setDeleteError(null);
  };

  const handleDeleteAlert = async () => {
    if (!apiBaseUrl || !deleteAlert?.id) return;
    setDeleteSaving(true);
    setDeleteError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/ml/monitoring/alerts/${encodeURIComponent(deleteAlert.id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      closeDeleteModal();
      fetchEndpoints();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeleteSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="text-sm font-medium hover:underline">
          ← Dashboard
        </Link>
        <span className="text-sm text-gray-500">/</span>
        <Link href="/admin" className="text-sm font-medium hover:underline">
          Admin
        </Link>
        <span className="text-sm text-gray-500">/</span>
        <Link href="/admin/ml-models" className="text-sm font-medium hover:underline">
          ML Models
        </Link>
        <span className="text-sm text-gray-500">/</span>
        <span className="text-sm font-medium">Monitoring</span>
      </div>
      <h1 className="text-2xl font-bold mb-2">Monitoring</h1>
      <p className="text-muted-foreground mb-4">
        Model health dashboard (§4.4.1). Endpoint status from ml-service. For accuracy trend, error rate, and drift use Grafana (ml-service dashboard) and deployment/monitoring runbooks. Alert rules (§4.4.2) when backend supports it.
      </p>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <Link
          href="/admin/ml-models"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Overview
        </Link>
        <Link
          href="/admin/ml-models/models"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Models & health
        </Link>
        <Link
          href="/admin/ml-models/endpoints"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Endpoints
        </Link>
        <Link
          href="/admin/ml-models/features"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Features
        </Link>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">
          Monitoring
        </span>
      </nav>

      {!apiBaseUrl && (
        <div className="rounded-lg border p-6 bg-amber-50 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-200">Set NEXT_PUBLIC_API_BASE_URL to the API gateway URL.</p>
        </div>
      )}

      {loading && (
        <div className="rounded-lg border p-6 bg-white dark:bg-gray-900">
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border p-6 bg-white dark:bg-gray-900 mb-4">
          <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
          <Button type="button" variant="link" size="sm" className="mt-2" onClick={fetchEndpoints}>
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="rounded-lg border bg-white dark:bg-gray-900 p-4 shadow-sm">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Online</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{online}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">endpoints healthy</p>
            </div>
            <div className="rounded-lg border bg-white dark:bg-gray-900 p-4 shadow-sm">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Degraded</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{degraded}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">high latency</p>
            </div>
            <div className="rounded-lg border bg-white dark:bg-gray-900 p-4 shadow-sm">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Offline</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{offline}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">unreachable</p>
            </div>
          </div>

          <div className="rounded-lg border bg-white dark:bg-gray-900 overflow-hidden mb-4">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Endpoint status</h2>
              <Button type="button" variant="link" size="sm" onClick={fetchEndpoints}>
                Refresh
              </Button>
            </div>
            {data.items.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">
                No endpoints configured. Add Azure ML endpoint URLs in ml-service config (azure_ml.endpoints) or via AZURE_ML_ENDPOINT_* environment variables.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Latency (ms)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {data.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">{item.name}</td>
                        <td className="px-4 py-2 text-sm">{statusBadge(item.status)}</td>
                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{item.latencyMs}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {data.items.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                Updated {data.timestamp ? new Date(data.timestamp).toLocaleString() : ''}.
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-white dark:bg-gray-900 overflow-hidden mb-4">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Alert configuration (§4.4.2)</h2>
              <Button type="button" size="sm" onClick={() => setShowCreateAlert(true)}>
                Create alert
              </Button>
            </div>
            {alertsData.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">
                No alert rules configured. Use &quot;Create alert&quot; to add a rule (metric, operator, threshold, severity).
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Metric</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Condition</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Severity</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Enabled</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {alertsData.map((a, i) => (
                      <tr key={a.id ?? i}>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">{a.name ?? '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{a.metric ?? '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                          {a.operator != null && a.threshold != null ? `${a.operator} ${a.threshold}` : '—'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{a.severity ?? '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{a.enabled === true ? 'Yes' : a.enabled === false ? 'No' : '—'}</td>
                        <td className="px-4 py-2 text-sm">
                          <Button type="button" variant="link" size="sm" className="mr-2 text-blue-600 dark:text-blue-400" onClick={() => openEdit(a)}>
                            Edit
                          </Button>
                          <Button type="button" variant="link" size="sm" className="text-destructive" onClick={() => setDeleteAlert(a)}>
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-gray-50 dark:bg-gray-800/50 p-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              For accuracy trend, latency distribution, error rate, and drift alerts use the{' '}
              <strong>Grafana ml-service dashboard</strong> (deployment/monitoring/grafana/dashboards/ml-service.json) and{' '}
              <strong>model-monitoring runbook</strong> (deployment/monitoring/runbooks/model-monitoring.md). Create, edit, and delete alert rules in the table above.
            </p>
          </div>

          {editAlert && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="edit-alert-title">
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                <h3 id="edit-alert-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Edit alert rule</h3>
                <form onSubmit={handleEditAlert} className="space-y-4">
                  {formError && (
                    <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
                  )}
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Accuracy drop" required className="text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label>Metric</Label>
                    <Select value={editForm.metric} onValueChange={(v) => setEditForm((f) => ({ ...f, metric: v }))}>
                      <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {METRICS.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                      <Label>Operator</Label>
                      <Select value={editForm.operator} onValueChange={(v) => setEditForm((f) => ({ ...f, operator: v as AlertFormOperator }))}>
                        <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {OPERATORS.map((o) => (
                            <SelectItem key={o} value={o}>{o}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label>Threshold</Label>
                      <Input type="number" step="any" value={editForm.threshold} onChange={(e) => setEditForm((f) => ({ ...f, threshold: Number(e.target.value) || 0 }))} className="text-sm" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Severity</Label>
                    <Select value={editForm.severity} onValueChange={(v) => setEditForm((f) => ({ ...f, severity: v as AlertFormSeverity }))}>
                      <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SEVERITIES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                      <Label>Duration (seconds)</Label>
                      <Input type="number" min={0} value={editForm.duration} onChange={(e) => setEditForm((f) => ({ ...f, duration: Number(e.target.value) || 0 }))} className="text-sm" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label>Throttle (minutes)</Label>
                      <Input type="number" min={0} value={editForm.throttleMinutes} onChange={(e) => setEditForm((f) => ({ ...f, throttleMinutes: Number(e.target.value) || 0 }))} className="text-sm" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="edit-alert-enabled" checked={editForm.enabled} onCheckedChange={(c) => setEditForm((f) => ({ ...f, enabled: !!c }))} />
                    <Label htmlFor="edit-alert-enabled" className="text-sm font-normal">Enabled</Label>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={closeEditModal}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={formSaving} size="sm">
                      {formSaving ? 'Saving…' : 'Save'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {deleteAlert && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="delete-alert-title">
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                <h3 id="delete-alert-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Delete alert rule</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Delete &quot;{deleteAlert.name ?? deleteAlert.id}&quot;? This cannot be undone.
                </p>
                {deleteError && (
                  <p className="text-sm text-red-600 dark:text-red-400 mb-4">{deleteError}</p>
                )}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={closeDeleteModal}>
                    Cancel
                  </Button>
                  <Button type="button" variant="destructive" size="sm" onClick={handleDeleteAlert} disabled={deleteSaving}>
                    {deleteSaving ? 'Deleting…' : 'Delete'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {showCreateAlert && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="create-alert-title">
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                <h3 id="create-alert-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Create alert rule</h3>
                <form onSubmit={handleCreateAlert} className="space-y-4">
                  {formError && (
                    <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
                  )}
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Accuracy drop" required className="text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label>Metric</Label>
                    <Select value={createForm.metric} onValueChange={(v) => setCreateForm((f) => ({ ...f, metric: v }))}>
                      <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {METRICS.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                      <Label>Operator</Label>
                      <Select value={createForm.operator} onValueChange={(v) => setCreateForm((f) => ({ ...f, operator: v as AlertFormOperator }))}>
                        <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {OPERATORS.map((o) => (
                            <SelectItem key={o} value={o}>{o}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label>Threshold</Label>
                      <Input type="number" step="any" value={createForm.threshold} onChange={(e) => setCreateForm((f) => ({ ...f, threshold: Number(e.target.value) || 0 }))} className="text-sm" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Severity</Label>
                    <Select value={createForm.severity} onValueChange={(v) => setCreateForm((f) => ({ ...f, severity: v as AlertFormSeverity }))}>
                      <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SEVERITIES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                      <Label>Duration (seconds)</Label>
                      <Input type="number" min={0} value={createForm.duration} onChange={(e) => setCreateForm((f) => ({ ...f, duration: Number(e.target.value) || 0 }))} className="text-sm" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label>Throttle (minutes)</Label>
                      <Input type="number" min={0} value={createForm.throttleMinutes} onChange={(e) => setCreateForm((f) => ({ ...f, throttleMinutes: Number(e.target.value) || 0 }))} className="text-sm" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="create-alert-enabled" checked={createForm.enabled} onCheckedChange={(c) => setCreateForm((f) => ({ ...f, enabled: !!c }))} />
                    <Label htmlFor="create-alert-enabled" className="text-sm font-normal">Enabled</Label>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={closeCreateModal}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={formSaving} size="sm">
                      {formSaving ? 'Creating…' : 'Create'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
