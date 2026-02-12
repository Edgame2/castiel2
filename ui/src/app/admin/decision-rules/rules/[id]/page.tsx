'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
                  <Button type="button" onClick={() => setEditing(true)}>Edit</Button>
                  <Button type="button" variant="outline" className="border-destructive text-destructive hover:bg-destructive/10" onClick={() => setDeleteConfirm(true)}>Delete</Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="border rounded-lg p-6 dark:border-gray-700 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="enabled" checked={enabled} onCheckedChange={(c) => setEnabled(!!c)} />
                  <Label htmlFor="enabled" className="text-sm font-medium cursor-pointer">Enabled</Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Input id="priority" type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="conditionLogic">Condition logic</Label>
                  <Select value={conditionLogic} onValueChange={(v) => setConditionLogic(v as 'AND' | 'OR')}>
                    <SelectTrigger id="conditionLogic"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AND">AND</SelectItem>
                      <SelectItem value="OR">OR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label>Conditions *</Label>
                    <Button type="button" variant="link" size="sm" className="text-xs h-auto p-0" onClick={() => setConditions((prev) => [...prev, { field: 'riskScore', operator: '>=', value: 0.5 }])}>Add condition</Button>
                  </div>
                  {conditions.map((c, i) => (
                    <div key={i} className="flex gap-2 items-center mb-2">
                      <Input className="flex-1" value={c.field} onChange={(e) => setConditions((prev) => { const n = [...prev]; n[i] = { ...n[i], field: e.target.value }; return n; })} placeholder="field" />
                      <Select value={c.operator} onValueChange={(v) => setConditions((prev) => { const n = [...prev]; n[i] = { ...n[i], operator: v }; return n; })}>
                        <SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value=">=">≥</SelectItem>
                          <SelectItem value=">">&gt;</SelectItem>
                          <SelectItem value="<">&lt;</SelectItem>
                          <SelectItem value="<=">≤</SelectItem>
                          <SelectItem value="=">=</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input className="flex-1" value={String(c.value ?? '')} onChange={(e) => { const v = e.target.value; const num = Number(v); setConditions((prev) => { const n = [...prev]; n[i] = { ...n[i], value: v === '' || Number.isNaN(num) ? v : num }; return n; }); }} placeholder="value" />
                      {conditions.length > 1 && <Button type="button" variant="link" size="sm" className="text-destructive text-xs h-auto p-0" onClick={() => setConditions((prev) => prev.filter((_, j) => j !== i))}>Remove</Button>}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label>Actions *</Label>
                    <Button type="button" variant="link" size="sm" className="text-xs h-auto p-0" onClick={() => setActions((prev) => [...prev, { type: 'notification', details: {}, priority: 'medium', idempotencyKey: `rule_${Date.now()}` }])}>Add action</Button>
                  </div>
                  {actions.map((a, i) => (
                    <div key={i} className="flex gap-2 items-center mb-2">
                      <Select value={a.type} onValueChange={(v) => setActions((prev) => { const n = [...prev]; n[i] = { ...n[i], type: v }; return n; })}>
                        <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="notification">notification</SelectItem>
                          <SelectItem value="crm_update">crm_update</SelectItem>
                          <SelectItem value="task_creation">task_creation</SelectItem>
                          <SelectItem value="email_draft">email_draft</SelectItem>
                          <SelectItem value="calendar_event">calendar_event</SelectItem>
                          <SelectItem value="playbook_assignment">playbook_assignment</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input className="flex-1" value={a.idempotencyKey ?? ''} onChange={(e) => setActions((prev) => { const n = [...prev]; n[i] = { ...n[i], idempotencyKey: e.target.value }; return n; })} placeholder="idempotencyKey" />
                      {actions.length > 1 && <Button type="button" variant="link" size="sm" className="text-destructive text-xs h-auto p-0" onClick={() => setActions((prev) => prev.filter((_, j) => j !== i))}>Remove</Button>}
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="createdBy">Created by</Label>
                  <Input id="createdBy" value={createdBy} onChange={(e) => setCreatedBy(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving}>Save</Button>
                  <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </form>
            )}

            {deleteConfirm && (
              <div className="mt-4 p-4 border rounded-lg border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                <p className="text-sm mb-2">Delete this rule?</p>
                <div className="flex gap-2">
                  <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>Delete</Button>
                  <Button type="button" variant="outline" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
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
