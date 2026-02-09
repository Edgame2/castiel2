/**
 * CRM Data Mapping Consumer
 * Consumes integration.data.raw events, applies field mappings, and stores shards
 * @module integration-processors/consumers
 */

import { EventConsumer, FieldMapperService, ShardValidator, OpportunityEventDebouncer, getCache } from '@coder/shared';
import type { ValidationConfig, ShardValidationError } from '@coder/shared';
import { loadConfig } from '../config/index.js';
import { log } from '../utils/logger.js';
import { BaseConsumer, ConsumerDependencies } from './index.js';
import { PrefetchManager } from '../utils/prefetchManager.js';
import {
  integrationDataMappedTotal,
  integrationDataMappingFailedTotal,
  integrationDataMappingDurationSeconds,
  rabbitmqMessagesConsumedTotal,
  rabbitmqMessageProcessingDurationSeconds,
  shardOperationsTotal,
  shardOperationDurationSeconds,
  idempotencyChecksTotal,
  configCacheOperationsTotal,
} from '../metrics.js';

interface IntegrationDataRawEvent {
  integrationId: string;
  tenantId: string;
  entityType: string;
  rawData: Record<string, any>;
  externalId: string;
  syncTaskId: string;
  idempotencyKey: string;
  correlationId: string;
  metadata?: Record<string, any>;
}

interface IntegrationDataRawBatchEvent {
  integrationId: string;
  tenantId: string;
  entityType: string;
  records: Array<{
    rawData: Record<string, any>;
    externalId: string;
    idempotencyKey: string;
  }>;
  syncTaskId: string;
  correlationId: string;
  batchSize: number;
  metadata?: Record<string, any>;
}

export class CRMDataMappingConsumer implements BaseConsumer {
  private consumer: EventConsumer | null = null;
  private configCacheInvalidationConsumer: EventConsumer | null = null;
  private config: ReturnType<typeof loadConfig>;
  private fieldMapper: FieldMapperService;
  private shardValidators: Map<string, ShardValidator> = new Map();
  private idempotencyCache: Map<string, boolean> = new Map(); // In-memory fallback cache
  private configCache: Map<string, { config: any; expiresAt: number }> = new Map(); // In-memory fallback cache
  private useRedisForIdempotency: boolean = false;
  private idempotencyTtl: number = 86400; // 24 hours default
  private useRedisForConfigCache: boolean = false;
  private configCacheTtl: number = 600; // 10 minutes default
  private opportunityEventBuffer: Map<
    string,
    {
      opportunityId: string;
      shardId: string;
      event: IntegrationDataRawEvent;
      timer: NodeJS.Timeout;
    }
  > = new Map();
  private batchOpportunityBuffer: Map<
    string, // tenantId:integrationId
    {
      integrationId: string;
      tenantId: string;
      opportunityIds: string[];
      shardIds: string[];
      syncTaskId: string;
      correlationId: string;
      metadata?: Record<string, any>;
      timer: NodeJS.Timeout;
    }
  > = new Map();
  private prefetchManager: PrefetchManager | null = null;
  private prefetchAdjustmentTimer: NodeJS.Timeout | null = null;
  private opportunityDebouncer: OpportunityEventDebouncer | null = null;

  constructor(private deps: ConsumerDependencies) {
    this.config = loadConfig();
    this.fieldMapper = new FieldMapperService();
    
    // Configure idempotency settings
    const idempotencyConfig = this.config.mapping?.idempotency;
    this.useRedisForIdempotency = idempotencyConfig?.use_redis !== false && idempotencyConfig?.enabled !== false;
    this.idempotencyTtl = idempotencyConfig?.ttl_seconds || 86400; // 24 hours default
    
    // Configure config cache settings
    this.useRedisForConfigCache = this.config.mapping?.config_cache_use_redis !== false;
    this.configCacheTtl = this.config.mapping?.config_cache_ttl || 600; // 10 minutes default
    
    // Initialize opportunity event debouncer (Redis-based for distributed debouncing)
    const useRedisForDebouncing = this.config.mapping?.opportunity_debounce_use_redis !== false;
    this.opportunityDebouncer = new OpportunityEventDebouncer({
      debounceWindowMs: 5000, // 5 seconds
      useRedis: useRedisForDebouncing,
      fallbackToMemory: true,
    });
    
    if (this.useRedisForIdempotency) {
      log.info('Idempotency using Redis for distributed checking', {
        ttl: this.idempotencyTtl,
        service: 'integration-processors',
      });
    } else {
      log.info('Idempotency using in-memory cache only', {
        service: 'integration-processors',
      });
    }
    
    if (this.useRedisForConfigCache) {
      log.info('Config cache using Redis for distributed caching', {
        ttl: this.configCacheTtl,
        service: 'integration-processors',
      });
    } else {
      log.info('Config cache using in-memory cache only', {
        service: 'integration-processors',
      });
    }
    
    // Initialize prefetch manager if dynamic prefetch is enabled
    if (this.config.mapping?.prefetch_auto_adjust !== false) {
      const initialPrefetch = this.config.mapping?.prefetch || 20;
      this.prefetchManager = new PrefetchManager({
        initial: initialPrefetch,
        min: this.config.mapping?.prefetch_min || 1,
        max: this.config.mapping?.prefetch_max || 100,
        adjustmentIntervalMs: this.config.mapping?.prefetch_adjustment_interval_ms || 60000,
        targetProcessingTimeMs: this.config.mapping?.prefetch_target_processing_time_ms || 1000,
        minSamples: this.config.mapping?.prefetch_min_samples || 10,
      });
      
      log.info('Dynamic prefetch manager initialized', {
        initialPrefetch,
        min: this.config.mapping?.prefetch_min || 1,
        max: this.config.mapping?.prefetch_max || 100,
        service: 'integration-processors',
      });
    }
  }

  async start(): Promise<void> {
    if (!this.config.rabbitmq?.url) {
      log.warn('RabbitMQ URL not configured, CRM mapping consumer disabled', {
        service: 'integration-processors',
      });
      return;
    }

    const queueName = this.config.mapping?.queue_name || 'integration_data_raw';
    
    // Use prefetch manager's current value if available, otherwise use config
    const initialPrefetch = this.prefetchManager
      ? this.prefetchManager.getCurrentPrefetch()
      : (this.config.mapping?.prefetch || 20);

    this.consumer = new EventConsumer({
      url: this.config.rabbitmq.url,
      exchange: this.config.rabbitmq.exchange || 'coder_events',
      queue: queueName,
      routingKeys: ['integration.data.raw', 'integration.data.raw.batch'],
      prefetch: initialPrefetch,
    });

    // Register handlers
    this.consumer.on('integration.data.raw', async (event) => {
      await this.handleRawDataEvent(event.data as IntegrationDataRawEvent);
    });

    this.consumer.on('integration.data.raw.batch', async (event) => {
      await this.handleBatchEvent(event.data as IntegrationDataRawBatchEvent);
    });

    await this.consumer.connect();
    await this.consumer.start();

    // Start cache invalidation consumer for integration.updated events
    await this.startCacheInvalidationConsumer();

    log.info('CRM Data Mapping Consumer started', {
      queue: queueName,
      service: 'integration-processors',
    });
  }

  /**
   * Start cache invalidation consumer to listen for integration.updated events
   */
  private async startCacheInvalidationConsumer(): Promise<void> {
    if (!this.config.rabbitmq?.url) {
      return;
    }

    try {
      this.configCacheInvalidationConsumer = new EventConsumer({
        url: this.config.rabbitmq.url,
        exchange: this.config.rabbitmq.exchange || 'coder_events',
        queue: `${this.config.mapping?.queue_name || 'integration_data_raw'}_cache_invalidation`,
        routingKeys: ['integration.updated', 'integration.deleted'],
        prefetch: 10,
      });

      // Handle integration.updated events
      this.configCacheInvalidationConsumer.on('integration.updated', async (event) => {
        const data = event.data as { integrationId?: string; tenantId?: string };
        if (data.integrationId && data.tenantId) {
          await this.invalidateConfigCache(data.integrationId, data.tenantId);
        }
      });

      // Handle integration.deleted events
      this.configCacheInvalidationConsumer.on('integration.deleted', async (event) => {
        const data = event.data as { integrationId?: string; tenantId?: string };
        if (data.integrationId && data.tenantId) {
          await this.invalidateConfigCache(data.integrationId, data.tenantId);
        }
      });

      await this.configCacheInvalidationConsumer.connect();
      await this.configCacheInvalidationConsumer.start();

      log.info('Config cache invalidation consumer started', {
        service: 'integration-processors',
      });
    } catch (error: any) {
      log.warn('Failed to start cache invalidation consumer', {
        error: error.message,
        service: 'integration-processors',
      });
      // Non-critical - continue without cache invalidation
    }
  }

  async stop(): Promise<void> {
    if (this.consumer) {
      await this.consumer.stop();
      this.consumer = null;
    }

    if (this.configCacheInvalidationConsumer) {
      await this.configCacheInvalidationConsumer.stop();
      this.configCacheInvalidationConsumer = null;
    }
    
    if (this.prefetchAdjustmentTimer) {
      clearInterval(this.prefetchAdjustmentTimer);
      this.prefetchAdjustmentTimer = null;
    }

    // Flush opportunity event buffer on shutdown
    log.info('Flushing opportunity event buffer on shutdown', {
      opportunityBufferSize: this.opportunityEventBuffer.size,
      batchBufferSize: this.batchOpportunityBuffer.size,
      service: 'integration-processors',
    });

    // Flush individual opportunity events (from Redis debouncer)
    if (this.opportunityDebouncer) {
      const pendingEvents = await this.opportunityDebouncer.getAllPendingEvents();
      for (const buffer of pendingEvents) {
        await this.flushOpportunityEvent(
          {
            integrationId: buffer.eventData.integrationId,
            tenantId: buffer.eventData.tenantId,
            entityType: 'Opportunity',
            rawData: {},
            externalId: buffer.opportunityId,
            syncTaskId: buffer.eventData.syncTaskId,
            idempotencyKey: '',
            correlationId: buffer.eventData.correlationId,
            metadata: buffer.eventData.metadata,
          },
          buffer.opportunityId,
          buffer.shardId
        );
      }
      this.opportunityDebouncer.stop();
    }
    
    // Also flush in-memory buffer (legacy fallback)
    for (const [, buffer] of this.opportunityEventBuffer.entries()) {
      clearTimeout(buffer.timer);
      await this.flushOpportunityEvent(buffer.event, buffer.opportunityId, buffer.shardId);
    }
    this.opportunityEventBuffer.clear();
    
    // Flush batch opportunity events
    for (const [bufferKey, buffer] of this.batchOpportunityBuffer.entries()) {
      clearTimeout(buffer.timer);
      await this.flushBatchOpportunityEvent(bufferKey);
    }
    this.batchOpportunityBuffer.clear();
  }

  /**
   * Handle single raw data event
   */
  private async handleRawDataEvent(event: IntegrationDataRawEvent): Promise<void> {
    const startTime = Date.now();
    const processingStartTime = process.hrtime.bigint();

    try {
      // Track message consumption
      rabbitmqMessagesConsumedTotal.inc({ queue_name: this.config.mapping?.queue_name || 'integration_data_raw', status: 'processing' });
      // 1. Idempotency check
      const isAlreadyProcessed = await this.isProcessed(event.idempotencyKey);
      idempotencyChecksTotal.inc({
        cache_type: this.useRedisForIdempotency ? 'redis' : 'memory',
        result: isAlreadyProcessed ? 'duplicate' : 'new',
      });
      
      if (isAlreadyProcessed) {
        log.debug('Event already processed (idempotency)', {
          idempotencyKey: event.idempotencyKey,
          service: 'integration-processors',
        });
        rabbitmqMessagesConsumedTotal.inc({ queue_name: this.config.mapping?.queue_name || 'integration_data_raw', status: 'duplicate' });
        return; // Already processed, skip
      }

      // 2. Get integration config (with caching)
      const integrationConfig = await this.getIntegrationConfig(
        event.integrationId,
        event.tenantId
      );
      configCacheOperationsTotal.inc({
        operation: 'get',
        cache_type: this.useRedisForConfigCache ? 'redis' : 'memory',
        result: integrationConfig ? 'hit' : 'miss',
      });

      if (!integrationConfig) {
        throw new Error(`Integration ${event.integrationId} not found`);
      }

      // 3. Find entity mapping for this entity type
      const entityMapping = integrationConfig.syncConfig?.entityMappings?.find(
        (em: any) => em.externalEntityName === event.entityType || em.externalEntity === event.entityType
      );

      if (!entityMapping) {
        log.warn('No entity mapping found for entity type', {
          entityType: event.entityType,
          integrationId: event.integrationId,
          service: 'integration-processors',
        });
        // Publish mapping failed event
        await this.publishMappingFailed(event, 'No entity mapping found');
        return;
      }

      // 4. Apply field mappings (pass integrationId for custom transform lookup)
      const structuredData = this.fieldMapper.mapFields(event.rawData, entityMapping, event.integrationId);

      // 5. Calculate simple ML fields (synchronous)
      this.calculateSimpleMLFields(structuredData, event.rawData);

      // 6. Validate mapped data with ShardValidator
      const validation = await this.validateShardData(
        structuredData,
        entityMapping.shardTypeId,
        entityMapping.shardTypeName
      );
      
      if (!validation.valid) {
        const strictness = this.config.mapping?.validation_strictness || 'lenient';
        
        if (strictness === 'strict') {
          const errorMessages = [
            ...validation.errors.map((e: ShardValidationError) => `${e.field}: ${e.message}`),
            ...validation.warnings.map((w: ShardValidationError) => `${w.field}: ${w.message}`),
          ].join('; ');
          throw new Error(`Shard validation failed: ${errorMessages}`);
        } else {
          // Log warnings/errors but continue in lenient/audit mode
          log.warn('Shard validation warnings/errors', {
            shardTypeId: entityMapping.shardTypeId,
            shardTypeName: entityMapping.shardTypeName,
            errors: validation.errors,
            warnings: validation.warnings,
            strictness,
            service: 'integration-processors',
          });
          
          // Mark shard as having validation issues (for audit)
          if (strictness === 'audit' || strictness === 'lenient') {
            structuredData._validationStatus = validation.errors.length > 0 ? 'errors' : 'warnings';
            structuredData._validationErrors = validation.errors;
            structuredData._validationWarnings = validation.warnings;
          }
        }
      }

      // 7. Create or update shard via shard-manager API
      const shardOpStart = process.hrtime.bigint();
      const { shardId, isCreate, previousStructuredData } = await this.createOrUpdateShard(
        event.tenantId,
        entityMapping.shardTypeId,
        structuredData,
        event.externalId,
        event.integrationId
      );
      const shardOpDuration = Number(process.hrtime.bigint() - shardOpStart) / 1e9;
      shardOperationsTotal.inc({
        operation: isCreate ? 'create' : 'update',
        shard_type: entityMapping.shardTypeId,
        status: 'success',
      });
      shardOperationDurationSeconds.observe(
        { operation: isCreate ? 'create' : 'update', shard_type: entityMapping.shardTypeId },
        shardOpDuration
      );

      // 8. Mark as processed (idempotency)
      await this.markAsProcessed(event.idempotencyKey);

      // 9. Fast entity linking (if applicable): wire when EntityLinkingService exists
      // 10. Publish opportunity events (if opportunity shard and significant changes detected)
      if (entityMapping.shardTypeId === 'opportunity' || entityMapping.shardTypeId === 'c_opportunity') {
        const hasSignificantChange = isCreate || this.hasSignificantOpportunityChange(
          previousStructuredData,
          structuredData
        );
        
        if (hasSignificantChange) {
          await this.publishOpportunityEvent(event, shardId, structuredData);
        } else {
          log.debug('Skipped opportunity event - no significant changes', {
            opportunityId: shardId,
            externalId: event.externalId,
            service: 'integration-processors',
          });
        }
      }

      // 11. Publish mapping success event
      await this.publishMappingSuccess(event, shardId, Date.now() - startTime, isCreate);

      // Record metrics
      const duration = Number(process.hrtime.bigint() - processingStartTime) / 1e9;
      const durationMs = duration * 1000;
      
      // Record processing time for prefetch adjustment
      if (this.prefetchManager) {
        this.prefetchManager.recordProcessingTime(durationMs);
      }
      
      integrationDataMappedTotal.inc({
        integration_id: event.integrationId,
        entity_type: event.entityType,
        status: 'success',
      });
      integrationDataMappingDurationSeconds.observe(
        { integration_id: event.integrationId, entity_type: event.entityType },
        duration
      );
      rabbitmqMessageProcessingDurationSeconds.observe(
        { queue_name: this.config.mapping?.queue_name || 'integration_data_raw', event_type: 'integration.data.raw' },
        duration
      );
      rabbitmqMessagesConsumedTotal.inc({ queue_name: this.config.mapping?.queue_name || 'integration_data_raw', status: 'success' });

      log.info('CRM data mapped and stored', {
        integrationId: event.integrationId,
        entityType: event.entityType,
        shardId,
        duration: Date.now() - startTime,
        service: 'integration-processors',
      });
    } catch (error: any) {
      log.error('Failed to process raw data event', error, {
        integrationId: event.integrationId,
        entityType: event.entityType,
        externalId: event.externalId,
        service: 'integration-processors',
      });

      // Record failure metrics
      const errorType = error.statusCode ? `http_${error.statusCode}` : error.name || 'unknown';
      integrationDataMappingFailedTotal.inc({
        integration_id: event.integrationId,
        entity_type: event.entityType,
        error_type: errorType,
      });
      rabbitmqMessagesConsumedTotal.inc({ queue_name: this.config.mapping?.queue_name || 'integration_data_raw', status: 'failed' });

      // Publish mapping failed event
      await this.publishMappingFailed(event, error.message);
      throw error; // Will trigger retry logic
    }
  }

  /**
   * Handle batch raw data event
   * Processes records in parallel with concurrency limit and tracks statistics
   */
  private async handleBatchEvent(event: IntegrationDataRawBatchEvent): Promise<void> {
    const startTime = Date.now();
    log.info('Processing batch event', {
      integrationId: event.integrationId,
      batchSize: event.batchSize,
      entityType: event.entityType,
      syncTaskId: event.syncTaskId,
      service: 'integration-processors',
    });

    const concurrency = this.config.mapping?.batch_concurrency || 10;
    const records = event.records;
    
    // Statistics tracking
    let processedCount = 0;
    let successCount = 0;
    let failureCount = 0;
    const errors: Array<{ externalId: string; error: string }> = [];

    // Process in parallel with concurrency limit
    for (let i = 0; i < records.length; i += concurrency) {
      const batch = records.slice(i, i + concurrency);
      
      // Process batch with individual error handling
      const results = await Promise.allSettled(
        batch.map((record) =>
          this.handleRawDataEvent({
            integrationId: event.integrationId,
            tenantId: event.tenantId,
            entityType: event.entityType,
            rawData: record.rawData,
            externalId: record.externalId,
            syncTaskId: event.syncTaskId,
            idempotencyKey: record.idempotencyKey,
            correlationId: event.correlationId,
            metadata: event.metadata,
          })
        )
      );

      // Track results
      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        const record = batch[j];
        processedCount++;

        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          failureCount++;
          errors.push({
            externalId: record.externalId,
            error: result.reason?.message || String(result.reason),
          });
          
          // Publish mapping failed event for this record
          await this.publishMappingFailed(
            {
              integrationId: event.integrationId,
              tenantId: event.tenantId,
              entityType: event.entityType,
              rawData: record.rawData,
              externalId: record.externalId,
              syncTaskId: event.syncTaskId,
              idempotencyKey: record.idempotencyKey,
              correlationId: event.correlationId,
              metadata: event.metadata,
            },
            result.reason?.message || 'Unknown error'
          );
        }
      }

      // Log progress for large batches
      if (records.length > 50 && (i + concurrency) % 50 === 0) {
        log.info('Batch processing progress', {
          integrationId: event.integrationId,
          processed: processedCount,
          total: records.length,
          success: successCount,
          failures: failureCount,
          service: 'integration-processors',
        });
      }
    }

    const duration = Date.now() - startTime;
    const successRate = processedCount > 0 ? (successCount / processedCount) * 100 : 0;

    log.info('Batch event processing completed', {
      integrationId: event.integrationId,
      batchSize: event.batchSize,
      processed: processedCount,
      success: successCount,
      failures: failureCount,
      successRate: `${successRate.toFixed(2)}%`,
      duration,
      service: 'integration-processors',
    });

    // Log errors if any
    if (errors.length > 0) {
      log.warn('Batch processing had failures', {
        integrationId: event.integrationId,
        failureCount: errors.length,
        sampleErrors: errors.slice(0, 5), // Log first 5 errors as sample
        service: 'integration-processors',
      });
    }
    
    // Note: Individual opportunity events are published by handleRawDataEvent
    // The publishOpportunityEvent method will automatically use batch events
    // for large syncs (based on metadata.batchSize >= opportunity_batch_threshold)
  }

  /**
   * Check if event was already processed (idempotency)
   * Uses Redis for distributed idempotency with in-memory fallback
   */
  private async isProcessed(idempotencyKey: string): Promise<boolean> {
    // Check in-memory cache first (fast path)
    if (this.idempotencyCache.has(idempotencyKey)) {
      return true;
    }

    // Check Redis for distributed idempotency
    if (this.useRedisForIdempotency) {
      try {
        const cache = getCache();
        const cacheKey = `idempotency:${idempotencyKey}`;
        const cached = await cache.get(cacheKey);
        
        if (cached !== null) {
          // Also update in-memory cache for faster subsequent checks
          this.idempotencyCache.set(idempotencyKey, true);
          return true;
        }
      } catch (error: any) {
        // Redis unavailable - fallback to in-memory if configured
        log.warn('Redis idempotency check failed, falling back to in-memory', {
          error: error.message,
          idempotencyKey: idempotencyKey.substring(0, 50),
          service: 'integration-processors',
        });
        
        if (!this.config.mapping?.idempotency?.fallback_to_memory) {
          // If fallback disabled, treat as not processed (will retry)
          return false;
        }
      }
    }

    return false;
  }

  /**
   * Mark event as processed (idempotency)
   * Stores in Redis with TTL and in-memory cache
   */
  private async markAsProcessed(idempotencyKey: string): Promise<void> {
    // Store in in-memory cache
    this.idempotencyCache.set(idempotencyKey, true);

    // Store in Redis for distributed idempotency
    if (this.useRedisForIdempotency) {
      try {
        const cache = getCache();
        const cacheKey = `idempotency:${idempotencyKey}`;
        await cache.set(cacheKey, '1', this.idempotencyTtl);
      } catch (error: any) {
        // Redis unavailable - log warning but continue with in-memory cache
        log.warn('Failed to store idempotency key in Redis, using in-memory only', {
          error: error.message,
          idempotencyKey: idempotencyKey.substring(0, 50),
          service: 'integration-processors',
        });
      }
    }

    // Clean up old in-memory entries periodically (simple implementation)
    if (this.idempotencyCache.size > 10000) {
      // Clear half of the cache (simple FIFO)
      const keys = Array.from(this.idempotencyCache.keys());
      keys.slice(0, keys.length / 2).forEach((key) => this.idempotencyCache.delete(key));
    }
  }

  /**
   * Get integration config (with Redis caching)
   * Also loads custom transforms if present in config
   */
  private async getIntegrationConfig(
    integrationId: string,
    tenantId: string
  ): Promise<any> {
    const cacheKey = `integration_config:${integrationId}:${tenantId}`;
    
    // Check in-memory cache first (fast path)
    const inMemoryCached = this.configCache.get(cacheKey);
    if (inMemoryCached && inMemoryCached.expiresAt > Date.now()) {
      return inMemoryCached.config;
    }

    // Check Redis cache if enabled
    if (this.useRedisForConfigCache) {
      try {
        const cache = getCache();
        const cached = await cache.get(cacheKey);
        
        if (cached !== null) {
          // Parse cached config
          const config = typeof cached === 'string' ? JSON.parse(cached) : cached;
          
          // Also update in-memory cache for faster subsequent checks
          const ttl = this.configCacheTtl * 1000; // Convert to ms
          this.configCache.set(cacheKey, {
            config,
            expiresAt: Date.now() + ttl,
          });
          
          // Load custom transforms if present
          if (config?.syncConfig?.customTransforms) {
            this.fieldMapper.loadCustomTransforms(integrationId, config.syncConfig.customTransforms);
          }
          
          return config;
        }
      } catch (error: any) {
        // Redis unavailable - fallback to fetching from API
        log.warn('Redis config cache check failed, fetching from API', {
          error: error.message,
          integrationId,
          service: 'integration-processors',
        });
      }
    }

    // Fetch from integration-manager
    const config = await this.deps.integrationManager.get(
      `/api/v1/integrations/${integrationId}`,
      {
        headers: {
          'X-Tenant-ID': tenantId,
        },
      }
    );

    // Load custom transforms if present in syncConfig
    if (config?.syncConfig?.customTransforms) {
      this.fieldMapper.loadCustomTransforms(integrationId, config.syncConfig.customTransforms);
    }

    // Cache in Redis and in-memory
    const ttl = this.configCacheTtl * 1000; // Convert to ms
    const expiresAt = Date.now() + ttl;
    
    // Store in in-memory cache
    this.configCache.set(cacheKey, {
      config,
      expiresAt,
    });

    // Store in Redis if enabled
    if (this.useRedisForConfigCache) {
      try {
        const cache = getCache();
        await cache.set(cacheKey, JSON.stringify(config), this.configCacheTtl);
      } catch (error: any) {
        // Redis unavailable - log warning but continue
        log.warn('Failed to store config in Redis cache', {
          error: error.message,
          integrationId,
          service: 'integration-processors',
        });
      }
    }

    return config;
  }

  /**
   * Invalidate config cache for an integration
   */
  private async invalidateConfigCache(integrationId: string, tenantId: string): Promise<void> {
    const cacheKey = `integration_config:${integrationId}:${tenantId}`;
    
    // Remove from in-memory cache
    this.configCache.delete(cacheKey);
    
    // Remove from Redis cache if enabled
    if (this.useRedisForConfigCache) {
      try {
        const cache = getCache();
        await cache.delete(cacheKey);
        
        log.debug('Invalidated config cache', {
          integrationId,
          tenantId,
          service: 'integration-processors',
        });
      } catch (error: any) {
        log.warn('Failed to invalidate config cache in Redis', {
          error: error.message,
          integrationId,
          service: 'integration-processors',
        });
      }
    }
  }

  /**
   * Calculate simple ML fields (synchronous)
   */
  private calculateSimpleMLFields(
    structuredData: Record<string, any>,
    _rawData: Record<string, any>
  ): void {
    // daysInStage: From current stage + lastStageChangeDate
    if (structuredData.stage && structuredData.lastStageChangeDate) {
      const lastChange = new Date(structuredData.lastStageChangeDate);
      structuredData.daysInStage = Math.floor(
        (Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    // daysSinceLastActivity: From lastActivityDate
    if (structuredData.lastActivityDate) {
      const lastActivity = new Date(structuredData.lastActivityDate);
      structuredData.daysSinceLastActivity = Math.floor(
        (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    // dealVelocity: proper calculation from stage progression history when implemented
    // Initialize count fields to 0 (will be updated by MLFieldAggregationConsumer)
    structuredData.documentCount = 0;
    structuredData.emailCount = 0;
    structuredData.meetingCount = 0;
    structuredData.callCount = 0;

    // competitorCount and stakeholderCount: Set to 0 if not easily calculable
    if (!structuredData.competitorCount) {
      structuredData.competitorCount = 0;
    }
    if (!structuredData.stakeholderCount) {
      structuredData.stakeholderCount = 0;
    }
  }

  /**
   * Validate mapped structuredData with ShardValidator (cached per shard type)
   */
  private async validateShardData(
    structuredData: Record<string, unknown>,
    shardTypeId: string,
    shardTypeName: string
  ): Promise<{ valid: boolean; errors: ShardValidationError[]; warnings: ShardValidationError[] }> {
    let validator = this.shardValidators.get(shardTypeId);
    if (!validator) {
      const config: ValidationConfig = { strictness: 'lenient' };
      validator = new ShardValidator(config);
      this.shardValidators.set(shardTypeId, validator);
    }
    return Promise.resolve(validator.validate(structuredData, shardTypeName));
  }

  /**
   * Create or update shard via shard-manager API
   * Returns shardId, isCreate flag, and previous structuredData (if update)
   */
  private async createOrUpdateShard(
    tenantId: string,
    shardTypeId: string,
    structuredData: Record<string, any>,
    externalId: string,
    integrationId: string
  ): Promise<{ shardId: string; isCreate: boolean; previousStructuredData?: Record<string, any> }> {
    // Check if shard already exists (by externalId in metadata)
    let existingShard: any = null;
    try {
      // Query shards by metadata.externalId (since externalId is stored in metadata)
      const response = await this.deps.shardManager.get(
        `/api/v1/shards?filter=metadata.externalId eq '${externalId}' and shardTypeId eq '${shardTypeId}' and tenantId eq '${tenantId}'`,
        {
          headers: {
            'X-Tenant-ID': tenantId,
          },
        }
      );
      // Response format may vary - check if it's an array or has items property
      const items = Array.isArray(response) ? response : (response.items || []);
      if (items.length > 0) {
        existingShard = items[0];
      }
    } catch (error) {
      // Shard not found, will create new
      log.debug('Shard not found by externalId, will create new', {
        externalId,
        shardTypeId,
        tenantId,
        service: 'integration-processors',
      });
    }

    if (existingShard) {
      // Store previous structuredData for change detection
      const previousStructuredData = existingShard.structuredData || {};
      
      // Update existing shard
      await this.deps.shardManager.put(
        `/api/v1/shards/${existingShard.id}`,
        {
          structuredData,
          metadata: {
            ...existingShard.metadata,
            integrationId,
            externalId,
            syncedAt: new Date().toISOString(),
          },
        },
        {
          headers: {
            'X-Tenant-ID': tenantId,
          },
        }
      );
      return {
        shardId: existingShard.id,
        isCreate: false,
        previousStructuredData,
      };
    } else {
      // Create new shard
      // Note: userId is required by shard-manager API, use system user or integration ID
      const response = await this.deps.shardManager.post(
        '/api/v1/shards',
        {
          tenantId,
          userId: `system:integration:${integrationId}`, // System user for integration-created shards
          shardTypeId,
          structuredData,
          metadata: {
            integrationId,
            externalId,
            externalSource: integrationId,
            syncedAt: new Date().toISOString(),
          },
          source: 'integration',
          sourceDetails: {
            integrationId,
            externalId,
          },
        },
        {
          headers: {
            'X-Tenant-ID': tenantId,
          },
        }
      );
      return {
        shardId: response.id,
        isCreate: true,
        previousStructuredData: undefined,
      };
    }
  }

  /**
   * Check if opportunity has significant changes
   * Significant fields: stage, amount, closeDate, probability, status, ML fields
   */
  private hasSignificantOpportunityChange(
    previousData?: Record<string, any>,
    currentData?: Record<string, any>
  ): boolean {
    if (!previousData || !currentData) {
      // If no previous data, consider it significant (new opportunity)
      return true;
    }

    // Significant fields that trigger opportunity.updated event
    const significantFields = [
      'stage',
      'amount',
      'closeDate',
      'probability',
      'status',
      'daysInStage',
      'daysSinceLastActivity',
      'dealVelocity',
      'competitorCount',
      'stakeholderCount',
      'documentCount',
      'emailCount',
      'meetingCount',
      'callCount',
    ];

    // Check if any significant field changed
    for (const field of significantFields) {
      const previousValue = previousData[field];
      const currentValue = currentData[field];

      // Handle different value types
      if (this.hasValueChanged(previousValue, currentValue)) {
        log.debug('Significant field changed', {
          field,
          previousValue,
          currentValue,
          service: 'integration-processors',
        });
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a value has changed (handles different types)
   */
  private hasValueChanged(previousValue: any, currentValue: any): boolean {
    // Both null/undefined - no change
    if (previousValue == null && currentValue == null) {
      return false;
    }

    // One is null/undefined, other is not - change
    if (previousValue == null || currentValue == null) {
      return true;
    }

    // For dates, compare as ISO strings or timestamps
    if (previousValue instanceof Date || currentValue instanceof Date) {
      const prevDate = previousValue instanceof Date ? previousValue : new Date(previousValue);
      const currDate = currentValue instanceof Date ? currentValue : new Date(currentValue);
      return prevDate.getTime() !== currDate.getTime();
    }

    // For numbers, use strict equality (handles NaN)
    if (typeof previousValue === 'number' || typeof currentValue === 'number') {
      if (isNaN(previousValue) && isNaN(currentValue)) {
        return false; // Both NaN - no change
      }
      return previousValue !== currentValue;
    }

    // For strings, arrays, objects - use strict equality
    return previousValue !== currentValue;
  }

  /**
   * Publish opportunity event (with debouncing)
   * For large syncs, uses batch events; for small syncs, uses individual events
   */
  private async publishOpportunityEvent(
    event: IntegrationDataRawEvent,
    shardId: string,
    _structuredData: Record<string, any>
  ): Promise<void> {
    const opportunityId = shardId; // Use shard ID as opportunity ID
    const batchThreshold = this.config.mapping?.opportunity_batch_threshold || 100;

    // For new opportunities, always publish
    // For updates, only publish if significant changes (compare with previous shard when wired)
    // Determine if we should use batch events based on sync context
    // If this is from a batch sync (metadata indicates large sync), use batch events
    const isLargeSync = event.metadata?.batchSize && event.metadata.batchSize >= batchThreshold;
    
    if (isLargeSync) {
      // Use batch opportunity events for large syncs
      await this.publishBatchOpportunityEvent(
        event.integrationId,
        event.tenantId,
        opportunityId,
        shardId,
        event.syncTaskId,
        event.correlationId,
        event.metadata
      );
      return;
    }

    // For small syncs, use individual events with Redis-based debouncing
    // Debounce: Group multiple events within 5-second window per opportunity using Redis
    if (this.opportunityDebouncer) {
      const { shouldPublish, bufferKey } = await this.opportunityDebouncer.scheduleOpportunityEvent(
        opportunityId,
        shardId,
        {
          integrationId: event.integrationId,
          tenantId: event.tenantId,
          syncTaskId: event.syncTaskId,
          correlationId: event.correlationId,
          metadata: event.metadata,
        }
      );

      if (shouldPublish) {
        // No debouncing available (Redis unavailable and no fallback) - publish immediately
        await this.flushOpportunityEvent(event, opportunityId, shardId);
      } else {
        // Event debounced - will be published after 5-second window expires
        log.debug('Opportunity event debounced (Redis)', {
          opportunityId,
          bufferKey,
          service: 'integration-processors',
        });
      }
    } else {
      // Fallback: publish immediately if debouncer not available
      await this.flushOpportunityEvent(event, opportunityId, shardId);
    }
  }

  /**
   * Flush opportunity event (publish immediately)
   */
  private async flushOpportunityEvent(
    event: IntegrationDataRawEvent,
    opportunityId: string,
    shardId: string
  ): Promise<void> {
    try {
      await this.deps.eventPublisher.publish('integration.opportunity.updated', event.tenantId, {
        integrationId: event.integrationId,
        tenantId: event.tenantId,
        opportunityId,
        shardId,
        syncTaskId: event.syncTaskId,
        correlationId: event.correlationId,
        metadata: event.metadata,
      });
      
      log.debug('Published opportunity updated event', {
        opportunityId,
        integrationId: event.integrationId,
        service: 'integration-processors',
      });
    } catch (error: any) {
      log.error('Failed to publish opportunity event', error, {
        opportunityId,
        service: 'integration-processors',
      });
    }
  }

  /**
   * Publish batch opportunity events for large syncs
   * Collects opportunities and publishes as batch after threshold or timeout
   */
  private async publishBatchOpportunityEvent(
    integrationId: string,
    tenantId: string,
    opportunityId: string,
    shardId: string,
    syncTaskId: string,
    correlationId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const bufferKey = `${tenantId}:${integrationId}`;
    const batchThreshold = this.config.mapping?.opportunity_batch_threshold || 100;
    
    const existing = this.batchOpportunityBuffer.get(bufferKey);
    
    if (existing) {
      // Add to existing batch
      existing.opportunityIds.push(opportunityId);
      existing.shardIds.push(shardId);
      
      // Clear existing timer (reset debounce window)
      clearTimeout(existing.timer);
      
      // If batch size reached, publish immediately
      if (existing.opportunityIds.length >= batchThreshold) {
        await this.flushBatchOpportunityEvent(bufferKey);
        return;
      }
    } else {
      // Create new batch buffer
      this.batchOpportunityBuffer.set(bufferKey, {
        integrationId,
        tenantId,
        opportunityIds: [opportunityId],
        shardIds: [shardId],
        syncTaskId,
        correlationId,
        metadata,
        timer: null as any, // Will be set below
      });
    }
    
    const buffer = this.batchOpportunityBuffer.get(bufferKey)!;
    
    // Set timer to flush batch after 5 seconds (or when threshold reached)
    buffer.timer = setTimeout(async () => {
      await this.flushBatchOpportunityEvent(bufferKey);
    }, 5000);
    
    log.debug('Opportunity added to batch buffer', {
      opportunityId,
      batchSize: buffer.opportunityIds.length,
      bufferKey,
      service: 'integration-processors',
    });
  }

  /**
   * Flush batch opportunity events (publish immediately)
   */
  private async flushBatchOpportunityEvent(bufferKey: string): Promise<void> {
    const buffer = this.batchOpportunityBuffer.get(bufferKey);
    if (!buffer || buffer.opportunityIds.length === 0) {
      return;
    }
    
    try {
      await this.deps.eventPublisher.publish(
        'integration.opportunities.updated.batch',
        buffer.tenantId,
        {
          integrationId: buffer.integrationId,
          tenantId: buffer.tenantId,
          opportunityIds: buffer.opportunityIds,
          shardIds: buffer.shardIds,
          syncTaskId: buffer.syncTaskId,
          correlationId: buffer.correlationId,
          batchSize: buffer.opportunityIds.length,
          metadata: buffer.metadata,
        }
      );
      
      log.info('Published batch opportunity updated event', {
        integrationId: buffer.integrationId,
        tenantId: buffer.tenantId,
        opportunityCount: buffer.opportunityIds.length,
        service: 'integration-processors',
      });
      
      // Clear buffer
      this.batchOpportunityBuffer.delete(bufferKey);
    } catch (error: any) {
      log.error('Failed to publish batch opportunity event', error, {
        integrationId: buffer.integrationId,
        tenantId: buffer.tenantId,
        opportunityCount: buffer.opportunityIds.length,
        service: 'integration-processors',
      });
    }
  }

  /**
   * Publish mapping success event
   */
  private async publishMappingSuccess(
    event: IntegrationDataRawEvent,
    shardId: string,
    duration: number,
    isCreate: boolean
  ): Promise<void> {
    try {
      await this.deps.eventPublisher.publish('integration.data.mapped', event.tenantId, {
        integrationId: event.integrationId,
        tenantId: event.tenantId,
        shardId,
        externalId: event.externalId,
        syncTaskId: event.syncTaskId,
        idempotencyKey: event.idempotencyKey,
        correlationId: event.correlationId,
        success: true,
        duration,
        created: isCreate,
        createdAt: isCreate ? new Date().toISOString() : undefined,
        updatedAt: isCreate ? undefined : new Date().toISOString(),
      });
    } catch (error: any) {
      log.error('Failed to publish mapping success event', error, {
        service: 'integration-processors',
      });
    }
  }

  /**
   * Publish mapping failed event
   */
  private async publishMappingFailed(
    event: IntegrationDataRawEvent | IntegrationDataRawBatchEvent,
    error: string
  ): Promise<void> {
    try {
      const tenantId = event.tenantId;
      const integrationId = event.integrationId;
      const syncTaskId = event.syncTaskId;
      const correlationId = event.correlationId;

      await this.deps.eventPublisher.publish('integration.data.mapping.failed', tenantId, {
        integrationId,
        tenantId,
        externalId: 'externalId' in event ? event.externalId : undefined,
        syncTaskId,
        idempotencyKey: 'idempotencyKey' in event ? event.idempotencyKey : undefined,
        correlationId,
        error,
        retryAttempt: 0, // Will be updated by retry logic
      });
    } catch (err: any) {
      log.error('Failed to publish mapping failed event', err, {
        service: 'integration-processors',
      });
    }
  }
}
