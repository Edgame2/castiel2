/**
 * Super Admin: Feature Engineering — Quality (§5.3)
 * Quality dashboard (§5.3.1) from GET /api/v1/ml/features/quality and GET /api/v1/ml/features/statistics. Quality rules (§5.3.2) from GET /api/v1/ml/features/quality-rules.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

type FeaturePurpose = 'risk-scoring' | 'win-probability' | 'lstm' | 'anomaly' | 'forecasting';

const PURPOSES: FeaturePurpose[] = ['risk-scoring', 'win-probability', 'lstm', 'anomaly', 'forecasting'];

interface QualityAlert {
  featureName?: string;
  issue?: 'missing_rate' | 'outlier' | 'drift';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  value?: number;
  threshold?: number;
  message?: string;
  timestamp?: string;
}

interface FeatureStatistic {
  name?: string;
  mean?: number;
  std?: number;
  min?: number;
  max?: number;
  missingRate?: number;
  sampleCount?: number;
}

interface QualityRules {
  missingRateThreshold: number;
  driftThreshold: number;
  outlierMethod: string;
  outlierNStd: number;
}

export default function FeatureEngineeringQualityPage() {
  const [purpose, setPurpose] = useState<FeaturePurpose>('risk-scoring');
  const [alerts, setAlerts] = useState<QualityAlert[]>([]);
  const [statistics, setStatistics] = useState<FeatureStatistic[]>([]);
  const [rulesData, setRulesData] = useState<QualityRules | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuality = useCallback(async () => {
    if (!apiBaseUrl || !purpose) return;
    setLoading(true);
    setError(null);
    try {
      const [qualityRes, statsRes, rulesRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/v1/ml/features/quality?purpose=${encodeURIComponent(purpose)}`, { credentials: 'include' }),
        fetch(`${apiBaseUrl}/api/v1/ml/features/statistics?purpose=${encodeURIComponent(purpose)}`, { credentials: 'include' }),
        fetch(`${apiBaseUrl}/api/v1/ml/features/quality-rules`, { credentials: 'include' }),
      ]);
      if (!qualityRes.ok) throw new Error(`Quality: ${qualityRes.status}`);
      if (!statsRes.ok) throw new Error(`Statistics: ${statsRes.status}`);
      const qualityJson = await qualityRes.json();
      const statsJson = await statsRes.json();
      setAlerts(Array.isArray(qualityJson?.alerts) ? qualityJson.alerts : []);
      setStatistics(Array.isArray(statsJson?.statistics) ? statsJson.statistics : []);
      if (rulesRes.ok) {
        const rulesJson = await rulesRes.json();
        setRulesData(rulesJson);
      } else {
        setRulesData(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setAlerts([]);
      setStatistics([]);
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, purpose]);

  useEffect(() => {
    if (apiBaseUrl && purpose) fetchQuality();
    else if (!apiBaseUrl) {
      setError('NEXT_PUBLIC_API_BASE_URL is not set');
      setLoading(false);
    }
  }, [apiBaseUrl, purpose, fetchQuality]);

  useEffect(() => {
    document.title = 'Quality | Admin | Castiel';
    return () => {
      document.title = 'Admin | Castiel';
    };
  }, []);

  const severityBadge = (s: QualityAlert['severity']) => {
    if (!s) return null;
    const cls =
      s === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      : s === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
      : s === 'medium' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    return <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${cls}`}>{s}</span>;
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="text-sm font-medium hover:underline">← Dashboard</Link>
        <span className="text-sm text-gray-500">/</span>
        <Link href="/admin" className="text-sm font-medium hover:underline">Admin</Link>
        <span className="text-sm text-gray-500">/</span>
        <Link href="/admin/feature-engineering" className="text-sm font-medium hover:underline">Feature Engineering</Link>
        <span className="text-sm text-gray-500">/</span>
        <span className="text-sm font-medium">Quality</span>
      </div>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <Link href="/admin/feature-engineering" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Overview</Link>
        <Link href="/admin/feature-engineering/features" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Features</Link>
        <Link href="/admin/feature-engineering/versioning" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Versioning</Link>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">Quality</span>
      </nav>
      <h1 className="text-2xl font-bold mb-2">Quality</h1>
      <p className="text-muted-foreground mb-6">
        Quality dashboard (missing rate, outlier rate, drift) and quality rules per feature. §5.3.
      </p>

      {!apiBaseUrl && (
        <div className="rounded-lg border p-6 bg-amber-50 dark:bg-amber-900/20 mb-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">Set NEXT_PUBLIC_API_BASE_URL to the API gateway URL.</p>
        </div>
      )}

      {apiBaseUrl && (
        <div className="mb-4 flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Purpose</label>
          <select
            value={purpose}
            onChange={(e) => setPurpose(e.target.value as FeaturePurpose)}
            className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm"
          >
            {PURPOSES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={fetchQuality}
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            Refresh
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg border p-6 bg-white dark:bg-gray-900 mb-4">
          <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
          <button type="button" onClick={fetchQuality} className="mt-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">Retry</button>
        </div>
      )}

      {loading && (
        <div className="rounded-lg border p-6 bg-white dark:bg-gray-900">
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      )}

      {!loading && !error && apiBaseUrl && (
        <>
          <div className="rounded-lg border bg-white dark:bg-gray-900 overflow-hidden mb-6">
            <h2 className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-900 dark:text-gray-100">Quality alerts</h2>
            {alerts.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">No quality alerts for this purpose. Alerts are raised when missing rate or drift exceeds thresholds.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Feature</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Issue</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Severity</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Message</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Time</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {alerts.map((a, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{a.featureName ?? '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{a.issue ?? '—'}</td>
                        <td className="px-4 py-2 text-sm">{severityBadge(a.severity)}</td>
                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{a.message ?? '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{a.timestamp ? new Date(a.timestamp).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-white dark:bg-gray-900 overflow-hidden mb-6">
            <h2 className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-900 dark:text-gray-100">Per-feature statistics</h2>
            {statistics.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">No statistics yet. Statistics are computed from feature snapshots (extracted vectors) for the selected purpose.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Feature</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Mean</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Std</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Min</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Max</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Missing rate</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Samples</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {statistics.map((s, i) => (
                      <tr key={s.name ?? i}>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">{s.name ?? '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{s.mean != null ? s.mean.toFixed(4) : '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{s.std != null ? s.std.toFixed(4) : '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{s.min != null ? s.min.toFixed(4) : '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{s.max != null ? s.max.toFixed(4) : '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{s.missingRate != null ? `${(s.missingRate * 100).toFixed(2)}%` : '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{s.sampleCount ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-gray-50 dark:bg-gray-800/50 p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Quality rules (§5.3.2)</h3>
            {rulesData ? (
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <p><span className="font-medium text-gray-900 dark:text-gray-100">Missing rate threshold:</span> {(rulesData.missingRateThreshold * 100).toFixed(0)}%</p>
                <p><span className="font-medium text-gray-900 dark:text-gray-100">Drift threshold:</span> {rulesData.driftThreshold}</p>
                <p><span className="font-medium text-gray-900 dark:text-gray-100">Outlier method:</span> {rulesData.outlierMethod}</p>
                <p><span className="font-medium text-gray-900 dark:text-gray-100">Outlier N std:</span> {rulesData.outlierNStd}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  To change, update ml-service config (feature_quality_rules). Alerts above use these thresholds.
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Default quality rules (missing rate &gt; 10%, drift &gt; 0.2, outlier: zscore). To configure, set ml-service config feature_quality_rules and use GET /api/v1/ml/features/quality-rules.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
