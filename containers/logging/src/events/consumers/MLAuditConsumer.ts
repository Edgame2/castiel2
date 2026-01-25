/**
 * ML Audit Consumer
 * Subscribes to risk.evaluated, risk.prediction.generated, ml.prediction.completed, remediation.workflow.completed;
 * writes to audit Blob (immutable). Per FIRST_STEPS §3, Plan §3.5, §10.
 */

import amqp from 'amqplib';
import { BlobServiceClient } from '@azure/storage-blob';
import { randomUUID } from 'crypto';
import { getConfig } from '../../config';
import { log } from '../../utils/logger';

export class MLAuditConsumer {
  private channel: amqp.Channel | null = null;
  private conn: amqp.ChannelModel | null = null;
  private isShuttingDown = false;

  async start(): Promise<void> {
    const config = getConfig();
    const dl = config.data_lake;
    const mq = config.rabbitmq?.ml_audit;

    if (!dl?.connection_string || !config.rabbitmq?.url) {
      log.warn('MLAuditConsumer: data_lake.connection_string or rabbitmq.url missing, skipping');
      return;
    }
    if (!mq?.queue || !mq?.bindings?.length) {
      log.warn('MLAuditConsumer: rabbitmq.ml_audit.queue or bindings missing, skipping');
      return;
    }

    try {
      this.conn = await amqp.connect(config.rabbitmq.url);
      this.channel = await this.conn.createChannel();

      this.conn.on('error', (err) => {
        if (!this.isShuttingDown) log.error('MLAuditConsumer RabbitMQ error', err);
      });
      this.conn.on('close', () => {
        if (!this.isShuttingDown) log.warn('MLAuditConsumer RabbitMQ closed');
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
          try {
            const event = JSON.parse(msg.content.toString()) as Record<string, unknown>;
            await this.writeAuditBlob(event, msg.fields.routingKey as string, dl);
            ch.ack(msg);
          } catch (e) {
            log.error('MLAuditConsumer handleMessage', e, { routingKey: msg.fields.routingKey });
            ch.nack(msg, false, false);
          }
        },
        { noAck: false }
      );

      log.info('MLAuditConsumer started', { queue: mq.queue, bindings: mq.bindings });
    } catch (e) {
      log.error('MLAuditConsumer start failed', e);
      throw e;
    }
  }

  private async writeAuditBlob(
    event: Record<string, unknown>,
    routingKey: string,
    dl: { connection_string: string; container: string; audit_path_prefix: string }
  ): Promise<void> {
    const ts = (event.timestamp || (event.data as Record<string, unknown>)?.timestamp || new Date()) as string | Date;
    const d = new Date(ts);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const prefix = (dl.audit_path_prefix || '/ml_audit').replace(/^\/+/, '');
    const id = (event.id ?? (event.data as Record<string, unknown>)?.id ?? randomUUID()) as string;
    const safe = id.replace(/[^a-zA-Z0-9_-]/g, '_');
    const blobPath = `${prefix}/year=${y}/month=${m}/day=${day}/${routingKey.replace(/[^a-zA-Z0-9._-]/g, '_')}-${safe}.json`;

    const audit = {
      eventType: routingKey,
      timestamp: typeof ts === 'string' ? ts : new Date(ts as Date).toISOString(),
      tenantId: event.tenantId,
      userId: (event.data as Record<string, unknown>)?.userId ?? event.userId,
      data: event.data ?? event,
      id: event.id,
      source: event.source,
    };

    const blob = BlobServiceClient.fromConnectionString(dl.connection_string);
    const c = blob.getContainerClient(dl.container || 'risk');
    await c.createIfNotExists();
    const block = c.getBlockBlobClient(blobPath);
    await block.uploadData(Buffer.from(JSON.stringify(audit), 'utf8'), { blobHTTPHeaders: { blobContentType: 'application/json' } });
    log.debug('MLAuditConsumer wrote audit blob', { blobPath });
  }

  async stop(): Promise<void> {
    this.isShuttingDown = true;
    try {
      if (this.channel) { await this.channel.close(); this.channel = null; }
      if (this.conn) { await (this.conn as any).close(); this.conn = null; }
      log.info('MLAuditConsumer stopped');
    } catch (e) {
      log.error('MLAuditConsumer stop error', e);
    }
  }
}
