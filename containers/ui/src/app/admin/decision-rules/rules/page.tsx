/**
 * Super Admin: Decision Rules — Rules (§6.1)
 * GET /api/v1/decisions/rules, POST /api/v1/decisions/rules/:ruleId/test via gateway (risk-analytics).
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

interface RuleCondition {
  field: string;
  operator: string;
  value: unknown;
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
  catalogRiskId?: string;
}

export default function DecisionRulesRulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testingRuleId, setTestingRuleId] = useState<string | null>(null);
  const [testOpportunityId, setTestOpportunityId] = useState('');
  const [testResult, setTestResult] = useState<{ matched: boolean; actions: unknown[] } | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  const fetchRules = useCallback(async () => {
    if (!apiBaseUrl) {
      setError('NEXT_PUBLIC_API_BASE_URL is not set');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/decisions/rules`, { credentials: 'include' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setRules(Array.isArray(json?.rules) ? json.rules : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
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
    if (!apiBaseUrl || !testOpportunityId.trim()) {
      setTestError('Enter an opportunity ID');
      return;
    }
    setTestError(null);
    setTestResult(null);
    setTestLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/decisions/rules/${encodeURIComponent(ruleId)}/test`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunityId: testOpportunityId.trim() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setTestResult({ matched: json.matched ?? false, actions: json.actions ?? [] });
    } catch (e) {
      setTestError(e instanceof Error ? e.message : String(e));
      setTestResult(null);
    } finally {
      setTestLoading(false);
    }
  };

  const closeTest = () => {
    setTestingRuleId(null);
    setTestOpportunityId('');
    setTestResult(null);
    setTestError(null);
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
        </div>
      )}

      {!loading && apiBaseUrl && (
        <div className="rounded-lg border bg-white dark:bg-gray-900">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold">Rules</h2>
            <button
              type="button"
              onClick={fetchRules}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              Refresh
            </button>
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
                        <span className="font-medium">{r.name}</span>
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
                        <button
                          type="button"
                          onClick={() => setTestingRuleId(r.id)}
                          className="text-blue-600 dark:text-blue-400 hover:underline text-xs"
                        >
                          Test
                        </button>
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
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Opportunity ID</label>
              <input
                type="text"
                value={testOpportunityId}
                onChange={(e) => setTestOpportunityId(e.target.value)}
                placeholder="e.g. opp_123"
                className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
              />
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
              <button
                type="button"
                onClick={closeTest}
                className="px-3 py-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => testingRuleId && runTest(testingRuleId)}
                disabled={!testOpportunityId.trim() || !testingRuleId || testLoading}
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testLoading ? 'Running…' : 'Run test'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
