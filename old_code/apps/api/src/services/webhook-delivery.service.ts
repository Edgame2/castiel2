import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import crypto from 'crypto';
import {
  ShardEventPayload,
  WebhookConfig,
  WebhookDelivery,
} from '../types/shard-event.types.js';
import { WebhookRepository } from '../repositories/webhook.repository.js';
import { WebhookDeliveryRepository } from '../repositories/webhook-delivery.repository.js';
import { ShardEventService } from './shard-event.service.js';

// Circuit breaker constants
const MAX_CONSECUTIVE_FAILURES = 5;
const CIRCUIT_BREAKER_RESET_MS = 60 * 60 * 1000; // 1 hour

/**
 * Webhook Delivery Service
 * Handles webhook delivery with retry logic, circuit breaker, and signature verification
 */
export class WebhookDeliveryService {
  private redis: Redis;
  private monitoring: IMonitoringProvider;
  private webhookRepository: WebhookRepository;
  private deliveryRepository: WebhookDeliveryRepository;
  private eventService: ShardEventService;
  private processingInterval: NodeJS.Timeout | null = null;
  private retryInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    redis: Redis,
    monitoring: IMonitoringProvider,
    eventService: ShardEventService
  ) {
    this.redis = redis;
    this.monitoring = monitoring;
    this.eventService = eventService;
    this.webhookRepository = new WebhookRepository(monitoring);
    this.deliveryRepository = new WebhookDeliveryRepository(monitoring);
  }

  /**
   * Initialize the delivery service
   */
  async initialize(): Promise<void> {
    await this.webhookRepository.ensureContainer();
    await this.deliveryRepository.ensureContainer();

    // Start background processing
    this.startProcessing();
    this.startRetryProcessing();

    this.monitoring.trackEvent('webhookDelivery.service.initialized');
  }

  /**
   * Shutdown the delivery service
   */
  shutdown(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }
    this.monitoring.trackEvent('webhookDelivery.service.shutdown');
  }

  /**
   * Start background processing of webhook queue
   */
  private startProcessing(): void {
    // Process queue every 1 second
    this.processingInterval = setInterval(() => {
      this.processQueue().catch(err => {
        this.monitoring.trackException(err as Error, {
          operation: 'webhookDelivery.processQueue',
        });
      });
    }, 1000);
  }

  /**
   * Start retry processing
   */
  private startRetryProcessing(): void {
    // Check for retries every 30 seconds
    this.retryInterval = setInterval(() => {
      this.processRetries().catch(err => {
        this.monitoring.trackException(err as Error, {
          operation: 'webhookDelivery.processRetries',
        });
      });
    }, 30000);
  }

  /**
   * Process events from the Redis queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {return;}
    this.isProcessing = true;

    try {
      // Get all tenant queue keys for both shard and audit events
      const shardQueueKeys = await this.redis.keys('webhook:queue:*');
      const auditQueueKeys = await this.redis.keys('webhook:audit:queue:*');

      // Process shard events
      for (const queueKey of shardQueueKeys) {
        // Process up to 10 events per tenant per cycle
        for (let i = 0; i < 10; i++) {
          const eventJson = await this.redis.rpop(queueKey);
          if (!eventJson) {break;}

          try {
            const payload = JSON.parse(eventJson) as ShardEventPayload;
            await this.processEvent(payload);
          } catch (error) {
            this.monitoring.trackException(error as Error, {
              operation: 'webhookDelivery.processEvent',
              queueKey,
            });
          }
        }
      }

      // Process audit events
      for (const queueKey of auditQueueKeys) {
        // Process up to 10 events per tenant per cycle
        for (let i = 0; i < 10; i++) {
          const eventJson = await this.redis.rpop(queueKey);
          if (!eventJson) {break;}

          try {
            const payload = JSON.parse(eventJson);
            await this.processAuditEvent(payload);
          } catch (error) {
            this.monitoring.trackException(error as Error, {
              operation: 'webhookDelivery.processAuditEvent',
              queueKey,
            });
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single event - find matching webhooks and queue deliveries
   */
  private async processEvent(payload: ShardEventPayload): Promise<void> {
    const { tenantId, eventType } = payload;

    // Find all active webhooks subscribed to this event
    const webhooks = await this.webhookRepository.findActiveByEventType(tenantId, eventType);

    for (const webhook of webhooks) {
      // Check filters
      if (!this.matchesFilters(webhook, payload)) {
        continue;
      }

      // Create delivery record
      const delivery = await this.deliveryRepository.create(
        webhook.id,
        tenantId,
        payload,
        webhook.retryCount + 1 // maxAttempts = retryCount + initial attempt
      );

      // Attempt immediate delivery
      await this.attemptDelivery(webhook, delivery);
    }
  }

  /**
   * Process a single audit event - find matching webhooks and queue deliveries
   */
  private async processAuditEvent(payload: any): Promise<void> {
    const { tenantId, action } = payload;

    // Find all active webhooks for this tenant
    const result = await this.webhookRepository.list({
      tenantId,
      isActive: true,
    });
    
    for (const webhook of result.webhooks) {
      // Check if webhook subscribes to audit events
      // Webhook events might include audit event types (document.*)
      const hasAuditSubscription = (webhook.events as any[]).some((evt: any) => 
        typeof evt === 'string' && evt.startsWith('document.')
      );
      
      if (!hasAuditSubscription) {continue;}

      // Create delivery record for audit event
      const delivery = await this.deliveryRepository.create(
        webhook.id,
        tenantId,
        payload,
        webhook.retryCount + 1 // maxAttempts = retryCount + initial attempt
      );

      // Attempt immediate delivery
      await this.attemptDelivery(webhook, delivery);
    }
  }

  /**
   * Check if event matches webhook filters
   */
  private matchesFilters(webhook: WebhookConfig, payload: ShardEventPayload): boolean {
    const { filters } = webhook;
    if (!filters) {return true;}

    // Check shard type filter
    if (filters.shardTypeIds && filters.shardTypeIds.length > 0) {
      if (!filters.shardTypeIds.includes(payload.shardTypeId)) {
        return false;
      }
    }

    // Check status filter (for shards with status in snapshot)
    if (filters.status && filters.status.length > 0 && payload.shardSnapshot) {
      const shardStatus = (payload.shardSnapshot as any).status;
      if (shardStatus && !filters.status.includes(shardStatus)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Attempt to deliver a webhook
   */
  private async attemptDelivery(webhook: WebhookConfig, delivery: WebhookDelivery): Promise<void> {
    const startTime = Date.now();

    try {
      // Generate HMAC signature
      const payloadString = JSON.stringify(delivery.payload);
      const signature = this.generateSignature(payloadString, webhook.secret);

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Webhook-Id': webhook.id,
        'X-Webhook-Signature': signature,
        'X-Event-Id': delivery.payload.eventId,
        'X-Event-Type': delivery.payload.eventType,
        'X-Timestamp': new Date().toISOString(),
        ...(webhook.headers || {}),
      };

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), webhook.timeoutMs);

      try {
        const response = await fetch(webhook.url, {
          method: webhook.method,
          headers,
          body: payloadString,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;
        const responseBody = await response.text();

        if (response.ok) {
          // Success
          await this.deliveryRepository.updateAfterAttempt(delivery.id, delivery.tenantId, {
            status: 'success',
            responseStatus: response.status,
            responseBody,
            responseTime,
          });

          // Reset webhook failure count
          await this.webhookRepository.updateStatus(webhook.id, webhook.tenantId, {
            failureCount: 0,
            lastTriggeredAt: new Date(),
          });

          this.monitoring.trackEvent('webhookDelivery.success', {
            webhookId: webhook.id,
            deliveryId: delivery.id,
            responseTime,
          });
        } else {
          // HTTP error
          await this.handleDeliveryFailure(webhook, delivery, {
            responseStatus: response.status,
            responseBody,
            responseTime,
            error: `HTTP ${response.status}: ${response.statusText}`,
          });
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);

        if (fetchError.name === 'AbortError') {
          await this.handleDeliveryFailure(webhook, delivery, {
            responseTime: webhook.timeoutMs,
            error: 'Request timeout',
          });
        } else {
          await this.handleDeliveryFailure(webhook, delivery, {
            responseTime: Date.now() - startTime,
            error: fetchError.message,
          });
        }
      }
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'webhookDelivery.attemptDelivery',
        webhookId: webhook.id,
        deliveryId: delivery.id,
      });

      await this.handleDeliveryFailure(webhook, delivery, {
        error: (error as Error).message,
      });
    }
  }

  /**
   * Handle delivery failure - schedule retry or mark as failed
   */
  private async handleDeliveryFailure(
    webhook: WebhookConfig,
    delivery: WebhookDelivery,
    result: {
      responseStatus?: number;
      responseBody?: string;
      responseTime?: number;
      error: string;
    }
  ): Promise<void> {
    const newAttempts = delivery.attempts + 1;
    const maxAttempts = delivery.maxAttempts;

    if (newAttempts < maxAttempts) {
      // Schedule retry with exponential backoff
      const delayMs = webhook.retryDelayMs * Math.pow(2, newAttempts - 1);
      const nextRetryAt = new Date(Date.now() + delayMs);

      await this.deliveryRepository.updateAfterAttempt(delivery.id, delivery.tenantId, {
        status: 'retrying',
        responseStatus: result.responseStatus,
        responseBody: result.responseBody,
        responseTime: result.responseTime,
        error: result.error,
        nextRetryAt,
      });

      this.monitoring.trackEvent('webhookDelivery.scheduled_retry', {
        webhookId: webhook.id,
        deliveryId: delivery.id,
        attempt: newAttempts,
        nextRetryAt: nextRetryAt.toISOString(),
      });
    } else {
      // Max retries reached - mark as failed
      await this.deliveryRepository.updateAfterAttempt(delivery.id, delivery.tenantId, {
        status: 'failed',
        responseStatus: result.responseStatus,
        responseBody: result.responseBody,
        responseTime: result.responseTime,
        error: result.error,
      });

      // Update webhook failure count and potentially disable
      const newFailureCount = webhook.failureCount + 1;
      const updates: { failureCount: number; lastError: string; isActive?: boolean } = {
        failureCount: newFailureCount,
        lastError: result.error,
      };

      // Circuit breaker: disable webhook after too many consecutive failures
      if (newFailureCount >= MAX_CONSECUTIVE_FAILURES) {
        updates.isActive = false;
        this.monitoring.trackEvent('webhookDelivery.circuit_breaker_tripped', {
          webhookId: webhook.id,
          failureCount: newFailureCount,
        });
      }

      await this.webhookRepository.updateStatus(webhook.id, webhook.tenantId, updates);

      this.monitoring.trackEvent('webhookDelivery.failed', {
        webhookId: webhook.id,
        deliveryId: delivery.id,
        attempts: newAttempts,
        error: result.error,
      });
    }
  }

  /**
   * Process pending retries
   */
  private async processRetries(): Promise<void> {
    try {
      const pendingRetries = await this.deliveryRepository.findPendingRetries(undefined, 50);

      for (const delivery of pendingRetries) {
        const webhook = await this.webhookRepository.findById(delivery.webhookId, delivery.tenantId);

        if (!webhook) {
          // Webhook was deleted, mark delivery as failed
          await this.deliveryRepository.updateAfterAttempt(delivery.id, delivery.tenantId, {
            status: 'failed',
            error: 'Webhook configuration was deleted',
          });
          continue;
        }

        if (!webhook.isActive) {
          // Webhook is disabled, mark delivery as failed
          await this.deliveryRepository.updateAfterAttempt(delivery.id, delivery.tenantId, {
            status: 'failed',
            error: 'Webhook is disabled',
          });
          continue;
        }

        await this.attemptDelivery(webhook, delivery);
      }
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'webhookDelivery.processRetries',
      });
    }
  }

  /**
   * Generate HMAC-SHA256 signature for payload
   */
  private generateSignature(payload: string, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload, 'utf8');
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Verify webhook signature (utility for webhook consumers)
   */
  static verifySignature(payload: string, signature: string, secret: string): boolean {
    const expected = `sha256=${crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex')}`;
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }

  /**
   * Manually trigger a webhook delivery (for testing)
   */
  async triggerManual(webhookId: string, tenantId: string, payload: ShardEventPayload): Promise<WebhookDelivery> {
    const webhook = await this.webhookRepository.findById(webhookId, tenantId);
    if (!webhook) {
      throw new Error(`Webhook not found: ${webhookId}`);
    }

    const delivery = await this.deliveryRepository.create(
      webhookId,
      tenantId,
      payload,
      1 // Single attempt for manual triggers
    );

    await this.attemptDelivery(webhook, delivery);

    // Return updated delivery
    const updated = await this.deliveryRepository.findById(delivery.id, tenantId);
    return updated || delivery;
  }

  /**
   * Retry a specific failed delivery
   */
  async retryDelivery(deliveryId: string, tenantId: string): Promise<WebhookDelivery> {
    const delivery = await this.deliveryRepository.findById(deliveryId, tenantId);
    if (!delivery) {
      throw new Error(`Delivery not found: ${deliveryId}`);
    }

    if (delivery.status !== 'failed') {
      throw new Error(`Cannot retry delivery with status: ${delivery.status}`);
    }

    const webhook = await this.webhookRepository.findById(delivery.webhookId, tenantId);
    if (!webhook) {
      throw new Error(`Webhook not found: ${delivery.webhookId}`);
    }

    // Reset delivery for retry
    const resetDelivery: WebhookDelivery = {
      ...delivery,
      status: 'pending',
      attempts: 0,
      maxAttempts: 1,
      error: undefined,
      nextRetryAt: undefined,
      completedAt: undefined,
    };

    await this.attemptDelivery(webhook, resetDelivery);

    // Return updated delivery
    const updated = await this.deliveryRepository.findById(deliveryId, tenantId);
    return updated || resetDelivery;
  }

  /**
   * Get webhook repository (for controller access)
   */
  getWebhookRepository(): WebhookRepository {
    return this.webhookRepository;
  }

  /**
   * Get delivery repository (for controller access)
   */
  getDeliveryRepository(): WebhookDeliveryRepository {
    return this.deliveryRepository;
  }
}











