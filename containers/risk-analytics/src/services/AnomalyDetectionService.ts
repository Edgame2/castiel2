/**
 * Anomaly Detection Service (Plan §920)
 * Reads from risk_anomaly_alerts. Statistical (Z-score) detection runs via runStatisticalDetection;
 * persists to risk_anomaly_alerts and publishes anomaly.detected. ML (Isolation Forest) via ml-service
 * POST /api/v1/ml/anomaly/predict; persistAndPublishMLAnomaly persists and publishes when ML finds anomaly.
 */

import { randomUUID } from 'crypto';
import { getContainer } from '@coder/shared/database';
import { log } from '../utils/logger';
import { publishAnomalyDetected } from '../events/publishers/RiskAnalyticsEventPublisher';

export interface AnomalyAlert {
  id: string;
  tenantId: string;
  opportunityId: string;
  anomalyType: 'statistical' | 'ml' | 'pattern';
  subtype?: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  detectedAt: string;
  details?: Record<string, unknown>;
}

export type RunStatisticalDetectionResult =
  | { detected: false }
  | { detected: true; alert: AnomalyAlert };

/**
 * Get anomalies for an opportunity from risk_anomaly_alerts.
 */
export async function getAnomalies(opportunityId: string, tenantId: string): Promise<AnomalyAlert[]> {
  try {
    const container = getContainer('risk_anomaly_alerts');
    const { resources } = await container.items
      .query<AnomalyAlert>({
        query: 'SELECT * FROM c WHERE c.opportunityId = @opportunityId ORDER BY c.detectedAt DESC',
        parameters: [{ name: '@opportunityId', value: opportunityId }],
      }, { partitionKey: tenantId })
      .fetchAll();
    return resources ?? [];
  } catch (e) {
    log.warn('AnomalyDetectionService.getAnomalies failed', { error: e instanceof Error ? e.message : String(e), opportunityId, tenantId, service: 'risk-analytics' });
    return [];
  }
}

/**
 * Run Z-score statistical anomaly detection for an opportunity (Plan §920).
 * Reads recent riskScore from risk_snapshots (fallback: risk_evaluations). If ≥3 scores,
 * computes mean, std, zScore = (latest - mean) / (std || 1e-6). If zScore ≥ 2 → high,
 * ≥ 1.5 → medium; else returns { detected: false }. On detection: upserts to
 * risk_anomaly_alerts and publishes anomaly.detected.
 */
export async function runStatisticalDetection(
  opportunityId: string,
  tenantId: string,
  options?: { ownerId?: string }
): Promise<RunStatisticalDetectionResult> {
  const scores: number[] = [];
  try {
    const snapshots = getContainer('risk_snapshots');
    const { resources: snap } = await snapshots.items
      .query<{ riskScore: number }>({
        query: 'SELECT c.riskScore FROM c WHERE c.opportunityId = @opportunityId AND c.tenantId = @tenantId ORDER BY c.snapshotDate DESC OFFSET 0 LIMIT 10',
        parameters: [
          { name: '@opportunityId', value: opportunityId },
          { name: '@tenantId', value: tenantId },
        ],
      }, { partitionKey: tenantId })
      .fetchAll();
    for (const r of snap ?? []) {
      if (typeof r.riskScore === 'number') scores.push(r.riskScore);
    }
    if (scores.length < 3) {
      const evals = getContainer('risk_evaluations');
      const { resources: ev } = await evals.items
        .query<{ riskScore: number }>({
          query: 'SELECT c.riskScore FROM c WHERE c.opportunityId = @opportunityId AND c.tenantId = @tenantId ORDER BY c.calculatedAt DESC OFFSET 0 LIMIT 10',
          parameters: [
            { name: '@opportunityId', value: opportunityId },
            { name: '@tenantId', value: tenantId },
          ],
        }, { partitionKey: tenantId })
        .fetchAll();
      scores.length = 0;
      for (const r of ev ?? []) {
        if (typeof r.riskScore === 'number') scores.push(r.riskScore);
      }
    }
  } catch (e) {
    log.warn('AnomalyDetectionService.runStatisticalDetection: failed to read scores', { error: e instanceof Error ? e.message : String(e), opportunityId, tenantId, service: 'risk-analytics' });
    return { detected: false };
  }

  if (scores.length < 3) return { detected: false };

  const latest = scores[0];
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((s, x) => s + (x - mean) ** 2, 0) / scores.length;
  const std = Math.sqrt(variance) || 1e-6;
  const zScore = (latest - mean) / std;

  let severity: 'high' | 'medium' | 'low';
  if (zScore >= 2) severity = 'high';
  else if (zScore >= 1.5) severity = 'medium';
  else return { detected: false };

  const detectedAt = new Date().toISOString();
  const description = `Risk score spike: z-score ${zScore.toFixed(2)} (latest ${(latest * 100).toFixed(0)}% vs mean ${(mean * 100).toFixed(0)}%).`;
  const alert: AnomalyAlert = {
    id: randomUUID(),
    tenantId,
    opportunityId,
    anomalyType: 'statistical',
    subtype: 'risk_spike',
    severity,
    description,
    detectedAt,
    details: { mean, std, zScore, latestScore: latest },
  };

  try {
    const container = getContainer('risk_anomaly_alerts');
    await container.items.upsert(alert);
    await publishAnomalyDetected(tenantId, { opportunityId, anomalyType: 'statistical', severity, description, detectedAt, ownerId: options?.ownerId });
  } catch (e) {
    log.error('AnomalyDetectionService.runStatisticalDetection: upsert or publish failed', e instanceof Error ? e : new Error(String(e)), { opportunityId, tenantId, service: 'risk-analytics' });
    throw e;
  }
  return { detected: true, alert };
}

/**
 * Persist and publish when ML (Isolation Forest) finds an anomaly (Plan §5.5).
 * Call after ml-service POST /api/v1/ml/anomaly/predict returns isAnomaly==-1 or anomalyScore above threshold.
 */
export async function persistAndPublishMLAnomaly(
  opportunityId: string,
  tenantId: string,
  result: { isAnomaly: number; anomalyScore: number },
  options?: { ownerId?: string }
): Promise<RunStatisticalDetectionResult> {
  const { isAnomaly, anomalyScore } = result;
  const isAnomalyFlag = isAnomaly === -1 || (typeof anomalyScore === 'number' && anomalyScore > 0.5);
  if (!isAnomalyFlag) {
    return { detected: false };
  }
  let severity: 'high' | 'medium' | 'low' = 'low';
  if (typeof anomalyScore === 'number') {
    if (anomalyScore >= 0.7) severity = 'high';
    else if (anomalyScore >= 0.4) severity = 'medium';
  }
  const detectedAt = new Date().toISOString();
  const description = `ML anomaly (Isolation Forest): score ${(typeof anomalyScore === 'number' ? anomalyScore : 0).toFixed(2)}.`;
  const alert: AnomalyAlert = {
    id: randomUUID(),
    tenantId,
    opportunityId,
    anomalyType: 'ml',
    subtype: 'isolation_forest',
    severity,
    description,
    detectedAt,
    details: { isAnomaly, anomalyScore },
  };

  try {
    const container = getContainer('risk_anomaly_alerts');
    await container.items.upsert(alert);
    await publishAnomalyDetected(tenantId, { opportunityId, anomalyType: 'ml', severity, description, detectedAt, ownerId: options?.ownerId });
  } catch (e) {
    log.error('AnomalyDetectionService.persistAndPublishMLAnomaly: upsert or publish failed', e instanceof Error ? e : new Error(String(e)), { opportunityId, tenantId, service: 'risk-analytics' });
    throw e;
  }
  return { detected: true, alert };
}
