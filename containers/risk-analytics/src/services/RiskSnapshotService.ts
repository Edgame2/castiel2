/**
 * Risk Snapshot Service
 * Upserts risk_snapshots from risk.evaluated; exposes getSnapshots(opportunityId, from, to).
 * Per Plan §9.1, FIRST_STEPS §2.
 */

import { getContainer } from '@coder/shared/database';
import { log } from '../utils/logger';

export interface RiskSnapshotRow {
  id: string;
  tenantId: string;
  opportunityId: string;
  snapshotDate: string;
  riskScore: number;
  categoryScores?: Record<string, number>;
  topDrivers?: unknown;
  dataQuality?: unknown;
  /** Plan §11.11, §944: at-risk taxonomy from evaluation. */
  atRiskReasons?: string[];
  evaluationId?: string;
  timestamp: string;
}

/**
 * Upsert a risk_snapshots document from a risk.evaluated event.
 */
export async function upsertFromEvent(event: {
  tenantId?: string;
  data?: Record<string, unknown>;
  opportunityId?: string;
  riskScore?: number;
  categoryScores?: Record<string, number>;
  topDrivers?: unknown;
  dataQuality?: unknown;
  atRiskReasons?: string[];
  timestamp?: string;
  evaluationId?: string;
}): Promise<void> {
  const d = event.data ?? {};
  const tenantId = (event.tenantId ?? d.tenantId) as string;
  const opportunityId = (event.opportunityId ?? d.opportunityId) as string;
  const riskScore = Number(d.riskScore ?? event.riskScore ?? 0);
  const categoryScores = (d.categoryScores ?? event.categoryScores) as Record<string, number> | undefined;
  const topDrivers = d.topDrivers ?? event.topDrivers;
  const dataQuality = d.dataQuality ?? event.dataQuality;
  const atRiskReasons = (d.atRiskReasons ?? event.atRiskReasons) as string[] | undefined;
  const evaluationId = (d.evaluationId ?? event.evaluationId) as string | undefined;
  const ts = (d.timestamp ?? event.timestamp ?? new Date()) as string | Date;
  const date = typeof ts === 'string' ? new Date(ts) : ts;
  const snapshotDate = date.toISOString().slice(0, 10); // YYYY-MM-DD

  if (!tenantId || !opportunityId) {
    log.warn('RiskSnapshotService.upsertFromEvent: missing tenantId or opportunityId', { event, service: 'risk-analytics' });
    return;
  }

  const id = evaluationId ?? `risk_snapshots_${tenantId}_${opportunityId}_${snapshotDate}_${date.getTime()}`;
  const doc: RiskSnapshotRow = {
    id,
    tenantId,
    opportunityId,
    snapshotDate,
    riskScore,
    ...(categoryScores && { categoryScores }),
    ...(topDrivers != null && { topDrivers }),
    ...(dataQuality != null && { dataQuality }),
    ...(Array.isArray(atRiskReasons) && atRiskReasons.length > 0 && { atRiskReasons }),
    ...(evaluationId && { evaluationId }),
    timestamp: typeof ts === 'string' ? ts : date.toISOString(),
  };

  try {
    const container = getContainer('risk_snapshots');
    await container.items.upsert(doc);
    log.debug('RiskSnapshotService upserted', { id, opportunityId, snapshotDate, service: 'risk-analytics' });
  } catch (e) {
    log.error('RiskSnapshotService.upsertFromEvent failed', e instanceof Error ? e : new Error(String(e)), {
      id,
      opportunityId,
      tenantId,
      service: 'risk-analytics',
    });
    throw e;
  }
}

/**
 * Upsert a risk_snapshots document from a Data Lake Parquet row (BI_SALES_RISK_DATA_LAKE_LAYOUT §2.1).
 */
export async function upsertFromDataLakeRow(row: {
  tenantId: string;
  opportunityId: string;
  riskScore: number;
  categoryScores?: Record<string, number> | string;
  topDrivers?: unknown;
  dataQuality?: unknown;
  atRiskReasons?: string[] | string;
  timestamp: string;
  evaluationId?: string;
}): Promise<void> {
  const tenantId = row.tenantId;
  const opportunityId = row.opportunityId;
  const riskScore = Number(row.riskScore ?? 0);
  let categoryScores = row.categoryScores;
  if (typeof categoryScores === 'string') {
    try {
      categoryScores = JSON.parse(categoryScores) as Record<string, number>;
    } catch {
      categoryScores = undefined;
    }
  }
  let atRiskReasons: string[] | undefined;
  if (Array.isArray(row.atRiskReasons)) {
    atRiskReasons = row.atRiskReasons;
  } else if (typeof row.atRiskReasons === 'string') {
    try {
      atRiskReasons = JSON.parse(row.atRiskReasons) as string[];
    } catch {
      atRiskReasons = undefined;
    }
  }
  const topDrivers = row.topDrivers;
  const dataQuality = row.dataQuality;
  const evaluationId = row.evaluationId;
  const ts = row.timestamp;
  const date = new Date(ts);
  const snapshotDate = date.toISOString().slice(0, 10);

  if (!tenantId || !opportunityId) {
    log.warn('RiskSnapshotService.upsertFromDataLakeRow: missing tenantId or opportunityId', { service: 'risk-analytics' });
    return;
  }

  const id = evaluationId ?? `risk_snapshots_${tenantId}_${opportunityId}_${snapshotDate}_${date.getTime()}`;
  const doc: RiskSnapshotRow = {
    id,
    tenantId,
    opportunityId,
    snapshotDate,
    riskScore,
    ...(categoryScores && typeof categoryScores === 'object' && { categoryScores }),
    ...(topDrivers != null && { topDrivers }),
    ...(dataQuality != null && { dataQuality }),
    ...(Array.isArray(atRiskReasons) && atRiskReasons.length > 0 && { atRiskReasons }),
    ...(evaluationId && { evaluationId }),
    timestamp: ts,
  };

  try {
    const container = getContainer('risk_snapshots');
    await container.items.upsert(doc);
    log.debug('RiskSnapshotService upserted from Data Lake', { id, opportunityId, snapshotDate, service: 'risk-analytics' });
  } catch (e) {
    log.error('RiskSnapshotService.upsertFromDataLakeRow failed', e instanceof Error ? e : new Error(String(e)), { id, opportunityId, tenantId, service: 'risk-analytics' });
    throw e;
  }
}

/**
 * Get risk snapshots for an opportunity in a date range.
 * @param from - Start date (YYYY-MM-DD or Date)
 * @param to - End date (YYYY-MM-DD or Date)
 */
export async function getSnapshots(
  tenantId: string,
  opportunityId: string,
  from: string | Date,
  to: string | Date
): Promise<RiskSnapshotRow[]> {
  const fromStr = typeof from === 'string' ? from : from.toISOString().slice(0, 10);
  const toStr = typeof to === 'string' ? to : to.toISOString().slice(0, 10);

  const container = getContainer('risk_snapshots');
  const { resources } = await container.items
    .query<RiskSnapshotRow>({
      query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.opportunityId = @opportunityId AND c.snapshotDate >= @from AND c.snapshotDate <= @to ORDER BY c.snapshotDate ASC',
      parameters: [
        { name: '@tenantId', value: tenantId },
        { name: '@opportunityId', value: opportunityId },
        { name: '@from', value: fromStr },
        { name: '@to', value: toStr },
      ],
    }, { partitionKey: tenantId })
    .fetchAll();

  return resources ?? [];
}
