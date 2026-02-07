/**
 * Batch job worker (Plan §9.3). Consumes workflow.job.trigger from bi_batch_jobs.
 * risk-snapshot-backfill: read Data Lake /risk_evaluations/year=.../month=.../day=.../*.parquet → upsert risk_snapshots.
 * outcome-sync: query c_opportunity (IsClosed), publish opportunity.outcome.recorded.
 * industry-benchmarks: IndustryBenchmarkService.calculateAndStore.
 * risk-clustering (Plan §915): RiskClusteringService TBD (§914); stub publishes workflow.job.completed.
 * account-health (Plan §915): AccountHealthService TBD (§917); stub publishes workflow.job.completed.
 * propagation (Plan §915, §916): RiskPropagationService.computeAndPersistForTenant; stub (no persistence) until graph + Azure ML batch.
 * model-monitoring (Plan §9.3, §940): calls ml-service POST /api/v1/ml/model-monitoring/run. ml-service implements PSI (from Data Lake /ml_inference_logs), Brier and MAE (from ml_evaluations); publishes ml.model.drift.detected and ml.model.performance.degraded when thresholds are exceeded.
 */

import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import os from 'os';
import { BlobServiceClient } from '@azure/storage-blob';
import * as parquet from 'parquetjs';
import { trace } from '@opentelemetry/api';
import { EventConsumer } from '@coder/shared';
import { loadConfig } from '../../config/index.js';
import { log } from '../../utils/logger.js';
import { publishJobCompleted, publishJobFailed, publishOpportunityOutcomeRecorded } from '../publishers/RiskAnalyticsEventPublisher.js';
import { batchJobDurationSeconds, rabbitmqMessagesConsumedTotal } from '../../metrics.js';
import { upsertFromDataLakeRow } from '../../services/RiskSnapshotService.js';
import { IndustryBenchmarkService } from '../../services/IndustryBenchmarkService.js';
import { AccountHealthService } from '../../services/AccountHealthService.js';
import { RiskClusteringService } from '../../services/RiskClusteringService.js';
import { RiskPropagationService } from '../../services/RiskPropagationService.js';

let consumer: EventConsumer | null = null;

function toYYYYMMDD(d: Date): { y: number; m: string; d: string } {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const d_ = String(d.getDate()).padStart(2, '0');
  return { y, m, d: d_ };
}

/**
 * Run risk-snapshot-backfill: read Parquet from Data Lake for the date range, upsert into risk_snapshots.
 */
async function runRiskSnapshotBackfill(metadata?: { from?: string; to?: string }): Promise<void> {
  const config = loadConfig();
  const dl = config.data_lake;
  if (!dl?.connection_string || !dl.container) {
    throw new Error('data_lake.connection_string and data_lake.container are required for risk-snapshot-backfill');
  }

  const to = metadata?.to ? new Date(metadata.to) : new Date();
  const from = metadata?.from ? new Date(metadata.from) : (() => {
    const d = new Date(to);
    d.setDate(d.getDate() - 7);
    return d;
  })();

  const base = (dl.path_prefix || '/risk_evaluations').replace(/^\//, '') || 'risk_evaluations';
  const blobService = BlobServiceClient.fromConnectionString(dl.connection_string);
  const containerClient = blobService.getContainerClient(dl.container);

  let totalRows = 0;
  const startDate = new Date(from);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(to);
  endDate.setHours(23, 59, 59, 999);

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const { y, m, d: day } = toYYYYMMDD(d);
    const prefix = `${base}/year=${y}/month=${m}/day=${day}/`;

    for await (const item of containerClient.listBlobsFlat({ prefix })) {
      if (!item.name.endsWith('.parquet')) continue;

      const blockBlob = containerClient.getBlockBlobClient(item.name);
      const tmpPath = join(os.tmpdir(), `parquet-${randomUUID()}.parquet`);
      try {
        await blockBlob.downloadToFile(tmpPath);
        if (!existsSync(tmpPath)) continue;

        const reader = await parquet.ParquetReader.openFile(tmpPath);
        try {
          const cursor = reader.getCursor();
          let row: Record<string, unknown> | null = null;
          while ((row = await cursor.next()) != null) {
            await upsertFromDataLakeRow({
              tenantId: String(row.tenantId ?? ''),
              opportunityId: String(row.opportunityId ?? ''),
              riskScore: Number(row.riskScore ?? 0),
              categoryScores: row.categoryScores as Record<string, number> | string | undefined,
              topDrivers: row.topDrivers,
              dataQuality: row.dataQuality,
              timestamp: String(row.timestamp ?? new Date().toISOString()),
              evaluationId: row.evaluationId as string | undefined,
            });
            totalRows++;
          }
        } finally {
          await reader.close();
        }
      } finally {
        try { if (existsSync(tmpPath)) unlinkSync(tmpPath); } catch { /* ignore */ }
      }
    }
  }

  log.info('risk-snapshot-backfill completed', { from: startDate.toISOString(), to: endDate.toISOString(), totalRows, service: 'risk-analytics' });
  setLastRiskSnapshotBackfillAt(new Date());
}

let _lastRiskSnapshotBackfillAt: Date | null = null;
/** Last successful risk-snapshot-backfill (Plan §11.7). */
export function getLastRiskSnapshotBackfillAt(): Date | null {
  return _lastRiskSnapshotBackfillAt;
}
export function setLastRiskSnapshotBackfillAt(d: Date): void {
  _lastRiskSnapshotBackfillAt = d;
}

/** Shard from shard-manager list (minimal shape for outcome-sync). */
interface ShardRow {
  id: string;
  tenantId: string;
  updatedAt?: string;
  structuredData?: {
    IsClosed?: boolean;
    IsWon?: boolean;
    CloseDate?: string;
    Amount?: number;
    CompetitorIds?: string[];
  };
}

/**
 * Run outcome-sync (Plan §9.3, FIRST_STEPS §5): query c_opportunity (IsClosed, recently updated), publish opportunity.outcome.recorded.
 */
async function runOutcomeSync(): Promise<void> {
  const config = loadConfig();
  const os = config.outcome_sync;
  const shardUrl = config.services?.shard_manager?.url;
  if (!shardUrl) {
    throw new Error('services.shard_manager.url is required for outcome-sync');
  }
  const tenantIds: string[] = os?.tenant_ids ?? [];
  if (tenantIds.length === 0) {
    log.info('outcome-sync: no tenant_ids configured, skipping', { service: 'risk-analytics' });
    return;
  }

  const since = new Date();
  since.setHours(since.getHours() - 24);
  const shardTypeName = os?.shard_type_name || 'c_opportunity';
  let published = 0;
  const seen = new Set<string>();

  for (const tenantId of tenantIds) {
    try {
      const url = `${shardUrl.replace(/\/$/, '')}/api/v1/shards?shardTypeName=${encodeURIComponent(shardTypeName)}&limit=2000`;
      const res = await fetch(url, {
        headers: { 'X-Tenant-ID': tenantId, 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        log.warn('outcome-sync: shard-manager list failed', { tenantId, status: res.status, service: 'risk-analytics' });
        continue;
      }
      const data = (await res.json()) as { items?: ShardRow[] };
      const items = data.items ?? [];
      for (const s of items) {
        const sd = s.structuredData;
        if (!sd?.IsClosed) continue;
        const closeDt = sd.CloseDate ? new Date(sd.CloseDate) : (s.updatedAt ? new Date(s.updatedAt) : null);
        if (!closeDt || closeDt < since) continue;
        const key = `${s.id}:${(closeDt as Date).toISOString().slice(0, 10)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const outcome: 'won' | 'lost' = sd.IsWon ? 'won' : 'lost';
        const competitorId = outcome === 'lost' && Array.isArray(sd.CompetitorIds) && sd.CompetitorIds[0]
          ? sd.CompetitorIds[0]
          : null;
        await publishOpportunityOutcomeRecorded({
          tenantId: s.tenantId,
          opportunityId: s.id,
          outcome,
          competitorId,
          closeDate: (closeDt as Date).toISOString().slice(0, 10),
          amount: Number(sd.Amount ?? 0),
        });
        published++;
      }
    } catch (e) {
      log.error('outcome-sync: error for tenant', e instanceof Error ? e : new Error(String(e)), { tenantId, service: 'risk-analytics' });
      throw e;
    }
  }
  log.info('outcome-sync completed', { tenants: tenantIds.length, published, service: 'risk-analytics' });
}

export async function initializeBatchJobWorker(): Promise<void> {
  const config = loadConfig();
  const bj = config.rabbitmq?.batch_jobs;

  if (!config.rabbitmq?.url || !bj?.queue || !bj?.routing_keys?.length) {
    log.info('Batch job worker disabled: rabbitmq.batch_jobs.queue or routing_keys not set', { service: 'risk-analytics' });
    return;
  }
  // data_lake.connection_string required only for risk-snapshot-backfill; outcome-sync, industry-benchmarks, etc. run without it

  consumer = new EventConsumer({
    url: config.rabbitmq.url,
    exchange: config.rabbitmq.exchange || 'coder_events',
    queue: bj.queue,
    routingKeys: bj.routing_keys,
  });

  consumer.on('workflow.job.trigger', async (event: { data?: { job?: string; metadata?: { from?: string; to?: string; tenantId?: string; tenantIds?: string[]; industryIds?: string[]; period?: string } } }) => {
    const q = loadConfig().rabbitmq?.batch_jobs?.queue || 'bi_batch_jobs';
    rabbitmqMessagesConsumedTotal.inc({ queue: q });
    const job = event.data?.job;
    const metadata = event.data?.metadata ?? {};
    const span = trace.getTracer('risk-analytics').startSpan('batch_job.run', { attributes: { 'batch_job.name': job || 'unknown' } });
    try {
    if (job === 'industry-benchmarks') {
      const t0 = Date.now();
      const svc = new IndustryBenchmarkService();
      const tenantIds: string[] = metadata.tenantIds?.length
        ? metadata.tenantIds
        : metadata.tenantId
          ? [metadata.tenantId]
          : (loadConfig().outcome_sync?.tenant_ids ?? []);
      try {
        for (const t of tenantIds) {
          await svc.calculateAndStore(t, { industryIds: metadata.industryIds, period: metadata.period });
        }
        await publishJobCompleted('industry-benchmarks');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error('industry-benchmarks failed', err instanceof Error ? err : new Error(msg), { metadata, service: 'risk-analytics' });
        await publishJobFailed('industry-benchmarks', msg);
        throw err;
      } finally {
        batchJobDurationSeconds.observe({ job_name: 'industry-benchmarks' }, (Date.now() - t0) / 1000);
      }
      return;
    }

    if (job === 'risk-snapshot-backfill') {
      const t0 = Date.now();
      try {
        await runRiskSnapshotBackfill(metadata);
        await publishJobCompleted('risk-snapshot-backfill');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error('risk-snapshot-backfill failed', err instanceof Error ? err : new Error(msg), { metadata, service: 'risk-analytics' });
        await publishJobFailed('risk-snapshot-backfill', msg);
        throw err;
      } finally {
        batchJobDurationSeconds.observe({ job_name: 'risk-snapshot-backfill' }, (Date.now() - t0) / 1000);
      }
      return;
    }

    if (job === 'outcome-sync') {
      const t0 = Date.now();
      try {
        await runOutcomeSync();
        await publishJobCompleted('outcome-sync');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error('outcome-sync failed', err instanceof Error ? err : new Error(msg), { service: 'risk-analytics' });
        await publishJobFailed('outcome-sync', msg);
        throw err;
      } finally {
        batchJobDurationSeconds.observe({ job_name: 'outcome-sync' }, (Date.now() - t0) / 1000);
      }
      return;
    }

    if (job === 'risk-clustering') {
      const t0 = Date.now();
      const tenantIds: string[] = (metadata?.tenantIds?.length ? metadata.tenantIds : metadata?.tenantId ? [metadata.tenantId] : []) as string[];
      const resolved = tenantIds.length ? tenantIds : (loadConfig().outcome_sync?.tenant_ids ?? []);
      try {
        if (resolved.length === 0) {
          log.info('risk-clustering: no tenant_ids, skipping', { service: 'risk-analytics' });
          await publishJobCompleted('risk-clustering');
        } else {
          const svc = new RiskClusteringService();
          let clusters = 0, rules = 0;
          for (const t of resolved) {
            const r = await svc.computeAndPersistForTenant(t);
            clusters += r.clustersWritten;
            rules += r.rulesWritten;
          }
          log.info('risk-clustering completed', { tenants: resolved.length, clusters, rules, service: 'risk-analytics' });
          await publishJobCompleted('risk-clustering');
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error('risk-clustering failed', err instanceof Error ? err : new Error(msg), { metadata, service: 'risk-analytics' });
        await publishJobFailed('risk-clustering', msg);
        throw err;
      } finally {
        batchJobDurationSeconds.observe({ job_name: 'risk-clustering' }, (Date.now() - t0) / 1000);
      }
      return;
    }

    if (job === 'account-health') {
      const t0 = Date.now();
      const tenantIds: string[] = (metadata?.tenantIds?.length ? metadata.tenantIds : metadata?.tenantId ? [metadata.tenantId] : []) as string[];
      const resolved = tenantIds.length ? tenantIds : (loadConfig().outcome_sync?.tenant_ids ?? []);
      try {
        if (resolved.length === 0) {
          log.info('account-health: no tenant_ids, skipping', { service: 'risk-analytics' });
          await publishJobCompleted('account-health');
        } else {
          const svc = new AccountHealthService();
          let total = 0;
          for (const t of resolved) {
            const { computed } = await svc.computeAndPersistForTenant(t);
            total += computed;
          }
          log.info('account-health completed', { tenants: resolved.length, totalComputed: total, service: 'risk-analytics' });
          await publishJobCompleted('account-health');
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error('account-health failed', err instanceof Error ? err : new Error(msg), { metadata, service: 'risk-analytics' });
        await publishJobFailed('account-health', msg);
        throw err;
      } finally {
        batchJobDurationSeconds.observe({ job_name: 'account-health' }, (Date.now() - t0) / 1000);
      }
      return;
    }

    if (job === 'propagation') {
      const t0 = Date.now();
      const tenantIds: string[] = (metadata?.tenantIds?.length ? metadata.tenantIds : metadata?.tenantId ? [metadata.tenantId] : []) as string[];
      const resolved = tenantIds.length ? tenantIds : (loadConfig().outcome_sync?.tenant_ids ?? []);
      try {
        if (resolved.length === 0) {
          log.info('propagation: no tenant_ids, skipping', { service: 'risk-analytics' });
          await publishJobCompleted('propagation');
        } else {
          const svc = new RiskPropagationService();
          let total = 0;
          for (const t of resolved) {
            const { processed } = await svc.computeAndPersistForTenant(t);
            total += processed;
          }
          log.info('propagation completed', { tenants: resolved.length, totalProcessed: total, service: 'risk-analytics' });
          await publishJobCompleted('propagation');
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error('propagation failed', err instanceof Error ? err : new Error(msg), { metadata, service: 'risk-analytics' });
        await publishJobFailed('propagation', msg);
        throw err;
      } finally {
        batchJobDurationSeconds.observe({ job_name: 'propagation' }, (Date.now() - t0) / 1000);
      }
      return;
    }

    if (job === 'model-monitoring') {
      const t0 = Date.now();
      const mlUrl = loadConfig().services?.ml_service?.url;
      if (!mlUrl) {
        log.error('model-monitoring: services.ml_service.url required', { service: 'risk-analytics' });
        await publishJobFailed('model-monitoring', 'services.ml_service.url required');
        return;
      }
      const tenantIds: string[] = (metadata?.tenantIds?.length ? metadata.tenantIds : metadata?.tenantId ? [metadata.tenantId] : []) as string[];
      const resolved = tenantIds.length ? tenantIds : (loadConfig().outcome_sync?.tenant_ids ?? []);
      try {
        const base = mlUrl.replace(/\/$/, '');
        const res = await fetch(`${base}/api/v1/ml/model-monitoring/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantIds: resolved }),
        });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(`ml-service model-monitoring/run ${res.status}: ${t || res.statusText}`);
        }
        const data = (await res.json()) as { driftChecked?: number; performanceChecked?: number };
        log.info('model-monitoring completed', { tenants: resolved.length, driftChecked: data.driftChecked ?? 0, performanceChecked: data.performanceChecked ?? 0, service: 'risk-analytics' });
        await publishJobCompleted('model-monitoring');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error('model-monitoring failed', err instanceof Error ? err : new Error(msg), { metadata, service: 'risk-analytics' });
        await publishJobFailed('model-monitoring', msg);
        throw err;
      } finally {
        batchJobDurationSeconds.observe({ job_name: 'model-monitoring' }, (Date.now() - t0) / 1000);
      }
      return;
    }

    log.debug('BatchJobWorker: ignoring unknown job', { job, service: 'risk-analytics' });
    } finally {
      span.end();
    }
  });

  await consumer.start();
  log.info('Batch job worker started', { queue: bj.queue, service: 'risk-analytics' });
}

export async function closeBatchJobWorker(): Promise<void> {
  if (consumer) {
    try {
      await consumer.stop();
    } catch (e) {
      log.warn('Error stopping batch job worker', { error: e instanceof Error ? e.message : String(e), service: 'risk-analytics' });
    }
    consumer = null;
    log.info('Batch job worker stopped', { service: 'risk-analytics' });
  }
}
