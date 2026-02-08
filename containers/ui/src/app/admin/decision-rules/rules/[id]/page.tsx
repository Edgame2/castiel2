'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

interface RuleCondition {
  field: string;
  operator: string;
  value: unknown;
}

interface RuleAction {
  type: string;
  details?: Record<string, unknown>;
  priority?: string;
  idempotencyKey?: string;
}

interface Rule {
  id: string;
  tenantId?: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number;
  conditions: RuleCondition[];
  conditionLogic: 'AND' | 'OR';
  actions?: RuleAction[];
  version?: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  catalogRiskId?: string;
}

export default function DecisionRuleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [rule, setRule] = useState<Rule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [priority, setPriority] = useState(0);
  const [conditionLogic, setConditionLogic] = useState<'AND' | 'OR'>('AND');
  const [conditions, setConditions] = useState<RuleCondition[]>([{ field: 'riskScore', operator: '>=', value: 0.5 }]);
  const [actions, setActions] = useState<RuleAction[]>([{ type: 'notification', details: {}, priority: 'medium', idempotencyKey: `rule_${Date.now()}` }]);
  const [createdBy, setCreatedBy] = useState('admin');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchRule = useCallback(async () => {
    if (!apiBase || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`${apiBase}/api/v1/decisions/rules?all=true`, { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText || 'Failed to load');
        return r.json();
      })
      .then((data: { rules?: Rule[] }) => {
        const found = (data.rules ?? []).find((r) => r.id === id);
        setRule(found ?? null);
        if (found) {
          setName(found.name ?? '');
          setDescription(found.description ?? '');
          setEnabled(found.enabled ?? true);
          setPriority(found.priority ?? 0);
          setConditionLogic((found.conditionLogic as 'AND' | 'OR') ?? 'AND');
          setConditions(found.conditions?.length ? found.conditions : [{ field: 'riskScore', operator: '>=', value: 0.5 }]);
          setActions(
            found.actions?.length
              ? found.actions.map((a) => ({ type: a.type, details: a.details ?? {}, priority: (a.priority as string) ?? 'medium', idempotencyKey: a.idempotencyKey ?? `rule_${Date.now()}` }))
              : [{ type: 'notification', details: {}, priority: 'medium', idempotencyKey: `rule_${Date.now()}` }]
          );
          setCreatedBy(found.createdBy ?? 'admin');
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load');
        setRule(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchRule();
  }, [fetchRule]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBase || !rule || conditions.length === 0 || actions.length === 0 || saving) return;
    setSaveError(null);
    setSaving(true);
    const body = {
      ...rule,
      name: name.trim(),
      description: description.trim() || undefined,
      enabled,
      priority,
      conditionLogic,
      conditions,
      actions: actions.map((a) => ({ type: a.type, details: a.details ?? {}, priority: (a.priority as string) ?? 'medium', idempotencyKey: a.idempotencyKey ?? `rule_${Date.now()}` })),
      createdBy: createdBy.trim() || 'admin',
    };
    fetch(`${apiBase}/api/v1/decisions/rules/${encodeURIComponent(rule.id)}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((j) => Promise.reject(new Error((j?.error?.message as string) || r.statusText)));
        setEditing(false);
        fetchRule();
      })
      .catch((e) => setSaveError(e instanceof Error ? e.message : 'Save failed'))
      .finally(() => setSaving(false));
  };

  const handleDelete = () => {
    if (!apiBase || !rule || deleting) return;
    setDeleting(true);
    fetch(`${apiBase}/api/v1/decisions/rules/${encodeURIComponent(rule.id)}`, { method: 'DELETE', credentials: 'include' })
      .then((r) => {
        if (r.status === 404 || r.status === 204 || r.ok) {
          router.push('/admin/decision-rules/rules');
          return;
        }
        return r.json().then((j) => Promise.reject(new Error((j?.error?.message as string) || 'Delete failed')));
      })
      .catch((e) => setSaveError(e instanceof Error ? e.message : 'Delete failed'))
      .finally(() => setDeleting(false));
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Link href="/admin">Admin</Link><span>/</span>
          <Link href="/admin/decision-rules">Decision Rules</Link><span>/</span>
          <Link href="/admin/decision-rules/rules">Rules</Link><span>/</span>
          <span className="text-foreground">Rule</span>
        </div>

        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{error}</p>}
        {saveError && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{saveError}</p>}

        {!loading && !error && rule && (
          <>
            <h1 className="text-xl font-semibold mb-4">{rule.name}</h1>

            {!editing ? (
              <div className="border rounded-lg p-6 dark:border-gray-700 space-y-2">
                <p><span className="text-gray-500">ID:</span> {rule.id}</p>
                <p><span className="text-gray-500">Name:</span> {rule.name}</p>
                {rule.description != null && rule.description !== '' && <p><span className="text-gray-500">Description:</span> {rule.description}</p>}
                <p><span className="text-gray-500">Enabled:</span> {rule.enabled ? 'Yes' : 'No'}</p>
                <p><span className="text-gray-500">Priority:</span> {rule.priority}</p>
                <p><span className="text-gray-500">Condition logic:</span> {rule.conditionLogic ?? 'AND'}</p>
                <p><span className="text-gray-500">Conditions:</span> {rule.conditions?.length ?? 0}</p>
                <p><span className="text-gray-500">Actions:</span> {rule.actions?.length ?? 0}</p>
                {rule.createdAt && <p><span className="text-gray-500">Created:</span> {new Date(rule.createdAt).toLocaleString()}</p>}
                <div className="flex gap-2 mt-4">
                  <button type="button" onClick={() => setEditing(true)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Edit</button>
                  <button type="button" onClick={() => setDeleteConfirm(true)} className="px-4 py-2 border border-red-600 text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20">Delete</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="border rounded-lg p-6 dark:border-gray-700 space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-1">Name *</label>
                  <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" required />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium mb-1">Description</label>
                  <input id="description" type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="enabled" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="rounded" />
                  <label htmlFor="enabled" className="text-sm font-medium">Enabled</label>
                </div>
                <div>
                  <label htmlFor="priority" className="block text-sm font-medium mb-1">Priority</label>
                  <input id="priority" type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" />
                </div>
                <div>
                  <label htmlFor="conditionLogic" className="block text-sm font-medium mb-1">Condition logic</label>
                  <select id="conditionLogic" value={conditionLogic} onChange={(e) => setConditionLogic(e.target.value as 'AND' | 'OR')} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700">
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium">Conditions *</label>
                    <button type="button" onClick={() => setConditions((prev) => [...prev, { field: 'riskScore', operator: '>=', value: 0.5 }])} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Add condition</button>
                  </div>
                  {conditions.map((c, i) => (
                    <div key={i} className="flex gap-2 items-center mb-2">
                      <input type="text" value={c.field} onChange={(e) => setConditions((prev) => { const n = [...prev]; n[i] = { ...n[i], field: e.target.value }; return n; })} placeholder="field" className="flex-1 px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" />
                      <select value={c.operator} onChange={(e) => setConditions((prev) => { const n = [...prev]; n[i] = { ...n[i], operator: e.target.value }; return n; })} className="px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700">
                        <option value=">=">≥</option>
                        <option value=">">&gt;</option>
                        <option value="<">&lt;</option>
                        <option value="<=">≤</option>
                        <option value="=">=</option>
                      </select>
                      <input type="text" value={String(c.value ?? '')} onChange={(e) => { const v = e.target.value; const num = Number(v); setConditions((prev) => { const n = [...prev]; n[i] = { ...n[i], value: v === '' || Number.isNaN(num) ? v : num }; return n; }); }} placeholder="value" className="flex-1 px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" />
                      {conditions.length > 1 && <button type="button" onClick={() => setConditions((prev) => prev.filter((_, j) => j !== i))} className="text-red-600 dark:text-red-400 hover:underline text-xs">Remove</button>}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium">Actions *</label>
                    <button type="button" onClick={() => setActions((prev) => [...prev, { type: 'notification', details: {}, priority: 'medium', idempotencyKey: `rule_${Date.now()}` }])} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Add action</button>
                  </div>
                  {actions.map((a, i) => (
                    <div key={i} className="flex gap-2 items-center mb-2">
                      <select value={a.type} onChange={(e) => setActions((prev) => { const n = [...prev]; n[i] = { ...n[i], type: e.target.value }; return n; })} className="flex-1 px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700">
                        <option value="notification">notification</option>
                        <option value="crm_update">crm_update</option>
                        <option value="task_creation">task_creation</option>
                        <option value="email_draft">email_draft</option>
                        <option value="calendar_event">calendar_event</option>
                        <option value="playbook_assignment">playbook_assignment</option>
                      </select>
                      <input type="text" value={a.idempotencyKey ?? ''} onChange={(e) => setActions((prev) => { const n = [...prev]; n[i] = { ...n[i], idempotencyKey: e.target.value }; return n; })} placeholder="idempotencyKey" className="flex-1 px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" />
                      {actions.length > 1 && <button type="button" onClick={() => setActions((prev) => prev.filter((_, j) => j !== i))} className="text-red-600 dark:text-red-400 hover:underline text-xs">Remove</button>}
                    </div>
                  ))}
                </div>
                <div>
                  <label htmlFor="createdBy" className="block text-sm font-medium mb-1">Created by</label>
                  <input id="createdBy" type="text" value={createdBy} onChange={(e) => setCreatedBy(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Save</button>
                  <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 border rounded dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
                </div>
              </form>
            )}

            {deleteConfirm && (
              <div className="mt-4 p-4 border rounded-lg border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                <p className="text-sm mb-2">Delete this rule?</p>
                <div className="flex gap-2">
                  <button type="button" onClick={handleDelete} disabled={deleting} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">Delete</button>
                  <button type="button" onClick={() => setDeleteConfirm(false)} className="px-4 py-2 border rounded dark:border-gray-700">Cancel</button>
                </div>
              </div>
            )}
          </>
        )}

        {!loading && !error && !rule && (
          <p className="text-sm text-gray-500">Rule not found.</p>
        )}
        <p className="mt-4"><Link href="/admin/decision-rules/rules" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Rules</Link></p>
      </div>
    </div>
  );
}
