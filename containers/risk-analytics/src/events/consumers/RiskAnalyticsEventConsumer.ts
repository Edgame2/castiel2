/**
 * Event consumer for risk analytics
 * Consumes opportunity change events and triggers risk evaluation/scoring
 */

import { EventConsumer } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { loadConfig } from '../../config';
import { log } from '../../utils/logger';
import { publishRiskAnalyticsEvent, publishOpportunityOutcomeRecorded } from '../publishers/RiskAnalyticsEventPublisher';
import { RiskEvaluationService } from '../../services/RiskEvaluationService';

let consumer: EventConsumer | null = null;
let riskEvaluationService: RiskEvaluationService | null = null;
// Note: Event consumer creates service without Fastify app - service will handle gracefully

/**
 * If outcome_feedback.publish_on_shard_update (Plan §904): fetch shard from shard-manager,
 * when IsClosed and CloseDate in last 24h, publish opportunity.outcome.recorded.
 */
async function tryPublishOutcomeOnShardUpdate(opportunityId: string, tenantId: string): Promise<void> {
  const config = loadConfig();
  if (config.outcome_feedback?.publish_on_shard_update !== true || !config.services?.shard_manager?.url) return;
  const base = (config.services.shard_manager.url as string).replace(/\/$/, '');
  let res: Response;
  try {
    res = await fetch(`${base}/api/v1/shards/${opportunityId}`, { headers: { 'X-Tenant-ID': tenantId } });
  } catch (e) {
    log.debug('tryPublishOutcomeOnShardUpdate: shard fetch error', { opportunityId, err: e instanceof Error ? e.message : String(e), service: 'risk-analytics' });
    return;
  }
  if (!res.ok) {
    log.debug('tryPublishOutcomeOnShardUpdate: shard fetch failed', { opportunityId, status: res.status, service: 'risk-analytics' });
    return;
  }
  const body = (await res.json()) as { structuredData?: { IsClosed?: boolean; IsWon?: boolean; CloseDate?: string; Amount?: number; CompetitorIds?: string[] }; updatedAt?: string };
  const sd = body.structuredData ?? {};
  if (!sd.IsClosed) return;
  const closeDt = sd.CloseDate ? new Date(sd.CloseDate) : (body.updatedAt ? new Date(body.updatedAt) : null);
  if (!closeDt) return;
  const since = new Date();
  since.setHours(since.getHours() - 24);
  if (closeDt < since) return;
  const outcome: 'won' | 'lost' = sd.IsWon ? 'won' : 'lost';
  const competitorId = outcome === 'lost' && Array.isArray(sd.CompetitorIds) && sd.CompetitorIds[0] ? sd.CompetitorIds[0] : null;
  await publishOpportunityOutcomeRecorded({
    tenantId,
    opportunityId,
    outcome,
    competitorId,
    closeDate: closeDt.toISOString().slice(0, 10),
    amount: Number(sd.Amount ?? 0),
  });
  log.info('opportunity.outcome.recorded published on shard update (Plan §904)', { opportunityId, tenantId, outcome, service: 'risk-analytics' });
}

/**
 * Initialize event consumer
 */
export async function initializeEventConsumer(): Promise<void> {
  const config = loadConfig();
  
  if (!config.rabbitmq.url) {
    log.warn('RabbitMQ URL not configured, event consumption disabled', { service: 'risk-analytics' });
    return;
  }
  
  try {
    // Initialize risk evaluation service
    riskEvaluationService = new RiskEvaluationService();
    
    consumer = new EventConsumer({
      url: config.rabbitmq.url,
      exchange: config.rabbitmq.exchange || 'coder_events',
      queue: config.rabbitmq.queue,
      bindings: config.rabbitmq.bindings,
    });

    const ae = config.auto_evaluation;
    const skipAllAuto = ae?.enabled === false;
    const skipOnOpportunity = ae?.trigger_on_opportunity_update === false;
    const skipOnShard = ae?.trigger_on_shard_update === false;
    const skipOnRiskCatalog = ae?.trigger_on_risk_catalog_update === false;
    const maxReevals = Math.min(200, Math.max(1, ae?.max_reevaluations_per_catalog_event ?? 50));

    // Handle risk.catalog.updated / .enabled / .disabled (MISSING_FEATURES 4.1) – re-evaluate opportunities that reference the risk
    const handleRiskCatalogEvent = async (event: { tenantId: string; data?: { riskId?: string } }, eventType: string): Promise<void> => {
      if (skipAllAuto || skipOnRiskCatalog) {
        log.debug('Auto risk evaluation skipped (config)', { event: eventType, service: 'risk-analytics' });
        return;
      }
      const riskId = event.data?.riskId;
      const tenantId = event.tenantId;
      if (!riskId) {
        log.warn(`${eventType} missing riskId`, { tenantId, service: 'risk-analytics' });
        return;
      }
      if (!riskEvaluationService) {
        log.error('Risk evaluation service not initialized', { service: 'risk-analytics' });
        return;
      }
      try {
        const container = getContainer('risk_evaluations');
        const { resources } = await container.items
          .query<{ opportunityId: string }>({
            query: 'SELECT c.opportunityId FROM c JOIN r IN c.detectedRisks WHERE c.tenantId = @tenantId AND r.riskId = @riskId',
            parameters: [
              { name: '@tenantId', value: tenantId },
              { name: '@riskId', value: riskId },
            ],
          }, { partitionKey: tenantId })
          .fetchAll();
        const opportunityIds = [...new Set((resources || []).map((r) => r.opportunityId).filter(Boolean))].slice(0, maxReevals);
        log.info('Risk catalog change: re-evaluating affected opportunities', {
          eventType, riskId, tenantId, count: opportunityIds.length, service: 'risk-analytics',
        });
        for (const opportunityId of opportunityIds) {
          try {
            await riskEvaluationService.evaluateRisk({
              opportunityId,
              tenantId,
              trigger: 'risk_catalog_updated',
              options: { includeHistorical: true, includeAI: true },
            });
          } catch (err: unknown) {
            log.warn('Re-evaluation failed for opportunity', {
              opportunityId, riskId, error: err instanceof Error ? err.message : String(err), service: 'risk-analytics',
            });
          }
        }
      } catch (err: unknown) {
        log.error(`Failed to re-evaluate from ${eventType}`, err instanceof Error ? err : new Error(String(err)), { riskId, tenantId, service: 'risk-analytics' });
      }
    };

    // Handle generic opportunity.updated (MISSING_FEATURES 4.1)
    consumer.on('opportunity.updated', async (event) => {
      if (skipAllAuto || skipOnOpportunity) {
        log.debug('Auto risk evaluation skipped (config)', { event: 'opportunity.updated', service: 'risk-analytics' });
        return;
      }
      const opportunityId = event.data?.opportunityId;
      if (!opportunityId) {
        log.warn('opportunity.updated missing opportunityId', { tenantId: event.tenantId, service: 'risk-analytics' });
        return;
      }
      log.info('Opportunity updated, starting risk evaluation', { opportunityId, tenantId: event.tenantId, service: 'risk-analytics' });
      if (!riskEvaluationService) {
        log.error('Risk evaluation service not initialized', { service: 'risk-analytics' });
        return;
      }
      try {
        await riskEvaluationService.evaluateRisk({
          opportunityId,
          tenantId: event.tenantId,
          trigger: 'opportunity_updated',
          options: { includeHistorical: true, includeAI: true, includeSemanticDiscovery: false },
        });
      } catch (error: unknown) {
        log.error('Failed to evaluate risk from opportunity.updated', error instanceof Error ? error : new Error(String(error)), {
          opportunityId, tenantId: event.tenantId, service: 'risk-analytics',
        });
      }
    });

    // Handle opportunity change events from integration sync
    consumer.on('integration.opportunity.updated', async (event) => {
      if (skipAllAuto || skipOnOpportunity) {
        log.debug('Auto risk evaluation skipped (config)', { event: 'integration.opportunity.updated', service: 'risk-analytics' });
        return;
      }
      const data = event?.data ?? {};
      const opportunityId = data.opportunityId;
      const tenantId = event.tenantId ?? data.tenantId;
      if (!opportunityId || !tenantId) {
        log.warn('integration.opportunity.updated missing opportunityId or tenantId', { hasData: !!event?.data, service: 'risk-analytics' });
        return;
      }
      log.info('Opportunity change detected, starting risk evaluation', { opportunityId, tenantId, service: 'risk-analytics' });

      if (!riskEvaluationService) {
        log.error('Risk evaluation service not initialized', { service: 'risk-analytics' });
        return;
      }

      try {
        await riskEvaluationService.evaluateRisk({
          opportunityId,
          tenantId,
          trigger: 'opportunity_updated',
          options: {
            includeHistorical: true,
            includeAI: true,
            includeSemanticDiscovery: false,
          },
        });
      } catch (error: unknown) {
        log.error('Failed to evaluate risk from opportunity update', error instanceof Error ? error : new Error(String(error)), {
          opportunityId,
          tenantId,
          service: 'risk-analytics',
        });
      }
      try {
        await tryPublishOutcomeOnShardUpdate(opportunityId, tenantId);
      } catch (e) {
        log.debug('tryPublishOutcomeOnShardUpdate failed (integration.opportunity.updated)', { opportunityId, tenantId, err: e instanceof Error ? e.message : String(e), service: 'risk-analytics' });
      }
    });

    // Handle workflow-triggered risk analysis
    consumer.on('workflow.risk.analysis.requested', async (event) => {
      const data = event?.data ?? {};
      const opportunityId = data.opportunityId;
      const tenantId = event.tenantId ?? data.tenantId;
      const workflowId = data.workflowId;
      if (!opportunityId || !tenantId) {
        log.warn('workflow.risk.analysis.requested missing opportunityId or tenantId', { hasData: !!event?.data, service: 'risk-analytics' });
        return;
      }
      log.info('Workflow risk analysis requested', { workflowId, opportunityId, tenantId, service: 'risk-analytics' });

      if (!riskEvaluationService) {
        log.error('Risk evaluation service not initialized', { service: 'risk-analytics' });
        return;
      }

      try {
        await riskEvaluationService.evaluateRisk({
          opportunityId,
          tenantId,
          workflowId,
          trigger: 'workflow',
          options: {
            includeHistorical: true,
            includeAI: true,
            includeSemanticDiscovery: true,
          },
        });
      } catch (error: unknown) {
        log.error('Failed to evaluate risk from workflow', error instanceof Error ? error : new Error(String(error)), {
          opportunityId,
          tenantId,
          service: 'risk-analytics',
        });
      }
    });

    // Handle workflow-triggered risk scoring
    consumer.on('workflow.risk.scoring.requested', async (event) => {
      const data = event?.data ?? {};
      const opportunityId = data.opportunityId;
      const tenantId = event.tenantId ?? data.tenantId;
      const workflowId = data.workflowId;
      if (!opportunityId || !tenantId) {
        log.warn('workflow.risk.scoring.requested missing opportunityId or tenantId', { hasData: !!event?.data, service: 'risk-analytics' });
        return;
      }
      log.info('Workflow risk scoring requested', { workflowId, opportunityId, tenantId, service: 'risk-analytics' });

      if (!riskEvaluationService) {
        log.error('Risk evaluation service not initialized', { service: 'risk-analytics' });
        return;
      }

      try {
        const modelSelection = await riskEvaluationService.getModelSelection(tenantId, 'risk-scoring');
        const modelSelectionWithWorkflow = { ...modelSelection, workflowId };
        await riskEvaluationService.performMLRiskScoring(opportunityId, tenantId, modelSelectionWithWorkflow);
      } catch (error: unknown) {
        log.error('Failed to perform risk scoring from workflow', error instanceof Error ? error : new Error(String(error)), {
          opportunityId,
          tenantId,
          service: 'risk-analytics',
        });
      }
    });

    // Handle shard creation (MISSING_FEATURES 4.1) – only opportunity-type shards
    consumer.on('shard.created', async (event) => {
      if (skipAllAuto || skipOnShard) {
        log.debug('Auto risk evaluation skipped (config)', { event: 'shard.created', service: 'risk-analytics' });
        return;
      }
      if (event.data?.shardType !== 'opportunity' && event.data?.shardTypeName !== 'opportunity') return;
      const opportunityId = event.data?.opportunityId ?? event.data?.shardId;
      if (!opportunityId) {
        log.warn('shard.created missing opportunityId/shardId', { tenantId: event.tenantId, service: 'risk-analytics' });
        return;
      }
      log.debug('Opportunity shard created, triggering risk evaluation', { shardId: event.data.shardId, tenantId: event.tenantId, service: 'risk-analytics' });
      if (!riskEvaluationService) {
        log.error('Risk evaluation service not initialized', { service: 'risk-analytics' });
        return;
      }
      try {
        await riskEvaluationService.evaluateRisk({
          opportunityId,
          tenantId: event.tenantId,
          trigger: 'shard_created',
          options: { includeHistorical: true, includeAI: true },
        });
      } catch (error: unknown) {
        log.error('Failed to evaluate risk from shard.created', error instanceof Error ? error : new Error(String(error)), {
          shardId: event.data?.shardId, tenantId: event.tenantId, service: 'risk-analytics',
        });
      }
    });

    // Handle shard updates – only opportunity-type shards; honor auto_evaluation
    consumer.on('shard.updated', async (event) => {
      if (skipAllAuto || skipOnShard) {
        log.debug('Auto risk evaluation skipped (config)', { event: 'shard.updated', service: 'risk-analytics' });
        return;
      }
      if (event.data?.shardType !== 'opportunity' && event.data?.shardTypeName !== 'opportunity') return;
      const opportunityId = event.data?.opportunityId ?? event.data?.shardId;
      if (!opportunityId) {
        log.warn('shard.updated missing opportunityId/shardId', { tenantId: event.tenantId, service: 'risk-analytics' });
        return;
      }
      log.debug('Opportunity shard updated, triggering risk evaluation', {
        shardId: event.data.shardId,
        tenantId: event.tenantId,
        service: 'risk-analytics',
      });
      if (!riskEvaluationService) {
        log.error('Risk evaluation service not initialized', { service: 'risk-analytics' });
        return;
      }
      try {
        await riskEvaluationService.evaluateRisk({
          opportunityId,
          tenantId: event.tenantId,
          trigger: 'shard_updated',
          options: { includeHistorical: true, includeAI: true },
        });
      } catch (error: unknown) {
        log.error('Failed to evaluate risk from shard update', error instanceof Error ? error : new Error(String(error)), {
          shardId: event.data?.shardId, tenantId: event.tenantId, service: 'risk-analytics',
        });
      }
      try {
        await tryPublishOutcomeOnShardUpdate(opportunityId, event.tenantId);
      } catch (e) {
        log.debug('tryPublishOutcomeOnShardUpdate failed (shard.updated)', { opportunityId, tenantId: event.tenantId, err: e instanceof Error ? e.message : String(e), service: 'risk-analytics' });
      }
    });

    consumer.on('risk.catalog.updated', (e) => handleRiskCatalogEvent(e, 'risk.catalog.updated'));
    consumer.on('risk.catalog.enabled', (e) => handleRiskCatalogEvent(e, 'risk.catalog.enabled'));
    consumer.on('risk.catalog.disabled', (e) => handleRiskCatalogEvent(e, 'risk.catalog.disabled'));

    // RiskSnapshotService: on risk.evaluated → upsert risk_snapshots (Plan §9.1, FIRST_STEPS §2)
    const { upsertFromEvent } = await import('../../services/RiskSnapshotService');
    consumer.on('risk.evaluated', async (event) => {
      try {
        await upsertFromEvent(event);
      } catch (err: unknown) {
        log.error('RiskSnapshotService.upsertFromEvent failed', err instanceof Error ? err : new Error(String(err)), {
          opportunityId: (event?.data ?? event)?.opportunityId,
          tenantId: event?.tenantId,
          service: 'risk-analytics',
        });
      }
    });

    // opportunity.outcome.recorded → append to /ml_outcomes (DATA_LAKE_LAYOUT §2.2, §3, FIRST_STEPS §5)
    const dl = config.data_lake;
    if (dl?.connection_string) {
      const { appendOutcomeRow } = await import('../../services/OutcomeDataLakeWriter');
      consumer.on('opportunity.outcome.recorded', async (event) => {
        try {
          await appendOutcomeRow(event, {
            connection_string: dl.connection_string,
            container: dl.container || 'risk',
            ml_outcomes_prefix: dl.ml_outcomes_prefix,
          });
        } catch (err: unknown) {
          log.error('OutcomeDataLakeWriter.appendOutcomeRow failed', err instanceof Error ? err : new Error(String(err)), {
            opportunityId: (event?.data ?? event)?.opportunityId,
            tenantId: event?.tenantId,
            service: 'risk-analytics',
          });
        }
      });
    } else {
      log.debug('opportunity.outcome.recorded handler skipped: data_lake.connection_string not set', { service: 'risk-analytics' });
    }

    // sentiment.trends.updated (Plan §921): ai-insights or data-enrichment publish; upsert to risk_sentiment_trends
    consumer.on('sentiment.trends.updated', async (event) => {
      const data = (event?.data ?? {}) as { opportunityId?: string; tenantId?: string; trends?: Array<{ period?: string; score?: number; sampleSize?: number }> };
      const opportunityId = data.opportunityId;
      const tenantId = event.tenantId ?? data.tenantId;
      const trends = Array.isArray(data.trends) ? data.trends : [];
      if (!opportunityId || !tenantId || trends.length === 0) {
        log.debug('sentiment.trends.updated skipped: missing opportunityId, tenantId, or trends', { service: 'risk-analytics' });
        return;
      }
      try {
        const container = getContainer('risk_sentiment_trends');
        for (const t of trends) {
          const period = String(t?.period ?? '').trim();
          if (!period || typeof t.score !== 'number') continue;
          const safePeriod = period.replace(/[/\\?#]/g, '_');
          const id = `sentiment_${tenantId}_${opportunityId}_${safePeriod}`;
          await container.items.upsert({
            id,
            tenantId,
            opportunityId,
            period,
            score: t.score,
            sampleSize: typeof t.sampleSize === 'number' ? t.sampleSize : 0,
          });
        }
        log.debug('sentiment.trends.updated: upserted to risk_sentiment_trends', { opportunityId, tenantId, count: trends.length, service: 'risk-analytics' });
      } catch (err: unknown) {
        log.error('sentiment.trends.updated handler failed', err instanceof Error ? err : new Error(String(err)), { opportunityId, tenantId, service: 'risk-analytics' });
      }
    });

    // Handle sync completion
    consumer.on('integration.sync.completed', async (event) => {
      log.info('Integration sync completed, triggering risk evaluation', {
        tenantId: event.tenantId,
        service: 'risk-analytics',
      });
      
      // Note: Sync completion doesn't specify opportunityId, so we skip evaluation
      // Individual opportunity updates will trigger evaluations via shard.updated events
    });

    await consumer.start();
    log.info('Event consumer initialized and started', { service: 'risk-analytics' });
  } catch (error) {
    log.error('Failed to initialize event consumer', error, { service: 'risk-analytics' });
    throw error;
  }
}


/**
 * Close event consumer
 */
export async function closeEventConsumer(): Promise<void> {
  if (consumer) {
    await consumer.stop();
    consumer = null;
  }
}
