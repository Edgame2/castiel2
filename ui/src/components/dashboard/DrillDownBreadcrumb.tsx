/**
 * DrillDownBreadcrumb – portfolio → account → opportunity → activity (Plan §6.3, §6.5).
 * Used on PortfolioDrillDownPage. Links: portfolio → /analytics/portfolios?portfolioId=;
 * account → /accounts/:id; opportunity → /opportunities/:id; activity → /opportunities/:id (parent opp).
 */

'use client';

import Link from 'next/link';

export type DrillDownSegment = {
  type: 'portfolio' | 'account' | 'opportunity' | 'activity';
  id: string;
  label?: string;
};

export type DrillDownBreadcrumbProps = {
  segments: DrillDownSegment[];
};

function href(seg: DrillDownSegment): string {
  switch (seg.type) {
    case 'portfolio':
      return `/analytics/portfolios?portfolioId=${encodeURIComponent(seg.id)}`;
    case 'account':
      return `/accounts/${encodeURIComponent(seg.id)}`;
    case 'opportunity':
    case 'activity':
      return `/opportunities/${encodeURIComponent(seg.id)}`;
    default:
      return '#';
  }
}

function defaultLabel(seg: DrillDownSegment): string {
  if (seg.label) return seg.label;
  switch (seg.type) {
    case 'portfolio': return `Portfolio ${seg.id}`;
    case 'account': return `Account ${seg.id}`;
    case 'opportunity': return `Opportunity ${seg.id}`;
    case 'activity': return `Activity ${seg.id}`;
    default: return seg.id;
  }
}

export function DrillDownBreadcrumb({ segments }: DrillDownBreadcrumbProps) {
  if (segments.length === 0) return null;
  return (
    <nav className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
      {segments.map((seg, i) => (
        <span key={`${seg.type}-${seg.id}-${i}`} className="flex items-center gap-2">
          {i > 0 && <span aria-hidden>/</span>}
          <Link href={href(seg)} className="font-medium hover:underline">
            {defaultLabel(seg)}
          </Link>
        </span>
      ))}
    </nav>
  );
}
