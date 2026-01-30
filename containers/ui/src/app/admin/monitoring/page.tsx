/**
 * Super Admin: System Monitoring Dashboard
 * Monitor system health, queues, processors, integrations, errors, performance
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, { status: string; latency?: number }>;
  timestamp: string;
}

interface QueueMetrics {
  queueName: string;
  depth: number;
  consumers: number;
  rate: number;
}

interface ProcessorStatus {
  instanceId: string;
  consumerType: string;
  processedMessages: number;
  errors: number;
  uptime: number;
}

export default function MonitoringDashboardPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [queues, setQueues] = useState<QueueMetrics[]>([]);
  const [processors, setProcessors] = useState<ProcessorStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Monitoring | Admin | Castiel';
    return () => {
      document.title = 'Admin | Castiel';
    };
  }, []);

  const fetchMonitoringData = useCallback(async () => {
    if (!apiBaseUrl) {
      setError('NEXT_PUBLIC_API_BASE_URL is not set');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [healthRes, queuesRes, processorsRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/v1/admin/monitoring/health`, { credentials: 'include' }),
        fetch(`${apiBaseUrl}/api/v1/admin/monitoring/queues`, { credentials: 'include' }),
        fetch(`${apiBaseUrl}/api/v1/admin/monitoring/processors`, { credentials: 'include' }),
      ]);

      if (!healthRes.ok || !queuesRes.ok || !processorsRes.ok) {
        throw new Error('Failed to fetch monitoring data');
      }

      const healthData = await healthRes.json();
      const queuesData = await queuesRes.json();
      const processorsData = await processorsRes.json();

      setHealth(healthData?.health || null);
      setQueues(Array.isArray(queuesData?.queues) ? queuesData.queues : []);
      setProcessors(Array.isArray(processorsData?.processors) ? processorsData.processors : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    fetchMonitoringData();
    const interval = setInterval(fetchMonitoringData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchMonitoringData]);

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
      </div>
      <h1 className="text-2xl font-bold mb-2">System Monitoring</h1>
      <p className="text-muted-foreground mb-6">
        Monitor system health, queues, processors, and performance (Super Admin only)
      </p>

      {!apiBaseUrl && (
        <div className="rounded-lg border p-6 bg-amber-50 dark:bg-amber-900/20 mb-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">Set NEXT_PUBLIC_API_BASE_URL to the API gateway URL.</p>
        </div>
      )}

      {apiBaseUrl && loading && (
        <div className="rounded-lg border p-6 bg-white dark:bg-gray-900">
          <p className="text-sm text-gray-500">Loading monitoring data…</p>
        </div>
      )}

      {apiBaseUrl && error && (
        <div className="rounded-lg border p-6 bg-white dark:bg-gray-900">
          <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
        </div>
      )}

      {apiBaseUrl && !loading && !error && (
        <div className="space-y-6">
          {/* System Health */}
          {health && (
            <div className="rounded-lg border bg-white dark:bg-gray-900 p-6">
              <h2 className="text-lg font-semibold mb-4">System Health</h2>
              <div className="flex items-center gap-4 mb-4">
                <span
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    health.status === 'healthy'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : health.status === 'degraded'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}
                >
                  {health.status.toUpperCase()}
                </span>
                <span className="text-sm text-gray-500">
                  Last updated: {new Date(health.timestamp).toLocaleString()}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(health.services || {}).map(([service, status]) => (
                  <div key={service} className="p-3 border rounded">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{service}</span>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          status.status === 'healthy'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}
                      >
                        {status.status}
                      </span>
                    </div>
                    {status.latency !== undefined && (
                      <p className="text-xs text-gray-500 mt-1">Latency: {status.latency}ms</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Queue Metrics */}
          <div className="rounded-lg border bg-white dark:bg-gray-900 p-6">
            <h2 className="text-lg font-semibold mb-4">Queue Metrics</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Queue</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Depth</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Consumers</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate (msg/s)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {queues.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                        No queue metrics available
                      </td>
                    </tr>
                  ) : (
                    queues.map((queue) => (
                      <tr key={queue.queueName} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-4 py-3 text-sm font-medium">{queue.queueName}</td>
                        <td className="px-4 py-3 text-sm">{queue.depth}</td>
                        <td className="px-4 py-3 text-sm">{queue.consumers}</td>
                        <td className="px-4 py-3 text-sm">{queue.rate.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Processor Status */}
          <div className="rounded-lg border bg-white dark:bg-gray-900 p-6">
            <h2 className="text-lg font-semibold mb-4">Processor Status</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Instance</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Processed</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Errors</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uptime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {processors.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                        No processor instances available
                      </td>
                    </tr>
                  ) : (
                    processors.map((processor) => (
                      <tr key={processor.instanceId} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-4 py-3 text-sm font-medium">{processor.instanceId}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {processor.consumerType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">{processor.processedMessages.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-red-600">{processor.errors}</td>
                        <td className="px-4 py-3 text-sm">{Math.floor(processor.uptime / 3600)}h</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
