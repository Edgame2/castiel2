/**
 * Re-embedding Scheduler Service
 * Scheduled batch re-embedding for shard types (MISSING_FEATURES 2.5)
 * Calls embeddings service HTTP API for regenerate-type.
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';

export class ReembeddingSchedulerService {
  private config: ReturnType<typeof loadConfig>;
  private embeddingsClient: ServiceClient;
  private app: FastifyInstance | undefined;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  constructor(app?: FastifyInstance) {
    this.config = loadConfig();
    this.app = app;
    this.embeddingsClient = new ServiceClient({
      baseURL: this.config.services.embeddings?.url || '',
      timeout: 60000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });
  }

  private getServiceToken(tenantId: string): string {
    if (!this.app) return '';
    return generateServiceToken(this.app as any, {
      serviceId: 'data-enrichment',
      serviceName: 'data-enrichment',
      tenantId,
    });
  }

  /**
   * Start the re-embedding scheduler
   */
  async start(): Promise<void> {
    if (this.intervalId) {
      log.warn('Re-embedding scheduler already running', { service: 'data-enrichment' });
      return;
    }

    const cfg = this.config.reembedding_scheduler;
    if (!cfg?.enabled) {
      log.info('Re-embedding scheduler disabled', { service: 'data-enrichment' });
      return;
    }

    const tenantIds = cfg.tenant_ids ?? [];
    const shardTypeIds = cfg.shard_type_ids ?? [];
    if (tenantIds.length === 0 || shardTypeIds.length === 0) {
      log.info('Re-embedding scheduler: tenant_ids or shard_type_ids empty, skipping', {
        service: 'data-enrichment',
      });
      return;
    }

    const intervalMs = cfg.interval_ms ?? 86400000;

    log.info('Starting re-embedding scheduler', {
      intervalMs,
      tenants: tenantIds.length,
      shardTypes: shardTypeIds.length,
      service: 'data-enrichment',
    });

    const run = async (): Promise<void> => {
      if (this.isRunning) return;
      this.isRunning = true;
      try {
        await this.runScheduledReembedding();
      } catch (err: unknown) {
        log.error('Re-embedding scheduler run failed', err, { service: 'data-enrichment' });
      } finally {
        this.isRunning = false;
      }
    };

    await run();
    this.intervalId = setInterval(run, intervalMs);
  }

  /**
   * Stop the re-embedding scheduler
   */
  async stop(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      log.info('Re-embedding scheduler stopped', { service: 'data-enrichment' });
    }
  }

  /**
   * Run scheduled re-embedding for configured tenants and shard types (calls embeddings service)
   */
  private async runScheduledReembedding(): Promise<void> {
    const cfg = this.config.reembedding_scheduler;
    const tenantIds = cfg?.tenant_ids ?? [];
    const shardTypeIds = cfg?.shard_type_ids ?? [];

    for (const tenantId of tenantIds) {
      for (const shardTypeId of shardTypeIds) {
        try {
          const token = this.getServiceToken(tenantId);
          const result = await this.embeddingsClient.post<{
            processed: number;
            failed: number;
            durationMs: number;
          }>(
            '/api/v1/shard-embeddings/regenerate-type',
            { shardTypeId, forceRegenerate: false },
            {
              headers: {
                Authorization: token ? `Bearer ${token}` : '',
                'X-Tenant-ID': tenantId,
              },
            }
          );
          log.info('Re-embedding completed for shard type', {
            shardTypeId,
            tenantId,
            processed: result?.processed ?? 0,
            failed: result?.failed ?? 0,
            durationMs: result?.durationMs ?? 0,
            service: 'data-enrichment',
          });
        } catch (err: unknown) {
          log.error('Re-embedding failed for shard type', err, {
            shardTypeId,
            tenantId,
            service: 'data-enrichment',
          });
        }
      }
    }
  }
}
