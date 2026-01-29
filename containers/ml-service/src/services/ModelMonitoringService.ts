/**
 * Model monitoring (Plan §940). runForTenants: drift (PSI) + performance (Brier, MAE).
 * Performance: query ml_evaluations for Brier; publish ml.model.performance.degraded if > threshold.
 * Drift: PSI from /ml_inference_logs (DATA_LAKE_LAYOUT §2.3); publish ml.model.drift.detected if > psi_threshold.
 * Runbook: deployment/monitoring/runbooks/model-monitoring.md.
 */

import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import { BlobServiceClient } from '@azure/storage-blob';
import * as parquet from 'parquetjs';
import { getContainer } from '@coder/shared/database';
import { loadConfig } from '../config';
import {
  publishMlModelDriftDetected,
  publishMlModelPerformanceDegraded,
  publishMlDriftDetected,
} from '../events/publishers/MLServiceEventPublisher';
import { EvaluationService } from './EvaluationService';
import { mlDriftChecksTotal, mlDriftDetectionsTotal, mlPerformanceDegradedTotal } from '../metrics';

const PSI_MIN_SAMPLES = 30;
const PSI_BINS = 10;

type DataLakeConfig = { connection_string: string; container: string; ml_inference_logs_prefix?: string };

function toYYYYMMDD(d: Date): { y: number; m: string; d: string } {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const d_ = String(d.getUTCDate()).padStart(2, '0');
  return { y, m, d: d_ };
}

/**
 * Read inference log Parquet from Data Lake for the date range; return rows with numeric prediction.
 * Path: {ml_inference_logs_prefix}/year=.../month=.../day=.../*.parquet (DATA_LAKE_LAYOUT §2.3).
 */
async function readInferenceLogsFromDataLake(
  dl: DataLakeConfig,
  from: Date,
  to: Date,
  tenantIdFilter: Set<string>
): Promise<Array<{ tenantId: string; modelId: string; prediction: number }>> {
  const base = (dl.ml_inference_logs_prefix || '/ml_inference_logs').replace(/^\/+/, '') || 'ml_inference_logs';
  const blobService = BlobServiceClient.fromConnectionString(dl.connection_string);
  const containerClient = blobService.getContainerClient(dl.container);
  const out: Array<{ tenantId: string; modelId: string; prediction: number }> = [];

  const start = new Date(from);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setUTCHours(23, 59, 59, 999);

  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const { y, m, d: day } = toYYYYMMDD(d);
    const prefix = `${base}/year=${y}/month=${m}/day=${day}/`;

    for await (const item of containerClient.listBlobsFlat({ prefix })) {
      if (!item.name.endsWith('.parquet')) continue;

      const blockBlob = containerClient.getBlockBlobClient(item.name);
      const tmpPath = join(tmpdir(), `parquet-psi-${randomUUID()}.parquet`);
      try {
        await blockBlob.downloadToFile(tmpPath);
        if (!existsSync(tmpPath)) continue;

        const reader = await parquet.ParquetReader.openFile(tmpPath);
        try {
          const cursor = reader.getCursor();
          let row: Record<string, unknown> | null = null;
          while ((row = await cursor.next()) != null) {
            const tenantId = String(row.tenantId ?? '');
            if (tenantIdFilter.size > 0 && !tenantIdFilter.has(tenantId)) continue;
            const modelId = String(row.modelId ?? '');
            const p = row.prediction;
            if (typeof p !== 'number' || Number.isNaN(p)) continue;
            out.push({ tenantId, modelId, prediction: p });
          }
        } finally {
          await reader.close();
        }
      } finally {
        try {
          if (existsSync(tmpPath)) unlinkSync(tmpPath);
        } catch {
          /* ignore */
        }
      }
    }
  }
  return out;
}

/**
 * Population Stability Index: sum over bins of (current_pct - baseline_pct) * ln(current_pct / baseline_pct).
 * Bins: equal-width over [min(all), max(all)]. Min 2 bins worth of range; if max===min return 0.
 */
function computePsi(baseline: number[], current: number[]): number {
  const all = [...baseline, ...current];
  if (all.length === 0) return 0;
  const min = Math.min(...all);
  const max = Math.max(...all);
  if (max <= min) return 0;

  const width = (max - min) / PSI_BINS;
  const bCounts = new Array(PSI_BINS).fill(0);
  const cCounts = new Array(PSI_BINS).fill(0);

  for (const v of baseline) {
    let i = Math.min(Math.floor((v - min) / width), PSI_BINS - 1);
    if (v >= max) i = PSI_BINS - 1;
    if (i >= 0) bCounts[i]++;
  }
  for (const v of current) {
    let i = Math.min(Math.floor((v - min) / width), PSI_BINS - 1);
    if (v >= max) i = PSI_BINS - 1;
    if (i >= 0) cCounts[i]++;
  }

  const bSum = baseline.length;
  const cSum = current.length;
  let psi = 0;
  const eps = 1e-6;
  for (let i = 0; i < PSI_BINS; i++) {
    const b = bCounts[i] / bSum || eps;
    const c = cCounts[i] / cSum || eps;
    psi += (c - b) * Math.log(c / b);
  }
  return psi;
}

export class ModelMonitoringService {
  /**
   * Run model monitoring for the given tenants. Performance: Brier from ml_evaluations; Drift: PSI from /ml_inference_logs.
   */
  async runForTenants(tenantIds: string[]): Promise<{ driftChecked: number; performanceChecked: number }> {
    let performanceChecked = 0;
    let driftChecked = 0;
    try {
      const config = loadConfig();
      const brierThreshold = config.model_monitoring?.brier_threshold ?? 0.2;
      const maeThreshold = config.model_monitoring?.mae_threshold ?? 0.2;
      const psiThreshold = config.model_monitoring?.psi_threshold ?? 0.2;
      const containerName = config.cosmos_db?.containers?.evaluations ?? 'ml_evaluations';
      const container = getContainer(containerName);

      for (const tenantId of tenantIds) {
        const { resources } = await container.items
          .query({
            query: 'SELECT TOP 100 * FROM c WHERE c.tenantId = @tenantId',
            parameters: [{ name: '@tenantId', value: tenantId }],
          })
          .fetchNext();

        for (const doc of resources) {
          const modelId = (doc.modelId as string) ?? 'unknown';

          const brier =
            (typeof doc.brier === 'number' ? doc.brier : null) ??
            (typeof doc.metrics?.brier === 'number' ? doc.metrics.brier : null) ??
            (typeof doc.metrics?.Brier === 'number' ? doc.metrics.Brier : null);
          if (typeof brier === 'number') {
            performanceChecked += 1;
            if (brier > brierThreshold) {
              await publishMlModelPerformanceDegraded(tenantId, {
                modelId,
                metric: 'brier',
                value: brier,
                threshold: brierThreshold,
              });
              mlPerformanceDegradedTotal.inc({ model: modelId, metric: 'brier' });
            }
          }

          const mae =
            (typeof doc.mae === 'number' ? doc.mae : null) ??
            (typeof (doc.metrics as Record<string, unknown>)?.mae === 'number' ? (doc.metrics as Record<string, unknown>).mae : null) ??
            (typeof (doc.metrics as Record<string, unknown>)?.MAE === 'number' ? (doc.metrics as Record<string, unknown>).MAE : null);
          if (typeof mae === 'number') {
            performanceChecked += 1;
            if (mae > maeThreshold) {
              await publishMlModelPerformanceDegraded(tenantId, {
                modelId,
                metric: 'mae',
                value: mae,
                threshold: maeThreshold,
              });
              mlPerformanceDegradedTotal.inc({ model: modelId, metric: 'mae' });
            }
          }
        }
      }

      // Drift (PSI) from /ml_inference_logs when data_lake is configured (Plan §11.3, model-monitoring runbook §5)
      const dl = config.data_lake;
      if (dl?.connection_string && dl?.container && tenantIds.length > 0) {
        try {
          const now = new Date();
          const curEnd = new Date(now);
          const curStart = new Date(now);
          curStart.setUTCDate(curStart.getUTCDate() - 7);
          const baseEnd = new Date(now);
          baseEnd.setUTCDate(baseEnd.getUTCDate() - 30);
          const baseStart = new Date(now);
          baseStart.setUTCDate(baseStart.getUTCDate() - 60);

          const tenantSet = new Set(tenantIds);
          const [baselineRows, currentRows] = await Promise.all([
            readInferenceLogsFromDataLake(dl, baseStart, baseEnd, tenantSet),
            readInferenceLogsFromDataLake(dl, curStart, curEnd, tenantSet),
          ]);

          const key = (t: string, m: string) => `${t}\t${m}`;
          const baseMap = new Map<string, number[]>();
          const curMap = new Map<string, number[]>();
          for (const r of baselineRows) {
            const k = key(r.tenantId, r.modelId);
            if (!baseMap.has(k)) baseMap.set(k, []);
            baseMap.get(k)!.push(r.prediction);
          }
          for (const r of currentRows) {
            const k = key(r.tenantId, r.modelId);
            if (!curMap.has(k)) curMap.set(k, []);
            curMap.get(k)!.push(r.prediction);
          }

          for (const k of baseMap.keys()) {
            const [tenantId, modelId] = k.split('\t');
            const base = baseMap.get(k)!;
            const cur = curMap.get(k) ?? [];
            if (base.length >= PSI_MIN_SAMPLES && cur.length >= PSI_MIN_SAMPLES) {
              driftChecked += 1;
              mlDriftChecksTotal.inc({ model: modelId });
              const psi = computePsi(base, cur);
              if (psi > psiThreshold) {
                await publishMlModelDriftDetected(tenantId, { modelId, metric: 'psi', delta: psi });
                await publishMlDriftDetected(tenantId, { modelId, metric: 'psi', value: psi, threshold: psiThreshold });
                const evaluationService = new EvaluationService();
                await evaluationService.recordDrift(tenantId, modelId, 'psi', psi, {
                  threshold: psiThreshold,
                  segment: undefined,
                });
                mlDriftDetectionsTotal.inc({ model: modelId });
              }
            }
          }
        } catch (e: unknown) {
          console.warn('ml-service: ModelMonitoringService PSI error', e);
        }
      }

      return { driftChecked, performanceChecked };
    } catch (e: unknown) {
      console.warn('ml-service: ModelMonitoringService.runForTenants error', e);
      return { driftChecked: 0, performanceChecked: 0 };
    }
  }
}
