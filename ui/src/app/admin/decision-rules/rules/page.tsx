/**
 * Super Admin: Decision Rules — Rules (§6.1)
 * GET /api/v1/decisions/rules, POST /api/v1/decisions/rules/:ruleId/test via gateway (risk-analytics).
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GENERIC_ERROR_MESSAGE, apiFetch, getApiBaseUrl } from '@/lib/api';

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
  tenantId: string;
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

export default function DecisionRulesRulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testingRuleId, setTestingRuleId] = useState<string | null>(null);
  const [testOpportunityId, setTestOpportunityId] = useState('');
  const [testRiskScore, setTestRiskScore] = useState('');
  const [testResult, setTestResult] = useState<{ matched: boolean; actions: unknown[] } | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [togglingRuleId, setTogglingRuleId] = useState<string | null>(null);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);
  const [formRule, setFormRule] = useState<Rule | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formEnabled, setFormEnabled] = useState(true);
  const [formPriority, setFormPriority] = useState(0);
  const [formConditionLogic, setFormConditionLogic] = useState<'AND' | 'OR'>('AND');
  const [formConditions, setFormConditions] = useState<RuleCondition[]>([{ field: 'riskScore', operator: '>=', value: 0.5 }]);
  const [formActions, setFormActions] = useState<RuleAction[]>([
    { type: 'notification', details: {}, priority: 'medium', idempotencyKey: `rule_${Date.now()}` },
  ]);
  const [formCreatedBy, setFormCreatedBy] = useState('admin');
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const fetchRules = useCallback(async () => {
    if (!getApiBaseUrl()) {
      setError('NEXT_PUBLIC_API_BASE_URL is not set');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/v1/decisions/rules?all=true');
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setRules(Array.isArray(json?.rules) ? json.rules : []);
    } catch (e) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') console.error(e);
      setError(GENERIC_ERROR_MESSAGE);
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  useEffect(() => {
    document.title = 'Rules | Admin | Castiel';
    return () => {
      document.title = 'Admin | Castiel';
    };
  }, []);

  const runTest = async (ruleId: string) => {
    if (!getApiBaseUrl() || !testOpportunityId.trim()) {
      setTestError('Enter an opportunity ID');
      return;
    }
    setTestError(null);
    setTestResult(null);
    setTestLoading(true);
    const riskScoreVal = testRiskScore.trim() === '' ? undefined : Number(testRiskScore);
    if (testRiskScore.trim() !== '' && (Number.isNaN(riskScoreVal) || riskScoreVal === undefined)) {
      setTestError('Risk score must be a number');
      setTestLoading(false);
      return;
    }
    try {
      const body: { opportunityId: string; riskScore?: number } = { opportunityId: testOpportunityId.trim() };
      if (riskScoreVal !== undefined) body.riskScore = riskScoreVal;
      const res = await apiFetch(`/api/v1/decisions/rules/${encodeURIComponent(ruleId)}/test`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setTestResult({ matched: json.matched ?? false, actions: json.actions ?? [] });
    } catch (e) {
      if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
      setTestError(GENERIC_ERROR_MESSAGE);
      setTestResult(null);
    } finally {
      setTestLoading(false);
    }
  };

  const closeTest = () => {
    setTestingRuleId(null);
    setTestOpportunityId('');
    setTestRiskScore('');
    setTestResult(null);
    setTestError(null);
  };

  const handleToggleEnabled = async (r: Rule) => {
    if (!getApiBaseUrl()) return;
    setTogglingRuleId(r.id);
    setError(null);
    try {
      const res = await apiFetch(`/api/v1/decisions/rules/${encodeURIComponent(r.id)}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...r, enabled: !r.enabled }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      await fetchRules();
    } catch (e) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') console.error(e);
      setError(GENERIC_ERROR_MESSAGE);
    } finally {
      setTogglingRuleId(null);
    }
  };

  const handleDelete = async (r: Rule) => {
    if (!getApiBaseUrl()) return;
    if (!window.confirm(`Delete rule "${r.name}"?`)) return;
    setDeletingRuleId(r.id);
    setError(null);
    try {
      const res = await apiFetch(`/api/v1/decisions/rules/${encodeURIComponent(r.id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.status === 404) {
        await fetchRules();
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      await fetchRules();
    } catch (e) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') console.error(e);
      setError(GENERIC_ERROR_MESSAGE);
    } finally {
      setDeletingRuleId(null);
    }
  };

  const openCreate = () => {
    setFormRule(null);
    setFormName('');
    setFormDescription('');
    setFormEnabled(true);
    setFormPriority(0);
    setFormConditionLogic('AND');
    setFormConditions([{ field: 'riskScore', operator: '>=', value: 0.5 }]);
    setFormActions([{ type: 'notification', details: {}, priority: 'medium', idempotencyKey: `rule_${Date.now()}` }]);
    setFormCreatedBy('admin');
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (r: Rule) => {
    setFormRule(r);
    setFormName(r.name);
    setFormDescription(r.description ?? '');
    setFormEnabled(r.enabled);
    setFormPriority(r.priority);
    setFormConditionLogic((r.conditionLogic as 'AND' | 'OR') ?? 'AND');
    setFormConditions(r.conditions?.length ? r.conditions : [{ field: 'riskScore', operator: '>=', value: 0.5 }]);
    setFormActions(
      r.actions?.length
        ? r.actions.map((a) => ({
            type: a.type,
            details: a.details ?? {},
            priority: (a.priority as 'low' | 'medium' | 'high') ?? 'medium',
            idempotencyKey: a.idempotencyKey ?? `rule_${Date.now()}`,
          }))
        : [{ type: 'notification', details: {}, priority: 'medium', idempotencyKey: `rule_${Date.now()}` }]
    );
    setFormCreatedBy(r.createdBy ?? 'admin');
    setFormError(null);
    setFormOpen(true);
  };

  const openDuplicate = (r: Rule) => {
    setFormRule(null);
    setFormName(`${r.name} (copy)`);
    setFormDescription(r.description ?? '');
    setFormEnabled(r.enabled);
    setFormPriority(r.priority);
    setFormConditionLogic((r.conditionLogic as 'AND' | 'OR') ?? 'AND');
    setFormConditions(
      r.conditions?.length
        ? r.conditions.map((c) => ({ ...c }))
        : [{ field: 'riskScore', operator: '>=', value: 0.5 }]
    );
    setFormActions(
      r.actions?.length
        ? r.actions.map((a) => ({
            type: a.type,
            details: { ...(a.details ?? {}) },
            priority: (a.priority as 'low' | 'medium' | 'high') ?? 'medium',
            idempotencyKey: a.idempotencyKey ?? `rule_${Date.now()}`,
          }))
        : [{ type: 'notification', details: {}, priority: 'medium', idempotencyKey: `rule_${Date.now()}` }]
    );
    setFormCreatedBy(r.createdBy ?? 'admin');
    setFormError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormRule(null);
    setFormError(null);
    setFormOpen(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!getApiBaseUrl() || !formName.trim()) {
      setFormError('Name is required');
      return;
    }
    if (formConditions.length === 0) {
      setFormError('At least one condition is required');
      return;
    }
    const actions = formActions.map((a) => ({
      type: a.type,
      details: a.details ?? {},
      priority: (a.priority as 'low' | 'medium' | 'high') ?? 'medium',
      idempotencyKey: a.idempotencyKey ?? `rule_${Date.now()}`,
    }));
    if (actions.length === 0) {
      setFormError('At least one action is required');
      return;
    }
    setFormSaving(true);
    setFormError(null);
    try {
      if (formRule) {
        const res = await apiFetch(`/api/v1/decisions/rules/${encodeURIComponent(formRule.id)}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formRule,
            name: formName.trim(),
            description: formDescription.trim() || undefined,
            enabled: formEnabled,
            priority: formPriority,
            conditionLogic: formConditionLogic,
            conditions: formConditions,
            actions,
            createdBy: formCreatedBy.trim() || 'admin',
          }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
        }
      } else {
        const res = await apiFetch('/api/v1/decisions/rules', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName.trim(),
            description: formDescription.trim() || undefined,
            enabled: formEnabled,
            priority: formPriority,
            conditionLogic: formConditionLogic,
            conditions: formConditions,
            actions,
            createdBy: formCreatedBy.trim() || 'admin',
          }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
        }
      }
      setFormOpen(false);
      setFormRule(null);
      setFormError(null);
      await fetchRules();
    } catch (err) {
      if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(err);
      setFormError(GENERIC_ERROR_MESSAGE);
    } finally {
      setFormSaving(false);
    }
  };

  const subNav = (
    <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
      <Link
        href="/admin/decision-rules"
        className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
      >
        Overview
      </Link>
      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">
        Rules
      </span>
      <Link
        href="/admin/decision-rules/templates"
        className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
      >
        Templates
      </Link>
      <Link
        href="/admin/decision-rules/conflicts"
        className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
      >
        Conflicts
      </Link>
    </nav>
  );

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
        <Link href="/admin/decision-rules" className="text-sm font-medium hover:underline">
          Decision Rules
        </Link>
        <span className="text-sm text-gray-500">/</span>
        <span className="text-sm font-medium">Rules</span>
      </div>
      <h1 className="text-2xl font-bold mb-2">Rules</h1>
      <p className="text-muted-foreground mb-4">
        List and test decision engine rules for the current tenant. Via risk-analytics (§6.1).
      </p>
      {subNav}

      {!getApiBaseUrl() && (
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
        </div>
      )}

      {!loading && getApiBaseUrl() && (
        <div className="rounded-lg border bg-white dark:bg-gray-900">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold">Rules</h2>
            <div className="flex gap-2">
              <Button asChild size="sm">
              <Link href="/admin/decision-rules/rules/new">New rule</Link>
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={fetchRules}>
                Refresh
              </Button>
            </div>
          </div>
          {rules.length === 0 ? (
            <div className="p-6">
              <p className="text-sm text-gray-500">No rules for this tenant.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-800">
                    <th className="text-left py-2 px-4">Name</th>
                    <th className="text-left py-2 px-4">Enabled</th>
                    <th className="text-left py-2 px-4">Priority</th>
                    <th className="text-left py-2 px-4">Conditions</th>
                    <th className="text-left py-2 px-4">Catalog risk</th>
                    <th className="text-left py-2 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((r) => (
                    <tr key={r.id} className="border-b">
                      <td className="py-2 px-4">
                        <Link href={`/admin/decision-rules/rules/${encodeURIComponent(r.id)}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                          {r.name}
                        </Link>
                        {r.description ? (
                          <p className="text-xs text-gray-500 mt-0.5">{r.description}</p>
                        ) : null}
                      </td>
                      <td className="py-2 px-4">{r.enabled ? 'Yes' : 'No'}</td>
                      <td className="py-2 px-4">{r.priority}</td>
                      <td className="py-2 px-4">
                        {r.conditions?.length ?? 0} ({r.conditionLogic ?? 'AND'})
                      </td>
                      <td className="py-2 px-4">{r.catalogRiskId ?? '—'}</td>
                      <td className="py-2 px-4">
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="link" size="sm" className="text-xs h-auto p-0 text-primary" onClick={() => openEdit(r)}>Edit</Button>
                          <Button type="button" variant="link" size="sm" className="text-xs h-auto p-0 text-primary" onClick={() => openDuplicate(r)}>Duplicate</Button>
                          <Button type="button" variant="link" size="sm" className="text-xs h-auto p-0 text-primary" onClick={() => setTestingRuleId(r.id)}>Test</Button>
                          <Button type="button" variant="link" size="sm" className="text-xs h-auto p-0 text-amber-600 dark:text-amber-400" onClick={() => handleToggleEnabled(r)} disabled={togglingRuleId === r.id}>
                            {togglingRuleId === r.id ? '…' : r.enabled ? 'Disable' : 'Enable'}
                          </Button>
                          <Button type="button" variant="link" size="sm" className="text-xs h-auto p-0 text-destructive" onClick={() => handleDelete(r)} disabled={deletingRuleId === r.id}>
                            {deletingRuleId === r.id ? '…' : 'Delete'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {testingRuleId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-10 p-4" role="dialog" aria-modal="true" aria-labelledby="test-rule-title">
          <div className="bg-white dark:bg-gray-900 rounded-lg border shadow-lg max-w-md w-full p-6">
            <h3 id="test-rule-title" className="text-lg font-semibold mb-3">Test rule</h3>
            <p className="text-sm text-gray-500 mb-3">Rule ID: {testingRuleId}</p>
            <div className="mb-4 space-y-2">
              <Label>Opportunity ID *</Label>
              <Input value={testOpportunityId} onChange={(e) => setTestOpportunityId(e.target.value)} placeholder="e.g. opp_123" />
            </div>
            <div className="mb-4 space-y-2">
              <Label>Risk score (optional, §6.1.3)</Label>
              <Input value={testRiskScore} onChange={(e) => setTestRiskScore(e.target.value)} placeholder="e.g. 0.7" aria-label="Optional risk score for test context" />
              <p className="text-xs text-muted-foreground">Used when rule condition checks riskScore (e.g. riskScore ≥ 0.5).</p>
            </div>
            {testError && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-3">{testError}</p>
            )}
            {testResult && (
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                <p><strong>Matched:</strong> {testResult.matched ? 'Yes' : 'No'}</p>
                <p><strong>Actions:</strong> {testResult.actions.length}</p>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={closeTest}>Close</Button>
              <Button type="button" size="sm" onClick={() => testingRuleId && runTest(testingRuleId)} disabled={!testOpportunityId.trim() || !testingRuleId || testLoading}>
                {testLoading ? 'Running…' : 'Run test'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-10 p-4" role="dialog" aria-modal="true" aria-labelledby="rule-form-title">
          <div className="bg-white dark:bg-gray-900 rounded-lg border shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 id="rule-form-title" className="text-lg font-semibold mb-4">
              {formRule ? 'Edit rule' : 'Create rule'}
            </h3>
            {formError && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-3">{formError}</p>
            )}
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="formEnabled" checked={formEnabled} onCheckedChange={(c) => setFormEnabled(!!c)} />
                <Label htmlFor="formEnabled" className="text-sm font-medium cursor-pointer">Enabled</Label>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Input type="number" value={formPriority} onChange={(e) => setFormPriority(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Condition logic</Label>
                <Select value={formConditionLogic} onValueChange={(v) => setFormConditionLogic(v as 'AND' | 'OR')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AND">AND</SelectItem>
                    <SelectItem value="OR">OR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Conditions</Label>
                  <Button type="button" variant="link" size="sm" className="text-xs h-auto p-0" onClick={() => setFormConditions((prev) => [...prev, { field: 'riskScore', operator: '>=', value: 0.5 }])}>Add condition</Button>
                </div>
                {formConditions.map((c, i) => (
                  <div key={i} className="flex gap-2 items-center mb-2">
                    <div className="grid grid-cols-3 gap-2 flex-1">
                      <Input value={c.field} onChange={(e) => setFormConditions((prev) => { const next = [...prev]; next[i] = { ...next[i], field: e.target.value }; return next; })} placeholder="field" />
                      <Select value={c.operator} onValueChange={(v) => setFormConditions((prev) => { const next = [...prev]; next[i] = { ...next[i], operator: v }; return next; })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value=">=">≥</SelectItem>
                          <SelectItem value=">">&gt;</SelectItem>
                          <SelectItem value="<">&lt;</SelectItem>
                          <SelectItem value="<=">≤</SelectItem>
                          <SelectItem value="=">=</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input value={String(c.value ?? '')} onChange={(e) => { const v = e.target.value; const num = Number(v); setFormConditions((prev) => { const next = [...prev]; next[i] = { ...next[i], value: v === '' || Number.isNaN(num) ? v : num }; return next; }); }} placeholder="value" />
                    </div>
                    {formConditions.length > 1 && (
                      <Button type="button" variant="link" size="sm" className="text-destructive text-xs shrink-0 h-auto p-0" onClick={() => setFormConditions((prev) => prev.filter((_, j) => j !== i))} aria-label="Remove condition">Remove</Button>
                    )}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Actions</Label>
                  <Button type="button" variant="link" size="sm" className="text-xs h-auto p-0" onClick={() => setFormActions((prev) => [...prev, { type: 'notification', details: {}, priority: 'medium', idempotencyKey: `rule_${Date.now()}` }])}>Add action</Button>
                </div>
                {formActions.map((a, i) => (
                  <div key={i} className="flex gap-2 items-center mb-2">
                    <div className="grid grid-cols-2 gap-2 flex-1">
                      <Select value={a.type} onValueChange={(v) => setFormActions((prev) => { const next = [...prev]; next[i] = { ...next[i], type: v }; return next; })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="notification">notification</SelectItem>
                          <SelectItem value="crm_update">crm_update</SelectItem>
                          <SelectItem value="task_creation">task_creation</SelectItem>
                          <SelectItem value="email_draft">email_draft</SelectItem>
                          <SelectItem value="calendar_event">calendar_event</SelectItem>
                          <SelectItem value="playbook_assignment">playbook_assignment</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input value={a.idempotencyKey ?? ''} onChange={(e) => setFormActions((prev) => { const next = [...prev]; next[i] = { ...next[i], idempotencyKey: e.target.value }; return next; })} placeholder="idempotencyKey" />
                    </div>
                    {formActions.length > 1 && (
                      <Button type="button" variant="link" size="sm" className="text-destructive text-xs shrink-0 h-auto p-0" onClick={() => setFormActions((prev) => prev.filter((_, j) => j !== i))} aria-label="Remove action">Remove</Button>
                    )}
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label>Created by</Label>
                <Input value={formCreatedBy} onChange={(e) => setFormCreatedBy(e.target.value)} />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" size="sm" onClick={closeForm}>Cancel</Button>
                <Button type="submit" size="sm" disabled={formSaving}>{formSaving ? 'Saving…' : formRule ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
