'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GENERIC_ERROR_MESSAGE } from '@/lib/api';

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

export default function DecisionRuleNewPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [priority, setPriority] = useState(0);
  const [conditionLogic, setConditionLogic] = useState<'AND' | 'OR'>('AND');
  const [conditions, setConditions] = useState<RuleCondition[]>([{ field: 'riskScore', operator: '>=', value: 0.5 }]);
  const [actions, setActions] = useState<RuleAction[]>([{ type: 'notification', details: {}, priority: 'medium', idempotencyKey: `rule_${Date.now()}` }]);
  const [createdBy, setCreatedBy] = useState('admin');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBase || !name.trim() || conditions.length === 0 || actions.length === 0 || submitting) return;
    setError(null);
    setSubmitting(true);
    const body = {
      name: name.trim(),
      description: description.trim() || undefined,
      enabled,
      priority,
      conditionLogic,
      conditions,
      actions: actions.map((a) => ({ type: a.type, details: a.details ?? {}, priority: (a.priority as string) ?? 'medium', idempotencyKey: a.idempotencyKey ?? `rule_${Date.now()}` })),
      createdBy: createdBy.trim() || 'admin',
    };
    fetch(`${apiBase}/api/v1/decisions/rules`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((j) => Promise.reject(new Error((j?.error?.message as string) || `HTTP ${r.status}`)));
        return r.json();
      })
      .then((saved: { id?: string }) => {
        const id = saved?.id;
        if (id) router.push(`/admin/decision-rules/rules/${encodeURIComponent(id)}`);
        else router.push('/admin/decision-rules/rules');
      })
      .catch((e) => { if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') console.error(e); setError(GENERIC_ERROR_MESSAGE); })
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Link href="/admin">Admin</Link><span>/</span>
          <Link href="/admin/decision-rules">Decision Rules</Link><span>/</span>
          <Link href="/admin/decision-rules/rules">Rules</Link><span>/</span>
          <span className="text-foreground">New rule</span>
        </div>
        <h1 className="text-xl font-semibold mb-4">Create rule</h1>
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{error}</p>}
        <form onSubmit={handleSubmit} className="border rounded-lg p-6 dark:border-gray-700 space-y-4">
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
            <Button type="submit" disabled={submitting || !name.trim()}>Create</Button>
            <Button variant="outline" asChild>
              <Link href="/admin/decision-rules/rules">Cancel</Link>
            </Button>
          </div>
        </form>
        <p className="mt-4"><Link href="/admin/decision-rules/rules" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Rules</Link></p>
      </div>
    </div>
  );
}
