/**
 * Tenant Admin: Integration Health & Monitoring
 * View integration health status, sync history, error logs, data quality, and performance metrics
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { GENERIC_ERROR_MESSAGE } from '@/lib/api';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

interface IntegrationHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'disconnected';
  lastSync: string | null;
  successRate7d: number;
  successRate30d: number;
  totalRecordsSynced: number;
  apiQuotaUsed: number;
  apiQuotaLimit: number;
  connectionStatus: 'connected' | 'disconnected' | 'error';
  issues: string[];
}

interface SyncExecution {
  id: string;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  status: 'completed' | 'failed' | 'running';
  recordsProcessed: number;
  recordsFailed: number;
  entitiesSynced?: string[];
  errors?: Array<{
    message: string;
    entity?: string;
    recordId?: string;
  }>;
}

interface ErrorLog {
  id: string;
  timestamp: string;
  errorType: string;
  message: string;
  affectedEntity?: string;
  recordId?: string;
  retryAttempts: number;
  status: 'resolved' | 'pending' | 'ignored';
}

interface DataQualityMetrics {
  validationFailureRate: number;
  missingRequiredFields: number;
  invalidDataTypes: number;
  duplicateRecords: number;
  dataCompletenessScore: number;
  totalRecords: number;
  failedRecords: number;
}

interface PerformanceMetrics {
  avgSyncDuration: number;
  avgRecordsPerSync: number;
  avgErrorRate: number;
  avgApiLatency?: number;
  timeRange: string;
}

interface Integration {
  id: string;
  name: string;
  integrationType: string;
}

export default function IntegrationHealthPage() {
  const params = useParams();
  const router = useRouter();
  const integrationId = params.id as string;

  const [integration, setIntegration] = useState<Integration | null>(null);
  const [health, setHealth] = useState<IntegrationHealth | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncExecution[]>([]);
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [dataQuality, setDataQuality] = useState<DataQualityMetrics | null>(null);
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'sync' | 'errors' | 'quality' | 'performance'>('overview');
  const [selectedSyncId, setSelectedSyncId] = useState<string | null>(null);
  const [syncDetails, setSyncDetails] = useState<SyncExecution | null>(null);

  const fetchIntegration = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/integrations/${integrationId}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setIntegration(json);
    } catch (e) {
      if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
      setError(GENERIC_ERROR_MESSAGE);
    }
  }, [integrationId]);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/integrations/${integrationId}/health`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setHealth(json?.health || null);
    } catch (e) {
      if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
      setError(GENERIC_ERROR_MESSAGE);
    }
  }, [integrationId]);

  const fetchSyncHistory = useCallback(async () => {
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/v1/integrations/${integrationId}/sync-history?limit=50`,
        {
          credentials: 'include',
        }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setSyncHistory(Array.isArray(json?.history) ? json.history : []);
    } catch (e) {
      setSyncHistory([]);
    }
  }, [integrationId]);

  const fetchErrors = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/integrations/${integrationId}/errors?limit=50`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setErrors(Array.isArray(json?.errors) ? json.errors : []);
    } catch (e) {
      setErrors([]);
    }
  }, [integrationId]);

  const fetchDataQuality = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/integrations/${integrationId}/data-quality`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setDataQuality(json?.metrics || null);
    } catch (e) {
      setDataQuality(null);
    }
  }, [integrationId]);

  const fetchPerformance = useCallback(async () => {
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/v1/integrations/${integrationId}/performance?timeRange=7d`,
        {
          credentials: 'include',
        }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setPerformance(json?.metrics || null);
    } catch (e) {
      setPerformance(null);
    }
  }, [integrationId]);

  const fetchSyncDetails = useCallback(
    async (syncId: string) => {
      try {
        const res = await fetch(
          `${apiBaseUrl}/api/v1/integrations/${integrationId}/sync-history/${syncId}`,
          {
            credentials: 'include',
          }
        );
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
        }
        const json = await res.json();
        setSyncDetails(json?.syncExecution || null);
      } catch (e) {
        setSyncDetails(null);
      }
    },
    [integrationId]
  );

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchIntegration(),
      fetchHealth(),
      fetchSyncHistory(),
      fetchErrors(),
      fetchDataQuality(),
      fetchPerformance(),
    ]).finally(() => {
      setLoading(false);
    });
  }, [fetchIntegration, fetchHealth, fetchSyncHistory, fetchErrors, fetchDataQuality, fetchPerformance]);

  useEffect(() => {
    if (selectedSyncId) {
      fetchSyncDetails(selectedSyncId);
    }
  }, [selectedSyncId, fetchSyncDetails]);

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Loading integration health…</p>
      </div>
    );
  }

  if (error && !integration) {
    return (
      <div className="p-6">
        <div className="rounded-lg border p-6 bg-white dark:bg-gray-900">
          <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/settings/integrations" className="text-sm font-medium hover:underline">
          ← Integrations
        </Link>
        <span className="text-sm text-gray-500">/</span>
        <Link href={`/settings/integrations/${integrationId}`} className="text-sm font-medium hover:underline">
          {integration?.name || 'Integration'}
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">Integration Health & Monitoring</h1>
      <p className="text-muted-foreground mb-6">
        Monitor health, sync history, errors, and performance for {integration?.name || 'integration'}
      </p>

      {error && (
        <div className="rounded-lg border p-4 bg-red-50 dark:bg-red-900/20 mb-4">
          <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
        </div>
      )}

      <div className="rounded-lg border bg-white dark:bg-gray-900">
        <div className="border-b">
          <nav className="flex gap-4 px-4">
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-none border-b-2 -mb-px ${
                activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('overview')}
            >
              Health Overview
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-none border-b-2 -mb-px ${
                activeTab === 'sync' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('sync')}
            >
              Sync History
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-none border-b-2 -mb-px ${
                activeTab === 'errors' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('errors')}
            >
              Error Logs
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-none border-b-2 -mb-px ${
                activeTab === 'quality' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('quality')}
            >
              Data Quality
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-none border-b-2 -mb-px ${
                activeTab === 'performance' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('performance')}
            >
              Performance
            </Button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && health && <HealthOverviewTab health={health} />}

          {activeTab === 'sync' && (
            <SyncHistoryTab
              history={syncHistory}
              onViewDetails={(syncId) => {
                setSelectedSyncId(syncId);
                setSyncDetails(null);
              }}
              selectedSyncId={selectedSyncId}
              syncDetails={syncDetails}
            />
          )}

          {activeTab === 'errors' && <ErrorLogsTab errors={errors} />}

          {activeTab === 'quality' && dataQuality && <DataQualityTab metrics={dataQuality} />}

          {activeTab === 'performance' && performance && <PerformanceTab metrics={performance} />}
        </div>
      </div>
    </div>
  );
}

interface HealthOverviewTabProps {
  health: IntegrationHealth;
}

function HealthOverviewTab({ health }: HealthOverviewTabProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Health Overview</h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="p-4 border rounded">
          <p className="text-xs text-gray-500 mb-1">Status</p>
          <span
            className={`text-lg font-semibold ${
              health.status === 'healthy'
                ? 'text-green-600'
                : health.status === 'degraded'
                  ? 'text-yellow-600'
                  : health.status === 'unhealthy'
                    ? 'text-red-600'
                    : 'text-gray-600'
            }`}
          >
            {health.status.toUpperCase()}
          </span>
        </div>

        <div className="p-4 border rounded">
          <p className="text-xs text-gray-500 mb-1">Connection</p>
          <span
            className={`text-lg font-semibold ${
              health.connectionStatus === 'connected'
                ? 'text-green-600'
                : health.connectionStatus === 'error'
                  ? 'text-red-600'
                  : 'text-gray-600'
            }`}
          >
            {health.connectionStatus.toUpperCase()}
          </span>
        </div>

        <div className="p-4 border rounded">
          <p className="text-xs text-gray-500 mb-1">Last Sync</p>
          <p className="text-sm font-medium">
            {health.lastSync ? new Date(health.lastSync).toLocaleString() : 'Never'}
          </p>
        </div>

        <div className="p-4 border rounded">
          <p className="text-xs text-gray-500 mb-1">Success Rate (7d)</p>
          <p className="text-lg font-semibold">{(health.successRate7d * 100).toFixed(1)}%</p>
        </div>

        <div className="p-4 border rounded">
          <p className="text-xs text-gray-500 mb-1">Success Rate (30d)</p>
          <p className="text-lg font-semibold">{(health.successRate30d * 100).toFixed(1)}%</p>
        </div>

        <div className="p-4 border rounded">
          <p className="text-xs text-gray-500 mb-1">Total Records Synced</p>
          <p className="text-lg font-semibold">{health.totalRecordsSynced.toLocaleString()}</p>
        </div>

        <div className="p-4 border rounded">
          <p className="text-xs text-gray-500 mb-1">API Quota</p>
          <p className="text-sm font-medium">
            {health.apiQuotaUsed.toLocaleString()} / {health.apiQuotaLimit.toLocaleString()}
          </p>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${(health.apiQuotaUsed / health.apiQuotaLimit) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {health.issues.length > 0 && (
        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded">
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">Issues:</p>
          <ul className="text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside">
            {health.issues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface SyncHistoryTabProps {
  history: SyncExecution[];
  onViewDetails: (syncId: string) => void;
  selectedSyncId: string | null;
  syncDetails: SyncExecution | null;
}

function SyncHistoryTab({ history, onViewDetails, selectedSyncId, syncDetails }: SyncHistoryTabProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Sync History</h3>

      {history.length === 0 ? (
        <p className="text-sm text-gray-500">No sync history available</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Records</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Failed</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {history.map((sync) => (
                <tr key={sync.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-4 py-3 text-sm">
                    {new Date(sync.startedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {sync.duration ? `${(sync.duration / 1000).toFixed(1)}s` : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        sync.status === 'completed'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : sync.status === 'failed'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      }`}
                    >
                      {sync.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{sync.recordsProcessed.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-red-600">{sync.recordsFailed}</td>
                  <td className="px-4 py-3 text-sm">
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto text-primary"
                      onClick={() => onViewDetails(sync.id)}
                    >
                      View Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedSyncId && syncDetails && (
        <div className="mt-4 p-4 border rounded">
          <h4 className="font-semibold mb-2">Sync Execution Details</h4>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Started:</span>{' '}
              {new Date(syncDetails.startedAt).toLocaleString()}
            </p>
            {syncDetails.completedAt && (
              <p>
                <span className="font-medium">Completed:</span>{' '}
                {new Date(syncDetails.completedAt).toLocaleString()}
              </p>
            )}
            {syncDetails.duration && (
              <p>
                <span className="font-medium">Duration:</span> {(syncDetails.duration / 1000).toFixed(1)}s
              </p>
            )}
            <p>
              <span className="font-medium">Status:</span> {syncDetails.status}
            </p>
            <p>
              <span className="font-medium">Records Processed:</span>{' '}
              {syncDetails.recordsProcessed.toLocaleString()}
            </p>
            <p>
              <span className="font-medium">Records Failed:</span> {syncDetails.recordsFailed}
            </p>
            {syncDetails.entitiesSynced && syncDetails.entitiesSynced.length > 0 && (
              <p>
                <span className="font-medium">Entities:</span> {syncDetails.entitiesSynced.join(', ')}
              </p>
            )}
            {syncDetails.errors && syncDetails.errors.length > 0 && (
              <div className="mt-2">
                <p className="font-medium">Errors:</p>
                <ul className="list-disc list-inside text-red-600">
                  {syncDetails.errors.map((err, i) => (
                    <li key={i}>{err.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface ErrorLogsTabProps {
  errors: ErrorLog[];
}

function ErrorLogsTab({ errors }: ErrorLogsTabProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Error Logs</h3>

      {errors.length === 0 ? (
        <p className="text-sm text-gray-500">No errors found</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {errors.map((err) => (
                <tr key={err.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-4 py-3 text-sm">{new Date(err.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm">{err.errorType}</td>
                  <td className="px-4 py-3 text-sm">{err.message}</td>
                  <td className="px-4 py-3 text-sm">{err.affectedEntity || '-'}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        err.status === 'resolved'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : err.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {err.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface DataQualityTabProps {
  metrics: DataQualityMetrics;
}

function DataQualityTab({ metrics }: DataQualityTabProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Data Quality Metrics</h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="p-4 border rounded">
          <p className="text-xs text-gray-500 mb-1">Validation Failure Rate</p>
          <p className="text-lg font-semibold">{(metrics.validationFailureRate * 100).toFixed(2)}%</p>
        </div>

        <div className="p-4 border rounded">
          <p className="text-xs text-gray-500 mb-1">Missing Required Fields</p>
          <p className="text-lg font-semibold">{metrics.missingRequiredFields}</p>
        </div>

        <div className="p-4 border rounded">
          <p className="text-xs text-gray-500 mb-1">Invalid Data Types</p>
          <p className="text-lg font-semibold">{metrics.invalidDataTypes}</p>
        </div>

        <div className="p-4 border rounded">
          <p className="text-xs text-gray-500 mb-1">Duplicate Records</p>
          <p className="text-lg font-semibold">{metrics.duplicateRecords}</p>
        </div>

        <div className="p-4 border rounded">
          <p className="text-xs text-gray-500 mb-1">Data Completeness Score</p>
          <p className="text-lg font-semibold">{(metrics.dataCompletenessScore * 100).toFixed(1)}%</p>
        </div>

        <div className="p-4 border rounded">
          <p className="text-xs text-gray-500 mb-1">Total Records</p>
          <p className="text-lg font-semibold">{metrics.totalRecords.toLocaleString()}</p>
        </div>

        <div className="p-4 border rounded">
          <p className="text-xs text-gray-500 mb-1">Failed Records</p>
          <p className="text-lg font-semibold text-red-600">{metrics.failedRecords}</p>
        </div>
      </div>
    </div>
  );
}

interface PerformanceTabProps {
  metrics: PerformanceMetrics;
}

function PerformanceTab({ metrics }: PerformanceTabProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
      <p className="text-sm text-gray-500 mb-4">Time Range: {metrics.timeRange}</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 border rounded">
          <p className="text-xs text-gray-500 mb-1">Avg Sync Duration</p>
          <p className="text-lg font-semibold">{(metrics.avgSyncDuration / 1000).toFixed(1)}s</p>
        </div>

        <div className="p-4 border rounded">
          <p className="text-xs text-gray-500 mb-1">Avg Records per Sync</p>
          <p className="text-lg font-semibold">{metrics.avgRecordsPerSync.toFixed(0)}</p>
        </div>

        <div className="p-4 border rounded">
          <p className="text-xs text-gray-500 mb-1">Error Rate</p>
          <p className="text-lg font-semibold">{(metrics.avgErrorRate * 100).toFixed(2)}%</p>
        </div>

        {metrics.avgApiLatency !== undefined && (
          <div className="p-4 border rounded">
            <p className="text-xs text-gray-500 mb-1">Avg API Latency</p>
            <p className="text-lg font-semibold">{metrics.avgApiLatency.toFixed(0)}ms</p>
          </div>
        )}
      </div>
    </div>
  );
}
