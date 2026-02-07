/**
 * Early Warning Service
 * Detects early-warning signals for opportunities
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config/index.js';
import { log } from '../utils/logger.js';
import { RiskEvaluationService } from './RiskEvaluationService.js';
import { publishRiskAnalyticsEvent } from '../events/publishers/RiskAnalyticsEventPublisher.js';
import { getSnapshots } from './RiskSnapshotService.js';
import { v4 as uuidv4 } from 'uuid';

export type SignalType = 'stage_stagnation' | 'activity_drop' | 'stakeholder_churn' | 'risk_acceleration' | 'anomaly';
export type SignalSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SignalEvidence {
  type: string;
  value: any;
  threshold?: any;
  description: string;
}

export interface EarlyWarningSignal {
  id: string;
  opportunityId: string;
  tenantId: string;
  signalType: SignalType;
  severity: SignalSeverity;
  message: string;
  evidence: SignalEvidence[];
  detectedAt: Date | string;
  acknowledgedAt?: Date | string;
  acknowledgedBy?: string;
}

export class EarlyWarningService {
  private readonly STAGE_STAGNATION_DAYS = 30;
  private readonly ACTIVITY_DROP_THRESHOLD = 0.5;
  private readonly RISK_ACCELERATION_THRESHOLD = 0.2;

  private config: ReturnType<typeof loadConfig>;
  private shardManagerClient: ServiceClient;
  private app: FastifyInstance | null = null;

  constructor(app?: FastifyInstance, _riskEvaluationService?: RiskEvaluationService) {
    this.app = app || null;
    this.config = loadConfig();
    
    this.shardManagerClient = new ServiceClient({
      baseURL: this.config.services.shard_manager?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

  }

  private getServiceToken(tenantId: string): string {
    if (!this.app) {
      return '';
    }
    return generateServiceToken(this.app as any, {
      serviceId: 'risk-analytics',
      serviceName: 'risk-analytics',
      tenantId,
    });
  }

  /**
   * Detect all early-warning signals for an opportunity
   */
  async detectSignals(
    opportunityId: string,
    tenantId: string,
    userId: string
  ): Promise<EarlyWarningSignal[]> {
    try {
      const token = this.getServiceToken(tenantId);
      const opportunity = await this.shardManagerClient.get<any>(
        `/api/v1/shards/${opportunityId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      if (!opportunity) {
        throw new Error(`Opportunity not found: ${opportunityId}`);
      }

      const signals: EarlyWarningSignal[] = [];

      // Check for stage stagnation
      const stagnationSignal = await this.checkStageStagnation(opportunity, tenantId);
      if (stagnationSignal) {
        signals.push(stagnationSignal);
      }

      // Check for activity drop
      const activitySignal = await this.checkActivityDrop(opportunity, tenantId);
      if (activitySignal) {
        signals.push(activitySignal);
      }

      // Check for stakeholder churn
      const churnSignal = await this.checkStakeholderChurn(opportunity, tenantId);
      if (churnSignal) {
        signals.push(churnSignal);
      }

      // Check for risk acceleration
      const riskSignal = await this.checkRiskAcceleration(opportunityId, tenantId, userId);
      if (riskSignal) {
        signals.push(riskSignal);
      }

      // Store signals
      const container = getContainer('risk_warnings');
      for (const signal of signals) {
        await container.items.create(
          { ...signal, id: signal.id, tenantId },
          { partitionKey: tenantId } as Parameters<typeof container.items.create>[1]
        );
      }

      await publishRiskAnalyticsEvent('early-warning.signals-detected', tenantId, {
        opportunityId,
        signalCount: signals.length,
      });

      return signals;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.error('Failed to detect early warning signals', err, { tenantId, opportunityId });
      throw error;
    }
  }

  private async checkStageStagnation(
    opportunity: any,
    tenantId: string
  ): Promise<EarlyWarningSignal | null> {
    const data = opportunity.structuredData || {};
    const stageDuration = data.stageDuration || 0;

    if (stageDuration >= this.STAGE_STAGNATION_DAYS) {
      return {
        id: uuidv4(),
        opportunityId: opportunity.id,
        tenantId,
        signalType: 'stage_stagnation',
        severity: stageDuration > 60 ? 'high' : 'medium',
        message: `Opportunity has been in ${data.stage} stage for ${stageDuration} days`,
        evidence: [
          {
            type: 'stage_duration',
            value: stageDuration,
            threshold: this.STAGE_STAGNATION_DAYS,
            description: `Days in current stage`,
          },
        ],
        detectedAt: new Date(),
      };
    }
    return null;
  }

  private async checkActivityDrop(
    opportunity: any,
    tenantId: string
  ): Promise<EarlyWarningSignal | null> {
    const data = opportunity.structuredData || {};
    const recentActivity = data.recentActivityCount || 0;
    const historicalActivity = data.historicalActivityCount || 1;
    const dropRatio = 1 - recentActivity / historicalActivity;

    if (dropRatio >= this.ACTIVITY_DROP_THRESHOLD) {
      return {
        id: uuidv4(),
        opportunityId: opportunity.id,
        tenantId,
        signalType: 'activity_drop',
        severity: dropRatio > 0.7 ? 'high' : 'medium',
        message: `Activity has dropped by ${(dropRatio * 100).toFixed(0)}%`,
        evidence: [
          {
            type: 'activity_drop',
            value: dropRatio,
            threshold: this.ACTIVITY_DROP_THRESHOLD,
            description: `Activity drop ratio`,
          },
        ],
        detectedAt: new Date(),
      };
    }
    return null;
  }

  private async checkStakeholderChurn(
    opportunity: any,
    tenantId: string
  ): Promise<EarlyWarningSignal | null> {
    try {
      const token = this.getServiceToken(tenantId);
      
      // Get current stakeholder relationships
      const relationshipsResponse = await this.shardManagerClient.get<any>(
        `/api/v1/shards/${opportunity.id}/relationships?relationshipType=has_stakeholder&limit=100`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      const championsResponse = await this.shardManagerClient.get<any>(
        `/api/v1/shards/${opportunity.id}/relationships?relationshipType=has_champion&limit=100`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      const currentStakeholderIds = new Set([
        ...(relationshipsResponse.edges || []).map((e: any) => e.targetShardId || e.sourceShardId),
        ...(championsResponse.edges || []).map((e: any) => e.targetShardId || e.sourceShardId),
      ]);

      // Check for recent removals by comparing with opportunity metadata
      const opportunityData = opportunity.structuredData || {};
      const previousStakeholderIds = opportunityData.previousStakeholderIds || [];
      const removedStakeholderIds = previousStakeholderIds.filter(
        (id: string) => !currentStakeholderIds.has(id)
      );

      if (removedStakeholderIds.length > 0) {
        const removedCount = removedStakeholderIds.length;
        const severity: SignalSeverity = removedCount >= 3 ? 'high' : 
                                        removedCount >= 2 ? 'medium' : 'low';

        return {
          id: uuidv4(),
          opportunityId: opportunity.id,
          tenantId,
          signalType: 'stakeholder_churn',
          severity,
          message: `${removedCount} stakeholder(s) removed from opportunity`,
          evidence: [
            {
              type: 'count',
              value: removedCount,
              threshold: 1,
              description: 'Stakeholders removed',
            },
            {
              type: 'count',
              value: currentStakeholderIds.size,
              description: 'Current stakeholders',
            },
          ],
          detectedAt: new Date(),
        };
      }

      return null;
    } catch (error: unknown) {
      log.warn('Failed to check stakeholder churn', { error: error instanceof Error ? error.message : String(error), tenantId, opportunityId: opportunity.id });
      return null;
    }
  }

  private async checkRiskAcceleration(
    opportunityId: string,
    tenantId: string,
    _userId: string
  ): Promise<EarlyWarningSignal | null> {
    try {
      // Get previous evaluation
      const container = getContainer('risk_evaluations');
      const { resources } = await container.items
        .query({
          query: 'SELECT * FROM c WHERE c.opportunityId = @opportunityId AND c.tenantId = @tenantId ORDER BY c.calculatedAt DESC',
          parameters: [
            { name: '@opportunityId', value: opportunityId },
            { name: '@tenantId', value: tenantId },
          ],
        })
        .fetchNext();

      if (resources.length < 2) {
        return null; // Need at least 2 evaluations to detect acceleration
      }

      const current = resources[0];
      const previous = resources[1];
      const riskIncrease = current.riskScore - previous.riskScore;

      if (riskIncrease >= this.RISK_ACCELERATION_THRESHOLD) {
        return {
          id: uuidv4(),
          opportunityId,
          tenantId,
          signalType: 'risk_acceleration',
          severity: riskIncrease > 0.4 ? 'high' : 'medium',
          message: `Risk score increased by ${(riskIncrease * 100).toFixed(0)}%`,
          evidence: [
            {
              type: 'risk_increase',
              value: riskIncrease,
              threshold: this.RISK_ACCELERATION_THRESHOLD,
              description: `Risk score increase`,
            },
          ],
          detectedAt: new Date(),
        };
      }
      return null;
    } catch (error: unknown) {
      log.warn('Failed to check risk acceleration', { error: error instanceof Error ? error.message : String(error), tenantId, opportunityId });
      return null;
    }
  }

  /**
   * Get warnings for an opportunity
   */
  async getWarnings(opportunityId: string, tenantId: string): Promise<EarlyWarningSignal[]> {
    try {
      const container = getContainer('risk_warnings');
      const { resources } = await container.items
        .query({
          query: 'SELECT * FROM c WHERE c.opportunityId = @opportunityId AND c.tenantId = @tenantId ORDER BY c.detectedAt DESC',
          parameters: [
            { name: '@opportunityId', value: opportunityId },
            { name: '@tenantId', value: tenantId },
          ],
        })
        .fetchNext();
      return resources || [];
    } catch (error: unknown) {
      log.error('Failed to get warnings', error instanceof Error ? error : new Error(String(error)), { tenantId, opportunityId });
      throw error;
    }
  }

  /**
   * Get 30/60/90-day risk predictions from risk_predictions (Plan §4.1, FIRST_STEPS §8).
   * Returns the latest stored prediction or a stub when none exist (Implement or stub).
   */
  async predictRiskTrajectory(
    opportunityId: string,
    tenantId: string
  ): Promise<{
    opportunityId: string;
    tenantId: string;
    predictionDate: string | null;
    horizons: { '30'?: { riskScore?: number; confidence?: number }; '60'?: { riskScore?: number; confidence?: number }; '90'?: { riskScore?: number; confidence?: number } };
    leadingIndicators: unknown[];
    modelId: string | null;
  }> {
    const container = getContainer('risk_predictions');
    const { resources } = await container.items
      .query<{ predictionDate?: string; horizons?: unknown; leadingIndicators?: unknown[]; modelId?: string }>({
        query:
          'SELECT c.predictionDate, c.horizons, c.leadingIndicators, c.modelId FROM c WHERE c.tenantId = @tenantId AND c.opportunityId = @opportunityId ORDER BY c.predictionDate DESC OFFSET 0 LIMIT 1',
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@opportunityId', value: opportunityId },
        ],
      }, { partitionKey: tenantId })
      .fetchAll();

    const row = resources?.[0];
    if (row?.horizons && typeof row.horizons === 'object') {
      return {
        opportunityId,
        tenantId,
        predictionDate: row.predictionDate ?? null,
        horizons: row.horizons as { '30'?: { riskScore?: number; confidence?: number }; '60'?: { riskScore?: number; confidence?: number }; '90'?: { riskScore?: number; confidence?: number } },
        leadingIndicators: Array.isArray(row.leadingIndicators) ? row.leadingIndicators : [],
        modelId: row.modelId ?? null,
      };
    }

    const stub = {
      '30': { riskScore: 0.5, confidence: 0.5 },
      '60': { riskScore: 0.5, confidence: 0.5 },
      '90': { riskScore: 0.5, confidence: 0.5 },
    };
    return {
      opportunityId,
      tenantId,
      predictionDate: null,
      horizons: stub,
      leadingIndicators: [],
      modelId: null,
    };
  }

  /**
   * Generate 30/60/90-day risk predictions and write to risk_predictions (Plan §4.1, §875, FIRST_STEPS §8).
   * When feature_flags.early_warning_lstm and services.ml_service.url: try LSTM (sequence from risk_snapshots).
   * If LSTM confidence >= 0.5 use it; else or on failure: rules (latest risk + velocity extrapolation).
   */
  async generatePredictions(opportunityId: string, tenantId: string): Promise<{
    id: string;
    tenantId: string;
    opportunityId: string;
    predictionDate: string;
    horizons: { '30': { riskScore: number; confidence: number }; '60': { riskScore: number; confidence: number }; '90': { riskScore: number; confidence: number } };
    leadingIndicators: unknown[];
    modelId: string;
  }> {
    const SEQUENCE_LENGTH = 30;
    let lstmResult: { risk_30: number; risk_60: number; risk_90: number; confidence: number } | null = null;

    if (this.config.feature_flags?.early_warning_lstm !== false && this.config.services?.ml_service?.url) {
      const to = new Date();
      const from = new Date(to);
      from.setDate(from.getDate() - 31);
      const rows = await getSnapshots(tenantId, opportunityId, from, to);
      const seq = rows
        .sort((a, b) => (a.snapshotDate < b.snapshotDate ? -1 : 1))
        .map((s) => [s.riskScore, 0, 0] as [number, number, number]);
      while (seq.length < SEQUENCE_LENGTH) seq.unshift([0, 0, 0]);
      if (seq.length > SEQUENCE_LENGTH) seq.splice(0, seq.length - SEQUENCE_LENGTH);

      try {
        const client = new ServiceClient({
          baseURL: this.config.services.ml_service!.url!,
          timeout: 15000,
          retries: 1,
        });
        const headers: Record<string, string> = {};
        const tok = this.getServiceToken(tenantId);
        if (tok) headers['Authorization'] = `Bearer ${tok}`;
        const res = await client.post<{ risk_30?: number; risk_60?: number; risk_90?: number; confidence?: number }>(
          '/api/v1/ml/risk-trajectory/predict',
          { sequence: seq },
          { headers }
        );
        if (res && (res.confidence ?? 0) >= 0.5) {
          lstmResult = {
            risk_30: Math.min(1, Math.max(0, res.risk_30 ?? 0.5)),
            risk_60: Math.min(1, Math.max(0, res.risk_60 ?? 0.5)),
            risk_90: Math.min(1, Math.max(0, res.risk_90 ?? 0.5)),
            confidence: Math.min(1, Math.max(0, res.confidence ?? 0.5)),
          };
        }
      } catch (e: unknown) {
        log.debug('LSTM risk-trajectory not used, falling back to rules', {
          opportunityId,
          tenantId,
          err: e instanceof Error ? e.message : String(e),
          service: 'risk-analytics',
        });
      }
    }

    let h30: number;
    let h60: number;
    let h90: number;
    let confidence: number;
    let modelId: string;

    if (lstmResult) {
      h30 = lstmResult.risk_30;
      h60 = lstmResult.risk_60;
      h90 = lstmResult.risk_90;
      confidence = lstmResult.confidence;
      modelId = 'risk-trajectory-lstm';
    } else {
      let base = 0.5;
      const snap = getContainer('risk_snapshots');
      const { resources: snapRows } = await snap.items
        .query<{ riskScore: number }>({
          query: 'SELECT TOP 1 c.riskScore FROM c WHERE c.tenantId = @tenantId AND c.opportunityId = @opportunityId ORDER BY c.snapshotDate DESC',
          parameters: [{ name: '@tenantId', value: tenantId }, { name: '@opportunityId', value: opportunityId }],
        }, { partitionKey: tenantId })
        .fetchAll();
      if (snapRows?.[0]?.riskScore != null) base = Math.min(1, Math.max(0, snapRows[0].riskScore));
      else {
        const ev = getContainer('risk_evaluations');
        const { resources: evRows } = await ev.items
          .query<{ riskScore: number }>({
            query: 'SELECT TOP 1 c.riskScore FROM c WHERE c.tenantId = @tenantId AND c.opportunityId = @opportunityId ORDER BY c.calculatedAt DESC',
            parameters: [{ name: '@tenantId', value: tenantId }, { name: '@opportunityId', value: opportunityId }],
          }, { partitionKey: tenantId })
          .fetchAll();
        if (evRows?.[0]?.riskScore != null) base = Math.min(1, Math.max(0, evRows[0].riskScore));
      }
      const { velocity } = await this.calculateRiskVelocity(opportunityId, tenantId);
      const clamp = (v: number) => Math.min(1, Math.max(0, v));
      h30 = clamp(base + velocity * 30);
      h60 = clamp(base + velocity * 60);
      h90 = clamp(base + velocity * 90);
      confidence = 0.5;
      modelId = 'rules';
    }

    const now = new Date();
    const predictionDate = now.toISOString().slice(0, 10);
    const id = `${tenantId}_${opportunityId}_${predictionDate}_${now.getTime()}`;
    const doc = {
      id,
      tenantId,
      opportunityId,
      predictionDate: now.toISOString(),
      horizons: {
        '30': { riskScore: h30, confidence },
        '60': { riskScore: h60, confidence },
        '90': { riskScore: h90, confidence },
      },
      leadingIndicators: [] as unknown[],
      modelId,
    };

    const container = getContainer('risk_predictions');
    await container.items.upsert(doc);
    return doc;
  }

  /**
   * Calculate risk velocity and acceleration from risk_snapshots (Plan §4.1, FIRST_STEPS §8).
   * velocity = change in riskScore per day (positive = risk increasing); acceleration = change in velocity per day.
   * Uses the 2–5 most recent snapshots by snapshotDate.
   */
  async calculateRiskVelocity(
    opportunityId: string,
    tenantId: string
  ): Promise<{ velocity: number; acceleration?: number; dataPoints: number }> {
    const container = getContainer('risk_snapshots');
    const { resources } = await container.items
      .query<{ snapshotDate: string; riskScore: number }>({
        query:
          'SELECT c.snapshotDate, c.riskScore FROM c WHERE c.tenantId = @tenantId AND c.opportunityId = @opportunityId ORDER BY c.snapshotDate DESC OFFSET 0 LIMIT 5',
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@opportunityId', value: opportunityId },
        ],
      }, { partitionKey: tenantId })
      .fetchAll();

    const s = resources ?? [];
    const dataPoints = s.length;
    if (dataPoints < 2) {
      return { velocity: 0, dataPoints };
    }

    const toDays = (d: string) => new Date(d).getTime() / 86400000;
    const daysBetween = (a: string, b: string) => Math.max(1 / 24, Math.abs(toDays(a) - toDays(b)));

    // s[0]=newest, s[1]=older
    const d01 = daysBetween(s[0].snapshotDate, s[1].snapshotDate);
    const velocity = (s[0].riskScore - s[1].riskScore) / d01;

    if (dataPoints < 3) {
      return { velocity, dataPoints };
    }

    const d12 = daysBetween(s[1].snapshotDate, s[2].snapshotDate);
    const vOlder = (s[1].riskScore - s[2].riskScore) / d12;
    const avgDays = (d01 + d12) / 2;
    const acceleration = avgDays > 0 ? (velocity - vOlder) / avgDays : 0;

    return { velocity, acceleration, dataPoints };
  }

  /**
   * Acknowledge a warning
   */
  async acknowledgeWarning(
    warningId: string,
    tenantId: string,
    userId: string
  ): Promise<void> {
    try {
      const container = getContainer('risk_warnings');
      const { resource } = await container.item(warningId, tenantId).read();
      if (resource) {
        await container.item(warningId, tenantId).replace({
          ...resource,
          acknowledgedAt: new Date(),
          acknowledgedBy: userId,
        });
      }
    } catch (error: unknown) {
      log.error('Failed to acknowledge warning', error instanceof Error ? error : new Error(String(error)), { tenantId, warningId });
      throw error;
    }
  }
}
