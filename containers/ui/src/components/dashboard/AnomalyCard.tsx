/**
 * AnomalyCard – anomaly list and severity; Quick actions (Plan §6.3, §937, §942).
 * Data from risk-analytics GET /api/v1/opportunities/:id/anomalies.
 */

'use client';

export type AnomalyItem = {
  id: string;
  anomalyType?: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  detectedAt?: string;
  opportunityId?: string;
};

export type AnomalyCardProps = {
  anomalies: AnomalyItem[];
  onQuickAction?: (action: 'create_task' | 'log_activity' | 'start_remediation') => void;
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

export function AnomalyCard({
  anomalies,
  onQuickAction,
  opportunityId,
  title = 'Anomalies',
  apiBaseUrl = '',
  getHeaders,
}: AnomalyCardProps) {
  const oppId = opportunityId ?? anomalies[0]?.opportunityId;
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
      {anomalies.length === 0 ? (
        <p className="text-sm text-gray-500">No anomalies detected</p>
      ) : (
        <ul className="space-y-2">
          {anomalies.map((a) => (
            <li key={a.id} className="flex flex-wrap items-start gap-2 text-sm">
              <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${severityClass[a.severity] ?? severityClass.low}`}>
                {a.severity}
              </span>
              {a.anomalyType && (
                <span className="text-xs text-gray-500">{a.anomalyType}</span>
              )}
              <span className="flex-1 min-w-0">{a.description}</span>
              {a.detectedAt && (
                <span className="text-xs text-gray-400">{a.detectedAt.slice(0, 10)}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {showQuickActions && handleQuick && (
        <div className="mt-3 pt-3 border-t flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleQuick('create_task')}
            className="text-xs font-medium px-2 py-1 rounded border hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Create task
          </button>
          <button
            type="button"
            onClick={() => handleQuick('log_activity')}
            className="text-xs font-medium px-2 py-1 rounded border hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Log activity
          </button>
          <button
            type="button"
            onClick={() => handleQuick('start_remediation')}
            className="text-xs font-medium px-2 py-1 rounded border hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Start remediation
          </button>
        </div>
      )}
    </div>
  );
}
