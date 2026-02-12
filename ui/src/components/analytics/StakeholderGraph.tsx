/**
 * StakeholderGraph – nodes and edges from shard-manager (Plan §6.3, §924, §937).
 * Data: GET /api/v1/opportunities/:opportunityId/stakeholder-graph (risk-analytics).
 * No hardcoded URLs; optional apiBaseUrl, getHeaders from parent.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { GENERIC_ERROR_MESSAGE } from '@/lib/api';

export type StakeholderGraphNode = {
  id: string;
  type: 'opportunity' | 'contact';
  label?: string;
};

export type StakeholderGraphEdge = {
  source: string;
  target: string;
  relationshipType: string;
};

export type StakeholderGraphData = {
  nodes: StakeholderGraphNode[];
  edges: StakeholderGraphEdge[];
};

export type StakeholderGraphProps = {
  opportunityId: string;
  title?: string;
  height?: number;
  /** Omit to use relative /api/v1/... */
  apiBaseUrl?: string;
  getHeaders?: () => HeadersInit | Promise<HeadersInit>;
};

export function StakeholderGraph({
  opportunityId,
  title = 'Stakeholder graph',
  height = 240,
  apiBaseUrl = '',
  getHeaders,
}: StakeholderGraphProps) {
  const [data, setData] = useState<StakeholderGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const base = apiBaseUrl.replace(/\/$/, '');
  const url = `${base}/api/v1/opportunities/${opportunityId}/stakeholder-graph`;

  const fetchGraph = useCallback(async () => {
    if (!opportunityId) return;
    setLoading(true);
    setError(null);
    try {
      const headers: HeadersInit = getHeaders ? (await Promise.resolve(getHeaders())) : {};
      const res = await fetch(url, {
        headers: { ...headers },
        credentials: getHeaders ? undefined : ('same-origin' as RequestCredentials),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as StakeholderGraphData;
      setData(Array.isArray(json?.nodes) ? { nodes: json.nodes, edges: Array.isArray(json?.edges) ? json.edges : [] } : { nodes: [], edges: [] });
    } catch (e) {
      if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
      setError(GENERIC_ERROR_MESSAGE);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [opportunityId, url, getHeaders]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  if (loading) {
    return (
      <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
        <h3 className="text-sm font-semibold mb-2">{title}</h3>
        <div className="flex items-center justify-center" style={{ height }}>Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
        <h3 className="text-sm font-semibold mb-2">{title}</h3>
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!data || data.nodes.length === 0) {
    return (
      <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
        <h3 className="text-sm font-semibold mb-2">{title}</h3>
        <p className="text-xs text-gray-500">No stakeholder data</p>
      </div>
    );
  }

  const w = 380;
  const h = height - 32;
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.35;
  const pos = new Map<string, { x: number; y: number }>();
  data.nodes.forEach((n, i) => {
    if (i === 0) {
      pos.set(n.id, { x: cx, y: 28 });
    } else {
      const angle = (2 * Math.PI * (i - 0.5) / Math.max(1, data.nodes.length - 1)) - Math.PI / 2;
      pos.set(n.id, { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
  });

  return (
    <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }} aria-label="Stakeholder graph">
        <defs>
          <marker id={`arrow-stakeholder-${opportunityId}`} markerWidth={6} markerHeight={6} refX={5} refY={3} orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="#94a3b8" />
          </marker>
        </defs>
        {data.edges.map((e, i) => {
          const a = pos.get(e.source);
          const b = pos.get(e.target);
          if (!a || !b) return null;
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="#94a3b8"
              strokeWidth={1}
              markerEnd={`url(#arrow-stakeholder-${opportunityId})`}
            />
          );
        })}
        {data.nodes.map((n) => {
          const p = pos.get(n.id);
          if (!p) return null;
          const isOpp = n.type === 'opportunity';
          const label = n.label || n.id;
          const short = label.length > 10 ? `${label.slice(0, 8)}…` : label;
          return (
            <g key={n.id}>
              <circle
                cx={p.x}
                cy={p.y}
                r={isOpp ? 14 : 10}
                fill={isOpp ? '#3b82f6' : '#e2e8f0'}
                stroke={isOpp ? '#2563eb' : '#cbd5e1'}
                strokeWidth={1.5}
              />
              <text
                x={p.x}
                y={p.y + (isOpp ? 22 : 18)}
                textAnchor="middle"
                className="fill-gray-700 dark:fill-gray-300 text-[10px]"
              >
                {short}
              </text>
              <title>{label} ({n.type})</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
