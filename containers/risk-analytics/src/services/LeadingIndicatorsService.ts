/**
 * Leading Indicators Service (Gap 5, Plan §4)
 * Aggregates leading-indicator status from risk_snapshots, risk_evaluations,
 * early-warnings, and optionally shard-manager for activity/contacts.
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';

export type IndicatorStatus = 'ok' | 'warning' | 'critical' | 'unknown';

export interface LeadingIndicator {
  id: string;
  name: string;
  status: IndicatorStatus;
  value?: number;
  detail?: string;
}

export interface GetLeadingIndicatorsResult {
  indicators: LeadingIndicator[];
}

/** Map severity to status */
function severityToStatus(sev: string): IndicatorStatus {
  if (sev === 'critical' || sev === 'high') return 'critical';
  if (sev === 'medium') return 'warning';
  if (sev === 'low') return 'ok';
  return 'unknown';
}

/** Extract date from shard-like object for activity */
function getActivityDate(s: { createdAt?: string; structuredData?: Record<string, unknown> }): string | null {
  const d = (s as Record<string, unknown>).createdAt ?? (s as Record<string, unknown>).timestamp;
  if (typeof d === 'string') return d;
  const sd = (s as Record<string, unknown>).structuredData as Record<string, unknown> | undefined;
  const c = sd?.CreatedDate ?? sd?.ActivityDate ?? sd?.Created;
  if (typeof c === 'string') return c;
  return null;
}

export class LeadingIndicatorsService {
  private config: ReturnType<typeof loadConfig>;
  private shardManagerClient: ServiceClient;
  private app: FastifyInstance | null;

  constructor(app: FastifyInstance | null) {
    this.app = app;
    this.config = loadConfig();
    this.shardManagerClient = new ServiceClient({
      baseURL: this.config.services?.shard_manager?.url || '',
      timeout: 10000,
      retries: 1,
    });
  }

  async getLeadingIndicators(opportunityId: string, tenantId: string): Promise<GetLeadingIndicatorsResult> {
    const indicators: LeadingIndicator[] = [];

    // --- days_since_activity, activity_count_30d: from shard-manager related (c_email, c_call, c_meeting) ---
    let daysSinceActivity: number | null = null;
    let activityCount30d = 0;
    let hasActivityData = false;
    try {
      if (this.config.services?.shard_manager?.url && this.app) {
        const token = generateServiceToken(this.app, { serviceId: 'risk-analytics', serviceName: 'risk-analytics', tenantId });
        const related = await this.shardManagerClient.get<Array<{ edge?: unknown; shard?: unknown }>>(
          `/api/v1/shards/${encodeURIComponent(opportunityId)}/related?limit=100`,
          { headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId } }
        );
        const list = Array.isArray(related) ? related : (related as { shards?: unknown[] })?.shards ?? [];
        const dates: string[] = [];
        for (const r of list) {
          const shard = (r as { shard?: unknown }).shard;
          if (shard && typeof shard === 'object') {
            const d = getActivityDate(shard as { createdAt?: string; structuredData?: Record<string, unknown> });
            if (d) dates.push(d);
          }
        }
        hasActivityData = dates.length > 0;
        const now = Date.now();
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
        for (const d of dates) {
          const t = new Date(d).getTime();
          if (t <= now && t >= thirtyDaysAgo) activityCount30d += 1;
        }
        if (dates.length > 0) {
          const maxT = Math.max(...dates.map((d) => new Date(d).getTime()));
          daysSinceActivity = Math.floor((now - maxT) / (24 * 60 * 60 * 1000));
        }
      }
    } catch {
      // leave unknown
    }
    if (daysSinceActivity != null) {
      indicators.push({
        id: 'days_since_activity',
        name: 'Days since last activity',
        status: daysSinceActivity > 21 ? 'critical' : daysSinceActivity > 14 ? 'warning' : 'ok',
        value: daysSinceActivity,
        detail: `${daysSinceActivity} days`,
      });
    } else {
      indicators.push({ id: 'days_since_activity', name: 'Days since last activity', status: 'unknown' });
    }
    indicators.push({
      id: 'activity_count_30d',
      name: 'Activity count (30d)',
      status: hasActivityData ? (activityCount30d < 2 ? 'critical' : activityCount30d < 5 ? 'warning' : 'ok') : 'unknown',
      value: hasActivityData ? activityCount30d : undefined,
      detail: hasActivityData ? `${activityCount30d} in last 30 days` : undefined,
    });

    // --- stage_stagnation: from early-warnings (risk_warnings) ---
    try {
      const container = getContainer('risk_warnings');
      const { resources } = await container.items
        .query(
          {
            query: 'SELECT * FROM c WHERE c.opportunityId = @oid AND c.signalType = @st ORDER BY c.detectedAt DESC OFFSET 0 LIMIT 1',
            parameters: [
              { name: '@oid', value: opportunityId },
              { name: '@st', value: 'stage_stagnation' },
            ],
          },
          { partitionKey: tenantId }
        )
        .fetchAll();
      const sig = resources?.[0] as { severity?: string; message?: string } | undefined;
      if (sig) {
        indicators.push({
          id: 'stage_stagnation',
          name: 'Stage stagnation',
          status: severityToStatus(String(sig.severity || '')),
          detail: sig.message,
        });
      } else {
        indicators.push({ id: 'stage_stagnation', name: 'Stage stagnation', status: 'ok' });
      }
    } catch {
      indicators.push({ id: 'stage_stagnation', name: 'Stage stagnation', status: 'ok' });
    }

    // --- stakeholder_count: optional from related contacts; stub unknown until c_contact.role (Gap 7) ---
    indicators.push({ id: 'stakeholder_count', name: 'Stakeholder count', status: 'unknown' });

    // --- champion_strength, buying_committee_coverage: stub unknown until c_contact.role (Gap 7) ---
    indicators.push({ id: 'champion_strength', name: 'Champion strength', status: 'unknown' });
    indicators.push({ id: 'buying_committee_coverage', name: 'Buying committee coverage', status: 'unknown' });

    return { indicators };
  }
}
