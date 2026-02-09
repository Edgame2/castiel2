/**
 * EarlyWarningCard – list of signals, severity, acknowledge; Quick actions (Plan §6.3, §890, §942).
 * Data from risk-analytics GET /api/v1/early-warnings or manager dashboard.
 */

'use client';

import { Button } from '@/components/ui/button';

export type EarlyWarningSignal = {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  acknowledgedAt?: string;
  opportunityId?: string;
};

export type EarlyWarningCardProps = {
  signals: EarlyWarningSignal[];
  onAcknowledge?: (id: string) => void;
  onQuickAction?: (action: 'create_task' | 'log_activity' | 'start_remediation') => void;
  /** For quick actions; from config or parent. Also from signals[0]?.opportunityId. */
  opportunityId?: string;
  title?: string;
  /** For built-in quick-action POST when onQuickAction is not provided. Omit to use relative /api/v1/... */
  apiBaseUrl?: string;
  getHeaders?: () => HeadersInit | Promise<HeadersInit>;
};

const severityClass: Record<string, string> = {
  low: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  medium: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  high: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

export function EarlyWarningCard({
  signals,
  onAcknowledge,
  onQuickAction,
  opportunityId,
  title = 'Early warnings',
  apiBaseUrl = '',
  getHeaders,
}: EarlyWarningCardProps) {
  const oppId = opportunityId ?? signals[0]?.opportunityId;
  const builtInQuick = oppId
    ? (action: 'create_task' | 'log_activity' | 'start_remediation') => {
        (async () => {
          const base = apiBaseUrl.replace(/\/$/, '');
          const url = `${base}/api/v1/opportunities/${oppId}/quick-actions`;
          const headers: HeadersInit = getHeaders ? await Promise.resolve(getHeaders()) : {};
          await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify({ action }),
            credentials: getHeaders ? undefined : ('same-origin' as RequestCredentials),
          });
        })();
      }
    : undefined;
  const handleQuick = onQuickAction ?? builtInQuick;
  const showQuickActions = Boolean(handleQuick);

  return (
    <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      {signals.length === 0 ? (
        <p className="text-sm text-gray-500">No early warning signals</p>
      ) : (
        <ul className="space-y-2">
          {signals.map((s) => (
            <li key={s.id} className="flex flex-wrap items-start gap-2 text-sm">
              <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${severityClass[s.severity] ?? severityClass.low}`}>
                {s.severity}
              </span>
              <span className="flex-1 min-w-0">{s.description}</span>
              {s.acknowledgedAt ? (
                <span className="text-xs text-gray-500">Acknowledged</span>
              ) : onAcknowledge ? (
                <Button type="button" variant="link" size="sm" className="text-xs h-auto p-0" onClick={() => onAcknowledge(s.id)}>
                  Acknowledge
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {showQuickActions && handleQuick && (
        <div className="mt-3 pt-3 border-t flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => handleQuick('create_task')}>
            Create task
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => handleQuick('log_activity')}>
            Log activity
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => handleQuick('start_remediation')}>
            Start remediation
          </Button>
        </div>
      )}
    </div>
  );
}
