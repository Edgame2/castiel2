/**
 * Super Admin: Decision Rules — Overview (§6)
 * Links to Rules, Templates, Conflicts (risk-analytics decision engine).
 */

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Decision Rules',
};

export default function DecisionRulesOverviewPage() {
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
        <span className="text-sm font-medium">Decision Rules</span>
      </div>
      <h1 className="text-2xl font-bold mb-2">Decision Rules</h1>
      <p className="text-muted-foreground mb-4">
        Rules, templates, and conflict detection for the decision engine (risk-analytics). Super Admin §6.
      </p>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">
          Overview
        </span>
        <Link
          href="/admin/decision-rules/rules"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Rules
        </Link>
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

      <div className="space-y-6">
        <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Rules</h2>
            <Link
              href="/admin/decision-rules/rules"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              List & test rules →
            </Link>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            List and test decision engine rules for the current tenant. GET /api/v1/decisions/rules, POST .../rules/:ruleId/test via risk-analytics (§6.1).
          </p>
        </section>
        <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Templates</h2>
            <Link
              href="/admin/decision-rules/templates"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View templates →
            </Link>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Pre-configured rule templates (§6.2). Available when backend exposes template APIs.
          </p>
        </section>
        <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Conflicts</h2>
            <Link
              href="/admin/decision-rules/conflicts"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View conflicts →
            </Link>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Conflict detection and resolution (§6.3). Contradictory actions, overlapping conditions, priority conflicts.
          </p>
        </section>
      </div>
    </div>
  );
}
