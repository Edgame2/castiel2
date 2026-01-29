/**
 * Data Lake Collector
 * Subscribes to risk.evaluated, writes Parquet to /risk_evaluations/year=.../month=.../day=.../
 * Also subscribes to risk.evaluated and ml.prediction.completed, writes to /ml_inference_logs/... (Plan §940, §11.3, DATA_LAKE_LAYOUT §2.3).
 * Per BI_SALES_RISK_DATA_LAKE_LAYOUT §2.1, §2.3, add-datalake-consumer skill, Plan §3.5.
 */

import amqp from 'amqplib';
import { BlobServiceClient } from '@azure/storage-blob';
import * as parquet from 'parquetjs';
import { readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import { getConfig } from '../../config';
import { log } from '../../utils/logger';
import { rabbitmqMessagesConsumedTotal } from '../../metrics';

const RISK_EVALUATED = 'risk.evaluated';
const ML_PREDICTION_COMPLETED = 'ml.prediction.completed';
const RECOMMENDATION_FEEDBACK_RECEIVED = 'recommendation.feedback.received';

/** Parquet row for risk_evaluations per §2.1 */
function eventToRow(event: Record<string, unknown>, routingKey: string): Record<string, unknown> {
  const d = (event.data as Record<string, unknown>) || event;
  const ts = (event.timestamp || d.timestamp || new Date()) as string | Date;
  const tsStr = typeof ts === 'string' ? ts : new Date(ts as Date).toISOString();
  return {
    tenantId: String(event.tenantId ?? d.tenantId ?? ''),
    opportunityId: String(d.opportunityId ?? event.opportunityId ?? ''),
    riskScore: Number(d.riskScore ?? event.riskScore ?? 0),
    categoryScores: typeof d.categoryScores === 'string' ? d.categoryScores : JSON.stringify(d.categoryScores ?? {}),
    topDrivers: d.topDrivers != null ? (typeof d.topDrivers === 'string' ? d.topDrivers : JSON.stringify(d.topDrivers)) : undefined,
    dataQuality: d.dataQuality != null ? (typeof d.dataQuality === 'string' ? d.dataQuality : JSON.stringify(d.dataQuality)) : undefined,
    timestamp: tsStr,
    evaluationId: String(d.evaluationId ?? event.evaluationId ?? ''),
  };
}

export class DataLakeCollector {
  private channel: amqp.Channel | null = null;
  private conn: amqp.ChannelModel | null = null;
  private isShuttingDown = false;

  /** Start consuming and writing to Data Lake */
  async start(): Promise<void> {
    const config = getConfig();
    const dl = config.data_lake;
    const mq = config.rabbitmq?.data_lake;

    if (!dl?.connection_string || !config.rabbitmq?.url) {
      log.warn('DataLakeCollector: data_lake.connection_string or rabbitmq.url missing, skipping');
      return;
    }
    if (!mq?.queue || !mq?.bindings?.length) {
      log.warn('DataLakeCollector: rabbitmq.data_lake.queue or bindings missing, skipping');
      return;
    }

    try {
      this.conn = await amqp.connect(config.rabbitmq.url);
      this.channel = await this.conn.createChannel();

      this.conn.on('error', (err) => {
        if (!this.isShuttingDown) log.error('DataLakeCollector RabbitMQ error', err);
      });
      this.conn.on('close', () => {
        if (!this.isShuttingDown) log.warn('DataLakeCollector RabbitMQ closed');
      });

      const ch = this.channel;
      await ch.assertExchange(config.rabbitmq.exchange, 'topic', { durable: true });
      await ch.assertQueue(mq.queue, { durable: true });
      for (const b of mq.bindings) {
        await ch.bindQueue(mq.queue, config.rabbitmq.exchange, b);
      }
      await ch.prefetch(10);

      await ch.consume(
        mq.queue,
        async (msg) => {
          if (!msg) return;
          rabbitmqMessagesConsumedTotal.inc({ queue: mq.queue });
          try {
            const event = JSON.parse(msg.content.toString()) as Record<string, unknown>;
            const key = msg.fields.routingKey as string;
            if (key === RISK_EVALUATED) {
              await this.writeRiskEvaluation(event, dl);
              const d = (event.data as Record<string, unknown>) || event;
              await this.writeInferenceLog(event, dl, {
                modelId: 'risk-evaluation',
                prediction: Number(d.riskScore ?? (event as Record<string, unknown>).riskScore ?? 0),
                featureVector: (d.categoryScores != null || d.topDrivers != null)
                  ? JSON.stringify({ categoryScores: d.categoryScores, topDrivers: d.topDrivers })
                  : undefined,
              });
            } else if (key === ML_PREDICTION_COMPLETED) {
              const d = (event.data as Record<string, unknown>) || {};
              await this.writeInferenceLog(event, dl, {
                modelId: String(d.modelId ?? 'unknown'),
                prediction: typeof d.prediction === 'number' ? d.prediction : undefined,
              });
            } else if (key === RECOMMENDATION_FEEDBACK_RECEIVED) {
              await this.writeFeedback(event, dl);
            }
            ch.ack(msg);
          } catch (e) {
            log.error('DataLakeCollector handleMessage', e, { routingKey: msg.fields.routingKey });
            ch.nack(msg, false, false);
          }
        },
        { noAck: false }
      );

      log.info('DataLakeCollector started', { queue: mq.queue, bindings: mq.bindings });
    } catch (e) {
      log.error('DataLakeCollector start failed', e);
      throw e;
    }
  }

  private async writeRiskEvaluation(event: Record<string, unknown>, dl: { connection_string: string; container: string; path_prefix: string }): Promise<void> {
    const row = eventToRow(event, RISK_EVALUATED);
    const ts = (event.timestamp || (event.data as Record<string, unknown>)?.timestamp || new Date()) as string | Date;
    const d = new Date(ts);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const prefix = (dl.path_prefix || '/risk_evaluations').replace(/^\/+/, '');
    const blobPath = `${prefix}/year=${y}/month=${m}/day=${day}/${randomUUID()}.parquet`;

    const schema = new parquet.ParquetSchema({
      tenantId: { type: 'UTF8' },
      opportunityId: { type: 'UTF8' },
      riskScore: { type: 'DOUBLE' },
      categoryScores: { type: 'UTF8' },
      topDrivers: { type: 'UTF8', optional: true },
      dataQuality: { type: 'UTF8', optional: true },
      timestamp: { type: 'UTF8' },
      evaluationId: { type: 'UTF8', optional: true },
    });

    const tmp = join(tmpdir(), `parquet-${randomUUID()}.parquet`);
    try {
      const w = await parquet.ParquetWriter.openFile(schema, tmp);
      await w.appendRow(row);
      await w.close();

      const buf = readFileSync(tmp);
      const blob = BlobServiceClient.fromConnectionString(dl.connection_string);
      const c = blob.getContainerClient(dl.container || 'risk');
      await c.createIfNotExists();
      const block = c.getBlockBlobClient(blobPath);
      await block.uploadData(buf, { blobHTTPHeaders: { blobContentType: 'application/octet-stream' } });
      log.debug('DataLakeCollector wrote Parquet', { blobPath });
    } finally {
      try { unlinkSync(tmp); } catch (_) { /* ignore */ }
    }
  }

  /**
   * Write one row to /feedback/year=.../month=.../day=.../ (Plan W1, RECOMMENDATION_FEEDBACK_COMPLETE_REQUIREMENTS).
   * Schema aligned with risk_evaluations: tenantId, opportunityId, camelCase, nested objects as JSON strings.
   */
  private async writeFeedback(
    event: Record<string, unknown>,
    dl: { connection_string: string; container: string; feedback_path_prefix?: string }
  ): Promise<void> {
    const d = (event.data as Record<string, unknown>) || event;
    const ts = (event.timestamp || d.timestamp || new Date()) as string | Date;
    const tsStr = typeof ts === 'string' ? ts : new Date(ts as Date).toISOString();
    const row: Record<string, unknown> = {
      tenantId: String(event.tenantId ?? d.tenantId ?? ''),
      opportunityId: String(d.opportunityId ?? (event as Record<string, unknown>).opportunityId ?? ''),
      recommendationId: String(d.recommendationId ?? ''),
      feedbackId: String(d.feedbackId ?? ''),
      userId: String(d.userId ?? ''),
      action: String(d.action ?? ''),
      feedbackTypeId: d.feedbackTypeId != null ? String(d.feedbackTypeId) : undefined,
      comment: d.comment != null ? String(d.comment) : undefined,
      timestamp: tsStr,
    };
    if (d.metadata != null && typeof d.metadata === 'object') {
      row.metadataRecommendation = typeof (d.metadata as Record<string, unknown>).recommendation === 'object'
        ? JSON.stringify((d.metadata as Record<string, unknown>).recommendation)
        : undefined;
      row.metadataOpportunity = typeof (d.metadata as Record<string, unknown>).opportunity === 'object'
        ? JSON.stringify((d.metadata as Record<string, unknown>).opportunity)
        : undefined;
      row.metadataFeedback = typeof (d.metadata as Record<string, unknown>).feedback === 'object'
        ? JSON.stringify((d.metadata as Record<string, unknown>).feedback)
        : undefined;
      row.metadataTiming = typeof (d.metadata as Record<string, unknown>).timing === 'object'
        ? JSON.stringify((d.metadata as Record<string, unknown>).timing)
        : undefined;
      row.metadataDisplay = typeof (d.metadata as Record<string, unknown>).display === 'object'
        ? JSON.stringify((d.metadata as Record<string, unknown>).display)
        : undefined;
    }

    const date = new Date(tsStr);
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const prefix = (dl.feedback_path_prefix || '/feedback').replace(/^\/+/, '');
    const blobPath = `${prefix}/year=${y}/month=${m}/day=${day}/${randomUUID()}.parquet`;

    const schema = new parquet.ParquetSchema({
      tenantId: { type: 'UTF8' },
      opportunityId: { type: 'UTF8' },
      recommendationId: { type: 'UTF8' },
      feedbackId: { type: 'UTF8', optional: true },
      userId: { type: 'UTF8' },
      action: { type: 'UTF8' },
      feedbackTypeId: { type: 'UTF8', optional: true },
      comment: { type: 'UTF8', optional: true },
      timestamp: { type: 'UTF8' },
      metadataRecommendation: { type: 'UTF8', optional: true },
      metadataOpportunity: { type: 'UTF8', optional: true },
      metadataFeedback: { type: 'UTF8', optional: true },
      metadataTiming: { type: 'UTF8', optional: true },
      metadataDisplay: { type: 'UTF8', optional: true },
    });

    const tmp = join(tmpdir(), `parquet-feedback-${randomUUID()}.parquet`);
    try {
      const w = await parquet.ParquetWriter.openFile(schema, tmp);
      await w.appendRow(row);
      await w.close();
      const buf = readFileSync(tmp);
      const blob = BlobServiceClient.fromConnectionString(dl.connection_string);
      const c = blob.getContainerClient(dl.container || 'risk');
      await c.createIfNotExists();
      const block = c.getBlockBlobClient(blobPath);
      await block.uploadData(buf, { blobHTTPHeaders: { blobContentType: 'application/octet-stream' } });
      log.debug('DataLakeCollector wrote feedback Parquet', { blobPath });
    } finally {
      try { unlinkSync(tmp); } catch (_) { /* ignore */ }
    }
  }

  /**
   * Write one row to /ml_inference_logs/year=.../month=.../day=.../ (DATA_LAKE_LAYOUT §2.3, Plan §940, §11.3).
   */
  private async writeInferenceLog(
    event: Record<string, unknown>,
    dl: { connection_string: string; container: string; path_prefix?: string; ml_inference_logs_prefix?: string },
    opts: { modelId: string; prediction?: number; featureVector?: string | null }
  ): Promise<void> {
    const d = (event.data as Record<string, unknown>) || event;
    const ts = (event.timestamp || d.timestamp || new Date()) as string | Date;
    const tsStr = typeof ts === 'string' ? ts : new Date(ts as Date).toISOString();
    const row: Record<string, unknown> = {
      tenantId: String(event.tenantId ?? d.tenantId ?? ''),
      opportunityId: String(d.opportunityId ?? (event as Record<string, unknown>).opportunityId ?? ''),
      modelId: opts.modelId,
      timestamp: tsStr,
    };
    if (opts.featureVector != null && opts.featureVector !== '') row.featureVector = opts.featureVector;
    if (opts.prediction != null && !Number.isNaN(opts.prediction)) row.prediction = opts.prediction;

    const date = new Date(tsStr);
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const prefix = (dl.ml_inference_logs_prefix || '/ml_inference_logs').replace(/^\/+/, '');
    const blobPath = `${prefix}/year=${y}/month=${m}/day=${day}/${randomUUID()}.parquet`;

    const schema = new parquet.ParquetSchema({
      tenantId: { type: 'UTF8' },
      opportunityId: { type: 'UTF8' },
      modelId: { type: 'UTF8' },
      timestamp: { type: 'UTF8' },
      featureVector: { type: 'UTF8', optional: true },
      prediction: { type: 'DOUBLE', optional: true },
    });

    const tmp = join(tmpdir(), `parquet-inference-${randomUUID()}.parquet`);
    try {
      const w = await parquet.ParquetWriter.openFile(schema, tmp);
      await w.appendRow(row);
      await w.close();
      const buf = readFileSync(tmp);
      const blob = BlobServiceClient.fromConnectionString(dl.connection_string);
      const c = blob.getContainerClient(dl.container || 'risk');
      await c.createIfNotExists();
      const block = c.getBlockBlobClient(blobPath);
      await block.uploadData(buf, { blobHTTPHeaders: { blobContentType: 'application/octet-stream' } });
      log.debug('DataLakeCollector wrote inference log Parquet', { blobPath });
    } finally {
      try { unlinkSync(tmp); } catch (_) { /* ignore */ }
    }
  }

  async stop(): Promise<void> {
    this.isShuttingDown = true;
    try {
      if (this.channel) { await this.channel.close(); this.channel = null; }
      if (this.conn) { await (this.conn as any).close(); this.conn = null; }
      log.info('DataLakeCollector stopped');
    } catch (e) {
      log.error('DataLakeCollector stop error', e);
    }
  }
}
