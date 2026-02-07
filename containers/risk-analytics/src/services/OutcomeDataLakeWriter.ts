/**
 * Writes opportunity.outcome.recorded to Data Lake /ml_outcomes/... per DATA_LAKE_LAYOUT §2.2, §3.
 */

import { readFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import { BlobServiceClient } from '@azure/storage-blob';
import * as parquet from 'parquetjs';
import { log } from '../utils/logger.js';

const ML_OUTCOMES_SCHEMA = new parquet.ParquetSchema({
  tenantId: { type: 'UTF8' },
  opportunityId: { type: 'UTF8' },
  outcome: { type: 'UTF8' },
  competitorId: { type: 'UTF8', optional: true },
  closeDate: { type: 'UTF8' },
  amount: { type: 'DOUBLE' },
  recordedAt: { type: 'UTF8' },
});

/**
 * Append one outcome row to /ml_outcomes/year=Y/month=M/day=D/ per §2.2.
 */
export async function appendOutcomeRow(
  event: {
    tenantId: string;
    data?: {
      tenantId?: string;
      opportunityId?: string;
      outcome?: string;
      competitorId?: string | null;
      closeDate?: string;
      amount?: number;
    };
  },
  dl: { connection_string: string; container: string; ml_outcomes_prefix?: string }
): Promise<void> {
  const d = event.data ?? {};
  const tenantId = (event.tenantId ?? d.tenantId) as string;
  const opportunityId = (d.opportunityId ?? '') as string;
  const outcome = String(d.outcome ?? 'lost');
  const competitorId = d.competitorId != null ? String(d.competitorId) : undefined;
  const closeDate = String(d.closeDate ?? new Date().toISOString().slice(0, 10));
  const amount = Number(d.amount ?? 0);
  const recordedAt = new Date().toISOString();

  if (!tenantId || !opportunityId) {
    log.warn('OutcomeDataLakeWriter: missing tenantId or opportunityId', { service: 'risk-analytics' });
    return;
  }

  const prefix = (dl.ml_outcomes_prefix || '/ml_outcomes').replace(/^\//, '') || 'ml_outcomes';
  const rec = new Date(recordedAt);
  const y = rec.getUTCFullYear();
  const m = String(rec.getUTCMonth() + 1).padStart(2, '0');
  const day = String(rec.getUTCDate()).padStart(2, '0');
  const blobPath = `${prefix}/year=${y}/month=${m}/day=${day}/outcomes_${opportunityId}_${rec.getTime()}_${randomUUID().slice(0, 8)}.parquet`;

  const row = {
    tenantId,
    opportunityId,
    outcome,
    competitorId,
    closeDate,
    amount,
    recordedAt,
  };

  const tmp = join(tmpdir(), `ml_outcomes-${randomUUID()}.parquet`);
  try {
    const w = await parquet.ParquetWriter.openFile(ML_OUTCOMES_SCHEMA, tmp);
    await w.appendRow(row);
    await w.close();

    const buf = readFileSync(tmp);
    const blob = BlobServiceClient.fromConnectionString(dl.connection_string);
    const c = blob.getContainerClient(dl.container || 'risk');
    const block = c.getBlockBlobClient(blobPath);
    await block.uploadData(buf, { blobHTTPHeaders: { blobContentType: 'application/octet-stream' } });
    log.debug('OutcomeDataLakeWriter wrote Parquet', { blobPath, opportunityId, service: 'risk-analytics' });
  } finally {
    try {
      if (existsSync(tmp)) unlinkSync(tmp);
    } catch { /* ignore */ }
  }
}
