import {
  CosmosClient,
  Container,
  IndexingPolicy,
  ContainerDefinition,
  VectorEmbeddingDataType,
  VectorEmbeddingDistanceFunction,
  ConnectionPolicy,
  RetryOptions,
} from '@azure/cosmos';
import { IMonitoringProvider } from '@castiel/monitoring';
import {
  Shard,
  CreateShardInput,
  UpdateShardInput,
  ShardListOptions,
  ShardListResult,
  ShardStatus,
  ShardSource,
  PermissionCheckResult,
  PermissionLevel,
} from '../types/shard.types.js';
import type { ShardCacheService } from '../services/shard-cache.service.js';
import type { QueueService } from '../services/queue.service.js';
import type { EmbeddingJobMessage } from '../types/embedding-job.types.js';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';

/**
 * Cosmos DB container configuration for Shards
 * Includes vector indexing policy and query indexes
 */
const createShardContainerConfig = (containerName: string): ContainerDefinition => ({
  id: containerName,
  partitionKey: {
    paths: ['/tenantId'],
  },
  indexingPolicy: {
    automatic: true,
    indexingMode: 'consistent',
    includedPaths: [
      {
        path: '/*',
      },
    ],
    excludedPaths: [
      {
        path: '/unstructuredData/*', // Don't index large unstructured data
      },
      {
        path: '/_etag/?', // System property, no need to index
      },
    ],
    compositeIndexes: [
      [
        { path: '/tenantId', order: 'ascending' },
        { path: '/createdAt', order: 'descending' },
      ],
      [
        { path: '/tenantId', order: 'ascending' },
        { path: '/userId', order: 'ascending' },
        { path: '/createdAt', order: 'descending' },
      ],
      [
        { path: '/tenantId', order: 'ascending' },
        { path: '/shardTypeId', order: 'ascending' },
        { path: '/createdAt', order: 'descending' },
      ],
      [
        { path: '/tenantId', order: 'ascending' },
        { path: '/status', order: 'ascending' },
        { path: '/updatedAt', order: 'descending' },
      ],
      [
        { path: '/tenantId', order: 'ascending' },
        { path: '/status', order: 'ascending' },
        { path: '/archivedAt', order: 'descending' },
      ],
      [
        { path: '/tenantId', order: 'ascending' },
        { path: '/source', order: 'ascending' },
        { path: '/createdAt', order: 'descending' },
      ],
      [
        { path: '/tenantId', order: 'ascending' },
        { path: '/lastActivityAt', order: 'descending' },
      ],
      // Opportunity-specific indexes for structuredData queries
      [
        { path: '/tenantId', order: 'ascending' },
        { path: '/shardTypeId', order: 'ascending' },
        { path: '/structuredData/ownerId', order: 'ascending' },
        { path: '/updatedAt', order: 'descending' },
      ],
      [
        { path: '/tenantId', order: 'ascending' },
        { path: '/shardTypeId', order: 'ascending' },
        { path: '/structuredData/stage', order: 'ascending' },
        { path: '/updatedAt', order: 'descending' },
      ],
      [
        { path: '/tenantId', order: 'ascending' },
        { path: '/shardTypeId', order: 'ascending' },
        { path: '/structuredData/status', order: 'ascending' },
        { path: '/updatedAt', order: 'descending' },
      ],
      [
        { path: '/tenantId', order: 'ascending' },
        { path: '/shardTypeId', order: 'ascending' },
        { path: '/structuredData/accountId', order: 'ascending' },
        { path: '/updatedAt', order: 'descending' },
      ],
      [
        { path: '/tenantId', order: 'ascending' },
        { path: '/shardTypeId', order: 'ascending' },
        { path: '/structuredData/closeDate', order: 'ascending' },
      ],
    ],
  } as IndexingPolicy,
  vectorEmbeddingPolicy: {
    vectorEmbeddings: [
      {
        // NOTE: Current path is '/vectors/embedding' but queries use vectors[0].embedding
        // This suggests the path might need to be '/vectors/*/embedding' for array support
        // However, current implementation works with indexed access (vectors[0].embedding)
        // TODO: Verify if path should be '/vectors/*/embedding' for proper array indexing
        // or if current path works correctly with Cosmos DB vector search
        path: '/vectors/embedding',
        dataType: VectorEmbeddingDataType.Float32,
        dimensions: 1536,
        distanceFunction: VectorEmbeddingDistanceFunction.Cosine,
      },
    ],
  },
  // TTL for soft-deleted shards (90 days)
  defaultTtl: -1, // Disabled by default, will set per document
});

/**
 * Shard Repository
 * Handles all Cosmos DB operations for Shards
 */
// Phase 2: Import services for optional integration
type RedactionService = import('../services/redaction.service.js').RedactionService;
type AuditTrailService = import('../services/audit-trail.service.js').AuditTrailService;

export class ShardRepository {
  private client: CosmosClient;
  private databaseId: string;
  private containerName: string;
  private container: Container;
  private monitoring: IMonitoringProvider;
  private cacheService?: ShardCacheService;
  private redactionService?: RedactionService;
  private auditTrailService?: AuditTrailService;

  constructor(
    cosmosClient: CosmosClient,
    databaseId: string,
    containerName: string,
    monitoring: IMonitoringProvider,
    cacheService?: ShardCacheService,
    private readonly serviceBusService?: QueueService,
    redactionService?: RedactionService,
    auditTrailService?: AuditTrailService
  ) {
    this.monitoring = monitoring;
    this.cacheService = cacheService;
    this.redactionService = redactionService;
    this.auditTrailService = auditTrailService;
    this.client = cosmosClient;
    this.databaseId = databaseId;
    this.containerName = containerName;
    this.container = this.client
      .database(databaseId)
      .container(containerName);
  }

  /**
   * Initialize container with proper indexing and vector search
   */
  async ensureContainer(): Promise<void> {
    try {
      const { database } = await this.client.databases.createIfNotExists({
        id: this.databaseId,
      });

      await database.containers.createIfNotExists(
        createShardContainerConfig(this.containerName)
      );

      this.monitoring.trackEvent('cosmosdb.container.ensured', {
        container: this.containerName,
      });

      this.monitoring?.trackEvent('shard-repository.container-ensured', {
        containerName: this.containerName,
      });
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'shard.repository.ensureContainer',
      });
      throw error;
    }
  }

  /**
   * Create a new shard
   */
  async create(input: CreateShardInput): Promise<Shard> {
    const startTime = Date.now();

    try {
      // Use createdBy if provided, otherwise fall back to userId
      const creatorId = input.createdBy || input.userId;
      if (!creatorId) {
        throw new Error('Either createdBy or userId must be provided');
      }

      // Auto-set ownerId in structuredData for opportunity shards if not provided
      let structuredData = input.structuredData || {};
      // Check if this is an opportunity shard by name or ID
      const isOpportunity = 
        input.shardTypeName === 'c_opportunity' || 
        input.shardTypeId?.includes('opportunity') ||
        input.shardTypeId?.toLowerCase().includes('opportunity');
      
      if (isOpportunity) {
        // Ensure ownerId is set in structuredData for opportunities
        // Handle both undefined and null values, or if the property doesn't exist
        if (!structuredData.ownerId || structuredData.ownerId === null || structuredData.ownerId === undefined) {
          structuredData = { ...structuredData, ownerId: creatorId };
        }
      }

      const shard: Shard = {
        id: uuidv4(),
        tenantId: input.tenantId,
        userId: creatorId,
        shardTypeId: input.shardTypeId,
        shardTypeName: input.shardTypeName,
        structuredData,
        unstructuredData: input.unstructuredData,
        metadata: input.metadata,
        internal_relationships: input.internal_relationships || [],
        external_relationships: input.external_relationships || [],
        acl: input.acl || [
          {
            userId: creatorId,
            permissions: [PermissionLevel.READ, PermissionLevel.WRITE, PermissionLevel.DELETE, PermissionLevel.ADMIN],
            grantedBy: creatorId,
            grantedAt: new Date(),
          },
        ],
        enrichment: input.enrichment ? {
          config: input.enrichment,
        } : undefined,
        vectors: [],
        revisionId: uuidv4(),
        revisionNumber: 1,
        status: input.status || ShardStatus.ACTIVE,
        // New fields
        schemaVersion: 1, // Default schema version
        source: input.source || ShardSource.API, // Default to API if not specified
        sourceDetails: input.sourceDetails,
        lastActivityAt: new Date(), // Set initial activity
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Phase 2: Apply redaction if configured (non-blocking)
      if (this.redactionService) {
        try {
          const redacted = this.redactionService.applyRedaction(shard, input.tenantId);
          // If redaction was applied, update shard metadata
          if (redacted.metadata?.redaction) {
            shard.metadata = {
              ...shard.metadata,
              redaction: redacted.metadata.redaction,
            };
          }
        } catch (error) {
          // Log but don't fail shard creation
          this.monitoring.trackException(error as Error, {
            context: 'shard.repository.create.redaction',
            shardId: shard.id,
          });
        }
      }

      const { resource } = await this.container.items.create(shard);

      const duration = Date.now() - startTime;
      this.monitoring.trackDependency(
        'cosmosdb.shard.create',
        'CosmosDB',
        '',
        duration,
        true
      );

      this.monitoring.trackEvent('shard.created', {
        shardId: shard.id,
        tenantId: shard.tenantId,
        shardTypeId: shard.shardTypeId,
      });

      // Cache the structured data
      if (this.cacheService) {
        await this.cacheService.cacheStructuredData(
          shard.tenantId,
          shard.id,
          shard.structuredData
        );
        // Invalidate list caches since a new shard was created
        await (this.cacheService as any).invalidateListCaches(shard.tenantId).catch(() => {
          // Log but don't fail - cache invalidation failures shouldn't break the application
        });
      }

      // Send embedding job to Service Bus if enabled
      if (this.serviceBusService && !input.skipEnqueueing && true) {
        try {
          this.monitoring?.trackEvent('shard-repository.embedding-job-enabled', {
            shardTypeId: shard.shardTypeId,
          });
          // Check if this shard type should be ignored
          if (!this.serviceBusService.isShardTypeIgnored(shard.shardTypeId)) {
            // Shard type is not ignored, proceeding with embedding job
            const dedupeKey = `shard-create-${shard.id}-${shard.revisionNumber}`;
            const embeddingJob: EmbeddingJobMessage = {
              shardId: shard.id,
              tenantId: shard.tenantId,
              shardTypeId: shard.shardTypeId,
              revisionNumber: shard.revisionNumber,
              dedupeKey,
              enqueuedAt: new Date().toISOString(),
            };

            await this.serviceBusService.sendEmbeddingJob(embeddingJob);
            this.monitoring?.trackEvent('shard-repository.embedding-job-sent', {
              shardId: shard.id,
              shardTypeId: shard.shardTypeId,
            });
          } else {
            this.monitoring?.trackEvent('shard-repository.embedding-job-ignored', {
              shardTypeId: shard.shardTypeId,
            });
          }
        } catch (error) {
          // Log error but don't fail the shard creation
          // Error already tracked by monitoring.trackException below
          this.monitoring?.trackException(error as Error, {
            context: 'shard.repository.create.embedding',
            shardId: shard.id,
          });
        }
      } else {
        this.monitoring?.trackEvent('shard-repository.embedding-job-skipped', {
          hasServiceBus: !!this.serviceBusService,
          skipEnqueueing: input.skipEnqueueing,
          embeddingJobEnabled: true,
        });
      }

      // Send shard-created event to Service Bus for project auto-attachment (Phase 2)
      if (this.serviceBusService && !input.skipEnqueueing) {
        try {
          await this.serviceBusService.sendShardCreatedEvent({
            shardId: shard.id,
            tenantId: shard.tenantId,
            shardTypeId: shard.shardTypeId,
            shard: resource as Shard, // Include full shard for processing
          });
        } catch (error) {
          // Log error but don't fail the shard creation
          // Error already tracked by monitoring.trackException below
          this.monitoring?.trackException(error as Error, {
            context: 'shard.repository.create.shard-created-event',
            shardId: shard.id,
          });
        }
      }

      // Phase 2: Log audit trail (non-blocking)
      if (this.auditTrailService) {
        try {
          const metadata = input.sourceDetails && typeof input.sourceDetails === 'object'
            ? {
                ipAddress: (input.sourceDetails as any).ipAddress,
                userAgent: (input.sourceDetails as any).userAgent,
              }
            : undefined;
          await this.auditTrailService.logCreate(
            resource as Shard,
            creatorId,
            metadata
          );
        } catch (error) {
          // Log but don't fail shard creation
          this.monitoring.trackException(error as Error, {
            context: 'shard.repository.create.audit-trail',
            shardId: shard.id,
          });
        }
      }

      return resource as Shard;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitoring.trackDependency(
        'cosmosdb.shard.create',
        'CosmosDB',
        '',
        duration,
        false
      );

      this.monitoring.trackException(error as Error, {
        operation: 'shard.repository.create',
        tenantId: input.tenantId,
      });

      throw error;
    }
  }

  /**
   * Find shard by ID
   * Uses cache-aside pattern: check cache first, then database
   */
  async findById(id: string, tenantId: string): Promise<Shard | null> {
    const startTime = Date.now();

    try {
      // Try cache first if cache service is available
      if (this.cacheService) {
        const cachedStructuredData = await this.cacheService.getCachedStructuredData(tenantId, id);

        if (cachedStructuredData !== null) {
          // Cache hit - we still need to fetch the full document from DB
          // because cache only stores structuredData
          // But we know the shard exists, so we can proceed with the DB call
          this.monitoring.trackEvent('shard.cache.partialHit', {
            shardId: id,
            tenantId,
          });
        }
      }

      const { resource } = await this.container.item(id, tenantId).read<Shard>();

      const duration = Date.now() - startTime;
      this.monitoring.trackDependency(
        'cosmosdb.shard.findById',
        'CosmosDB',
        '',
        duration,
        true
      );

      if (!resource || resource.status === ShardStatus.DELETED) {
        return null;
      }

      // Cache the structured data for future requests
      if (this.cacheService) {
        await this.cacheService.cacheStructuredData(
          tenantId,
          id,
          resource.structuredData
        );
      }

      return resource;
    } catch (error: unknown) {
      const duration = Date.now() - startTime;

      const errorCode = error && typeof error === 'object' && 'code' in error ? (error as { code?: number }).code : undefined;
      if (errorCode === 404) {
        this.monitoring.trackDependency(
          'cosmosdb.shard.findById',
          'CosmosDB',
          '',
          duration,
          true
        );
        return null;
      }

      this.monitoring.trackDependency(
        'cosmosdb.shard.findById',
        'CosmosDB',
        '',
        duration,
        false
      );

      this.monitoring.trackException(error as Error, {
        operation: 'shard.repository.findById',
        shardId: id,
        tenantId,
      });

      throw error;
    }
  }

  /**
   * Find multiple shards by IDs (batch operation)
   * Optimizes N+1 queries by fetching multiple shards in parallel
   * Uses cache-aside pattern: check cache first, then database
   */
  async findByIds(ids: string[], tenantId: string): Promise<(Shard | null)[]> {
    const startTime = Date.now();

    if (ids.length === 0) {
      return [];
    }

    // Limit batch size to prevent overwhelming the database
    const MAX_BATCH_SIZE = 100;
    if (ids.length > MAX_BATCH_SIZE) {
      this.monitoring.trackEvent('shard.repository.findByIds.batchSplit', {
        totalIds: ids.length,
        batchSize: MAX_BATCH_SIZE,
        tenantId,
      });
      
      // Process in batches
      const results: (Shard | null)[] = [];
      for (let i = 0; i < ids.length; i += MAX_BATCH_SIZE) {
        const batch = ids.slice(i, i + MAX_BATCH_SIZE);
        const batchResults = await this.findByIds(batch, tenantId);
        results.push(...batchResults);
      }
      return results;
    }

    try {
      // Check cache for all IDs first
      const cachedResults: Map<string, Shard | null> = new Map();
      const uncachedIds: string[] = [];

      if (this.cacheService) {
        const cachePromises = ids.map(async (id) => {
          const cachedStructuredData = await this.cacheService!.getCachedStructuredData(tenantId, id);
          if (cachedStructuredData !== null) {
            // Cache hit - we still need to fetch full document, but we know it exists
            this.monitoring.trackEvent('shard.cache.partialHit', {
              shardId: id,
              tenantId,
            });
          }
        });
        await Promise.all(cachePromises);
      }

      // Fetch all shards in parallel using Cosmos DB read operations
      const readPromises = ids.map(async (id) => {
        try {
          const { resource } = await this.container.item(id, tenantId).read<Shard>();
          
          if (!resource || resource.status === ShardStatus.DELETED) {
            return null;
          }

          // Cache the structured data for future requests
          if (this.cacheService) {
            await this.cacheService.cacheStructuredData(
              tenantId,
              id,
              resource.structuredData
            );
          }

          return resource;
        } catch (error: unknown) {
          const errorCode = error && typeof error === 'object' && 'code' in error ? (error as { code?: number }).code : undefined;
          if (errorCode === 404) {
            return null;
          }
          
          // Log non-404 errors but don't fail the entire batch
          this.monitoring.trackException(error as Error, {
            operation: 'shard.repository.findByIds.item',
            shardId: id,
            tenantId,
          });
          return null;
        }
      });

      const results = await Promise.all(readPromises);

      const duration = Date.now() - startTime;
      const foundCount = results.filter(r => r !== null).length;
      
      this.monitoring.trackDependency(
        'cosmosdb.shard.findByIds',
        'CosmosDB',
        '',
        duration,
        true
      );

      this.monitoring.trackEvent('shard.findByIds.completed', {
        tenantId,
        requestedCount: ids.length,
        foundCount,
        duration,
      });

      return results;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.monitoring.trackDependency(
        'cosmosdb.shard.findByIds',
        'CosmosDB',
        '',
        duration,
        false
      );

      this.monitoring.trackException(error as Error, {
        operation: 'shard.repository.findByIds',
        tenantId,
        idsCount: ids.length,
      });

      // Return array of nulls on error to maintain API contract
      return ids.map(() => null);
    }
  }

  /**
   * Update shard
   */
  async update(id: string, tenantId: string, input: UpdateShardInput): Promise<Shard | null> {
    const startTime = Date.now();

    try {
      const existing = await this.findById(id, tenantId);
      if (!existing) {
        return null;
      }

      // Track when status changes to archived
      let archivedAt = existing.archivedAt;
      if (input.status === ShardStatus.ARCHIVED && existing.status !== ShardStatus.ARCHIVED) {
        archivedAt = new Date();
      } else if (input.status && input.status !== ShardStatus.ARCHIVED) {
        archivedAt = undefined; // Clear if moving out of archived
      }

      const updated: Shard = {
        ...existing,
        structuredData: input.structuredData ?? existing.structuredData,
        unstructuredData: input.unstructuredData ?? existing.unstructuredData,
        metadata: input.metadata ?? existing.metadata,
        internal_relationships: input.internal_relationships ?? existing.internal_relationships,
        external_relationships: input.external_relationships ?? existing.external_relationships,
        acl: input.acl ?? existing.acl,
        enrichment: input.enrichment ?? existing.enrichment,
        status: input.status ?? existing.status,
        schemaVersion: input.schemaVersion ?? existing.schemaVersion,
        archivedAt,
        lastActivityAt: new Date(), // Update activity timestamp
        revisionId: uuidv4(),
        revisionNumber: existing.revisionNumber + 1,
        updatedAt: new Date(),
      };

      // Phase 2: Apply redaction if configured (non-blocking)
      if (this.redactionService) {
        try {
          const redacted = this.redactionService.applyRedaction(updated, tenantId);
          // If redaction was applied, update shard metadata
          if (redacted.metadata?.redaction) {
            updated.metadata = {
              ...updated.metadata,
              redaction: redacted.metadata.redaction,
            };
          }
        } catch (error) {
          // Log but don't fail shard update
          this.monitoring.trackException(error as Error, {
            context: 'shard.repository.update.redaction',
            shardId: id,
          });
        }
      }

      // Phase 2: Compute changes for audit trail (before saving)
      let changes: Array<{ field: string; oldValue?: any; newValue?: any }> = [];
      if (this.auditTrailService) {
        try {
          // Use ShardEventService's static method to compute changes
          const { ShardEventService } = await import('../services/shard-event.service.js');
          const fieldChanges = ShardEventService.calculateChanges(existing, updated);
          changes = fieldChanges.map(change => ({
            field: change.field,
            oldValue: change.oldValue,
            newValue: change.newValue,
          }));
        } catch (error) {
          // Log but continue - changes computation is best effort
          this.monitoring.trackException(error as Error, {
            context: 'shard.repository.update.compute-changes',
            shardId: id,
          });
        }
      }

      const { resource } = await this.container.item(id, tenantId).replace(updated);

      const duration = Date.now() - startTime;
      this.monitoring.trackDependency(
        'cosmosdb.shard.update',
        'CosmosDB',
        '',
        duration,
        true
      );

      this.monitoring.trackEvent('shard.updated', {
        shardId: id,
        tenantId,
        revisionNumber: updated.revisionNumber,
      });

      // Invalidate cache and publish event
      if (this.cacheService) {
        await this.cacheService.invalidateShardCache(tenantId, id, true);
        // Invalidate list caches since a shard was updated
        await (this.cacheService as any).invalidateListCaches(tenantId).catch(() => {
          // Log but don't fail - cache invalidation failures shouldn't break the application
        });
      }

      // Send embedding job to Service Bus if enabled
      if (this.serviceBusService && true) {
        try {
          this.monitoring?.trackEvent('shard-repository.update.embedding-job-enabled', {
            shardTypeId: updated.shardTypeId,
          });
          // Check if this shard type should be ignored
          if (!this.serviceBusService.isShardTypeIgnored(updated.shardTypeId)) {
            // Shard type is not ignored, proceeding with embedding job
            const dedupeKey = `shard-update-${updated.id}-${updated.revisionNumber}`;
            const embeddingJob: EmbeddingJobMessage = {
              shardId: updated.id,
              tenantId: updated.tenantId,
              shardTypeId: updated.shardTypeId,
              revisionNumber: updated.revisionNumber,
              dedupeKey,
              enqueuedAt: new Date().toISOString(),
            };

            await this.serviceBusService.sendEmbeddingJob(embeddingJob);
            this.monitoring?.trackEvent('shard-repository.update.embedding-job-sent', {
              shardId: updated.id,
              shardTypeId: updated.shardTypeId,
            });
          } else {
            this.monitoring?.trackEvent('shard-repository.update.embedding-job-ignored', {
              shardTypeId: updated.shardTypeId,
            });
          }
        } catch (error) {
          // Log error but don't fail the shard update
          // Error already tracked by monitoring.trackException below
          this.monitoring?.trackException(error as Error, {
            context: 'shard.repository.update.embedding',
            shardId: updated.id,
          });
        }
      } else {
        this.monitoring?.trackEvent('shard-repository.update.embedding-job-skipped', {
          hasServiceBus: !!this.serviceBusService,
          embeddingJobEnabled: true,
        });
      }

      // Phase 2: Log audit trail (non-blocking)
      if (this.auditTrailService && changes.length > 0) {
        try {
          // Try to get userId from updated shard, existing shard, or default to 'system'
          const userId = (resource as Shard).userId || existing.userId || 'system';
          // Extract metadata from input if available
          const metadata = (input as any).sourceDetails && typeof (input as any).sourceDetails === 'object'
            ? {
                ipAddress: (input as any).sourceDetails.ipAddress,
                userAgent: (input as any).sourceDetails.userAgent,
              }
            : undefined;
          await this.auditTrailService.logUpdate(
            resource as Shard,
            userId,
            changes,
            metadata
          );
        } catch (error) {
          // Log but don't fail shard update
          this.monitoring.trackException(error as Error, {
            context: 'shard.repository.update.audit-trail',
            shardId: id,
          });
        }
      }

      return resource as Shard;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitoring.trackDependency(
        'cosmosdb.shard.update',
        'CosmosDB',
        '',
        duration,
        false
      );

      this.monitoring.trackException(error as Error, {
        operation: 'shard.repository.update',
        shardId: id,
        tenantId,
      });

      throw error;
    }
  }

  /**
   * Soft delete shard
   * Sets status to DELETED and optionally sets TTL for automatic cleanup
   */
  async delete(id: string, tenantId: string, hardDelete = false): Promise<boolean> {
    const startTime = Date.now();

    try {
      if (hardDelete) {
        await this.container.item(id, tenantId).delete();
      } else {
        const existing = await this.findById(id, tenantId);
        if (!existing) {
          return false;
        }

        const deleted: Shard & { ttl?: number } = {
          ...existing,
          status: ShardStatus.DELETED,
          deletedAt: new Date(),
          updatedAt: new Date(),
          ttl: 7776000, // 90 days in seconds
        };

        await this.container.item(id, tenantId).replace(deleted);
      }

      const duration = Date.now() - startTime;
      this.monitoring.trackDependency(
        'cosmosdb.shard.delete',
        'CosmosDB',
        '',
        duration,
        true
      );

      this.monitoring.trackEvent('shard.deleted', {
        shardId: id,
        tenantId,
        hardDelete,
      });

      // Invalidate cache and publish event
      if (this.cacheService) {
        await this.cacheService.invalidateShardCache(tenantId, id, true);
        // Invalidate list caches since a shard was updated
        await (this.cacheService as any).invalidateListCaches(tenantId).catch(() => {
          // Log but don't fail - cache invalidation failures shouldn't break the application
        });
      }

      return true;
    } catch (error: unknown) {
      const duration = Date.now() - startTime;

      const errorCode = error && typeof error === 'object' && 'code' in error ? (error as { code?: number }).code : undefined;
      if (errorCode === 404) {
        return false;
      }

      this.monitoring.trackDependency(
        'cosmosdb.shard.delete',
        'CosmosDB',
        '',
        duration,
        false
      );

      this.monitoring.trackException(error as Error, {
        operation: 'shard.repository.delete',
        shardId: id,
        tenantId,
      });

      throw error;
    }
  }

  /**
   * Restore a soft-deleted shard
   */
  async restore(id: string, tenantId: string): Promise<Shard | null> {
    const startTime = Date.now();

    try {
      // Fetch the shard directly (including deleted ones)
      const { resource } = await this.container.item(id, tenantId).read<Shard & { ttl?: number }>();

      if (!resource) {
        return null;
      }

      // Check if actually deleted
      if (resource.status !== ShardStatus.DELETED) {
        return null; // Not deleted, nothing to restore
      }

      const restored: Shard & { ttl?: number } = {
        ...resource,
        status: ShardStatus.ACTIVE,
        deletedAt: undefined,
        updatedAt: new Date(),
        ttl: -1, // Remove TTL
      };

      // Remove TTL property entirely
      delete restored.ttl;

      const { resource: result } = await this.container.item(id, tenantId).replace(restored);

      const duration = Date.now() - startTime;
      this.monitoring.trackDependency(
        'cosmosdb.shard.restore',
        'CosmosDB',
        '',
        duration,
        true
      );

      this.monitoring.trackEvent('shard.restored', {
        shardId: id,
        tenantId,
      });

      // Invalidate cache
      if (this.cacheService) {
        await this.cacheService.invalidateShardCache(tenantId, id, true);
        // Invalidate list caches since a shard was restored
        await (this.cacheService as any).invalidateListCaches(tenantId).catch(() => {
          // Log but don't fail - cache invalidation failures shouldn't break the application
        });
      }

      return result as Shard;
    } catch (error: unknown) {
      const duration = Date.now() - startTime;

      const errorCode = error && typeof error === 'object' && 'code' in error ? (error as { code?: number }).code : undefined;
      if (errorCode === 404) {
        return null;
      }

      this.monitoring.trackDependency(
        'cosmosdb.shard.restore',
        'CosmosDB',
        '',
        duration,
        false
      );

      this.monitoring.trackException(error as Error, {
        operation: 'shard.repository.restore',
        shardId: id,
        tenantId,
      });

      throw error;
    }
  }

  /**
   * Generate a hash for query parameters (for caching)
   */
  private hashQueryOptions(options: ShardListOptions): string {
    // Exclude continuationToken from hash (pagination state)
    const { continuationToken, ...hashableOptions } = options;
    const queryString = JSON.stringify(hashableOptions);
    return createHash('sha256').update(queryString).digest('hex').substring(0, 16);
  }

  /**
   * List shards with filtering and pagination
   * Uses cache-aside pattern: check cache first, then database
   */
  async list(options: ShardListOptions): Promise<ShardListResult> {
    const startTime = Date.now();
    
    // Declare variables outside try block for error logging
    let query: string = '';
    let parameters: any[] = [];

    try {
      const { filter, limit = 50, continuationToken, orderBy: rawOrderBy = 'createdAt', orderDirection = 'desc' } = options;

      // Only cache first page (no continuation token)
      // Subsequent pages are less likely to be repeated and caching them adds complexity
      const shouldCache = !continuationToken && filter?.tenantId;
      
      if (shouldCache && this.cacheService) {
        const queryHash = this.hashQueryOptions(options);
        const cached = await (this.cacheService as any).getCachedListResult<ShardListResult>(
          filter.tenantId!,
          queryHash
        );
        
        if (cached) {
          const duration = Date.now() - startTime;
          this.monitoring.trackDependency(
            'cosmosdb.shard.list',
            'CosmosDB',
            '',
            duration,
            true
          );
          this.monitoring.trackEvent('shard.list.cache.hit', {
            tenantId: filter.tenantId,
            queryHash,
          });
          return cached;
        }
        
        this.monitoring.trackEvent('shard.list.cache.miss', {
          tenantId: filter.tenantId,
          queryHash,
        });
      }

      // Validate orderBy field name to prevent SQL injection
      let orderBy = String(rawOrderBy).trim();
      if (!orderBy || !/^[a-zA-Z0-9_.]+$/.test(orderBy)) {
        this.monitoring.trackException(new Error('Invalid orderBy field name'), {
          operation: 'shard.repository.list',
          invalidField: orderBy,
        });
        orderBy = 'createdAt'; // Fallback to safe default
      }

      // Build query
      query = 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.status != @deletedStatus';
      parameters = [
        { name: '@tenantId', value: filter?.tenantId },
        { name: '@deletedStatus', value: ShardStatus.DELETED },
      ];

      if (filter?.userId) {
        query += ' AND c.userId = @userId';
        parameters.push({ name: '@userId', value: filter.userId });
      }

      if (filter?.shardTypeId) {
        query += ' AND c.shardTypeId = @shardTypeId';
        parameters.push({ name: '@shardTypeId', value: filter.shardTypeId });
      }

      if (filter?.status) {
        query += ' AND c.status = @status';
        parameters.push({ name: '@status', value: filter.status });
      }

      if (filter?.createdAfter) {
        query += ' AND c.createdAt >= @createdAfter';
        parameters.push({ name: '@createdAfter', value: filter.createdAfter.toISOString() });
      }

      if (filter?.createdBefore) {
        query += ' AND c.createdAt <= @createdBefore';
        parameters.push({ name: '@createdBefore', value: filter.createdBefore.toISOString() });
      }

      // New filter fields
      if (filter?.source) {
        query += ' AND c.source = @source';
        parameters.push({ name: '@source', value: filter.source });
      }

      if (filter?.lastActivityAfter) {
        query += ' AND c.lastActivityAt >= @lastActivityAfter';
        parameters.push({ name: '@lastActivityAfter', value: filter.lastActivityAfter.toISOString() });
      }

      if (filter?.lastActivityBefore) {
        query += ' AND c.lastActivityAt <= @lastActivityBefore';
        parameters.push({ name: '@lastActivityBefore', value: filter.lastActivityBefore.toISOString() });
      }

      if (filter?.archivedAfter) {
        query += ' AND c.archivedAt >= @archivedAfter';
        parameters.push({ name: '@archivedAfter', value: filter.archivedAfter.toISOString() });
      }

      if (filter?.archivedBefore) {
        query += ' AND c.archivedAt <= @archivedBefore';
        parameters.push({ name: '@archivedBefore', value: filter.archivedBefore.toISOString() });
      }

      if (filter?.managerId) {
        // Support both legacy managerId and new ownerId
        query += ' AND (c.structuredData.managerId = @managerId OR c.structuredData.ownerId = @managerId)';
        parameters.push({ name: '@managerId', value: filter.managerId });
      }

      if (filter?.teamMemberId) {
        // Support both legacy team (string[]) and new teamMembers (object[])
        query += ' AND (ARRAY_CONTAINS(c.structuredData.team, @teamMemberId) OR ARRAY_CONTAINS(c.structuredData.teamMembers, { id: @teamMemberId }, true))';
        parameters.push({ name: '@teamMemberId', value: filter.teamMemberId });
      }

      // StructuredData filters - for filtering by fields in structuredData
      if (filter?.structuredDataFilters) {
        let paramIndex = 0;
        for (const [key, value] of Object.entries(filter.structuredDataFilters)) {
          if (value !== undefined && value !== null) {
            // Validate field name to prevent SQL injection - only allow alphanumeric, dots, underscores
            const sanitizedKey = String(key).trim();
            if (!sanitizedKey || !/^[a-zA-Z0-9_.]+$/.test(sanitizedKey)) {
              this.monitoring.trackException(new Error('Invalid field name in structuredDataFilters'), {
                operation: 'shard.repository.list',
                invalidField: sanitizedKey,
              });
              continue; // Skip invalid field names
            }
            const paramName = `sdFilter${paramIndex}`;
            
            // Handle different value types
            if (Array.isArray(value)) {
              // IN clause for arrays - filter out null/undefined values
              const validValues = value.filter(v => v !== null && v !== undefined && v !== '');
              if (validValues.length === 0) {
                continue; // Skip if all values are null/undefined/empty
              }
              if (validValues.length === 1) {
                // Single value - use equality for better performance
                query += ` AND c.structuredData.${sanitizedKey} = @${paramName}`;
                parameters.push({ name: `@${paramName}`, value: validValues[0] });
              } else {
                // Multiple values - use OR conditions (Cosmos DB doesn't reliably support IN with parameters)
                const orConditions = validValues.map((v, i) => {
                  const inParamName = `${paramName}_${i}`;
                  parameters.push({ name: `@${inParamName}`, value: v });
                  return `c.structuredData.${sanitizedKey} = @${inParamName}`;
                });
                query += ` AND (${orConditions.join(' OR ')})`;
              }
            } else if (typeof value === 'object' && 'min' in value && 'max' in value) {
              // Range filter (e.g., { min: 0.5, max: 0.8 })
              query += ` AND c.structuredData.${sanitizedKey} >= @${paramName}_min AND c.structuredData.${sanitizedKey} <= @${paramName}_max`;
              parameters.push({ name: `@${paramName}_min`, value: value.min });
              parameters.push({ name: `@${paramName}_max`, value: value.max });
            } else if (typeof value === 'object' && 'operator' in value) {
              // Advanced filter with operator (e.g., { operator: 'gt', value: 100 })
              const operator = value.operator || 'eq';
              const filterValue = value.value;
              if (filterValue === null || filterValue === undefined) {
                continue; // Skip null/undefined filter values
              }
              const opMap: Record<string, string> = {
                'eq': '=',
                'ne': '!=',
                'gt': '>',
                'gte': '>=',
                'lt': '<',
                'lte': '<=',
              };
              query += ` AND c.structuredData.${sanitizedKey} ${opMap[operator] || '='} @${paramName}`;
              parameters.push({ name: `@${paramName}`, value: filterValue });
            } else {
              // Simple equality - ensure field exists and value is not null
              if (value === null || value === undefined) {
                continue; // Skip null/undefined values
              }
              // Ensure string values are not empty
              if (typeof value === 'string' && value.trim() === '') {
                continue; // Skip empty strings
              }
              // Clean the value
              const cleanValue = typeof value === 'string' ? value.trim() : value;
              
              // Use a simpler query pattern - Cosmos DB handles undefined fields gracefully
              // Just check equality, and missing fields won't match
              query += ` AND c.structuredData.${sanitizedKey} = @${paramName}`;
              parameters.push({ name: `@${paramName}`, value: cleanValue });
            }
            paramIndex++;
          }
        }
      }

      query += ` ORDER BY c.${orderBy} ${orderDirection.toUpperCase()}`;

      const querySpec = {
        query,
        parameters,
      };

      // Validate parameters before querying
      const invalidParams = parameters.filter(p => 
        p.value === undefined || 
        (typeof p.value === 'string' && p.value.includes('\0')) ||
        (p.name && !p.name.startsWith('@'))
      );
      
      if (invalidParams.length > 0) {
        const invalidParamNames = invalidParams.map(p => p.name).join(', ');
        this.monitoring.trackException(new Error('Invalid query parameters'), {
          operation: 'shard.repository.list',
          invalidParams: invalidParamNames,
        });
        throw new Error(`Invalid query parameters detected: ${invalidParamNames}`);
      }

      // Debug logging for Cosmos DB query errors
      if (query.includes('structuredData.ownerId')) {
        this.monitoring.trackEvent('cosmosdb.shard.list.debug', {
          query: query.substring(0, 300),
          paramCount: parameters.length,
          ownerIdParam: parameters.find(p => p.name.includes('ownerId') || p.name.includes('sdFilter'))?.value,
        });
      }

      const { resources, continuationToken: newContinuationToken } = await this.container.items
        .query(querySpec, {
          maxItemCount: limit,
          continuationToken,
        })
        .fetchNext();

      const result: ShardListResult = {
        shards: resources as Shard[],
        continuationToken: newContinuationToken,
        count: resources.length,
      };

      // Cache the result (only for first page, no continuation token)
      if (shouldCache && this.cacheService && filter?.tenantId) {
        const queryHash = this.hashQueryOptions(options);
        // Use short TTL (2 minutes) for list queries to balance freshness and performance
        const listCacheTTL = 2 * 60; // 2 minutes
        await (this.cacheService as any).cacheListResult(
          filter.tenantId,
          queryHash,
          result,
          listCacheTTL
        ).catch((error: Error) => {
          // Log but don't fail - cache failures shouldn't break the application
          this.monitoring.trackException(error, {
            operation: 'shard.repository.list.cache',
            tenantId: filter.tenantId,
          });
        });
      }

      const duration = Date.now() - startTime;
      this.monitoring.trackDependency(
        'cosmosdb.shard.list',
        'CosmosDB',
        '',
        duration,
        true
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitoring.trackDependency(
        'cosmosdb.shard.list',
        'CosmosDB',
        '',
        duration,
        false
      );

      // Log query details for debugging Cosmos DB errors
      this.monitoring.trackException(error as Error, {
        operation: 'shard.repository.list',
        tenantId: options.filter?.tenantId,
        query: query?.substring(0, 500), // First 500 chars
        parameterCount: parameters?.length,
        parameterNames: parameters?.map(p => p.name).slice(0, 10).join(', '), // First 10 param names
      });

      throw error;
    }
  }

  /**
   * Check user permissions for a shard
   */
  async checkPermission(
    shardId: string,
    tenantId: string,
    userId: string
  ): Promise<PermissionCheckResult> {
    try {
      const shard = await this.findById(shardId, tenantId);
      if (!shard) {
        return { hasAccess: false, permissions: [] };
      }

      const aclEntry = shard.acl.find((entry) => entry.userId === userId);
      if (!aclEntry) {
        return { hasAccess: false, permissions: [] };
      }

      return {
        hasAccess: true,
        permissions: aclEntry.permissions,
      };
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'shard.repository.checkPermission',
        shardId,
        tenantId,
        userId,
      });

      return { hasAccess: false, permissions: [] };
    }
  }

  /**
   * Count Shards by tenant and optional ShardType
   */
  async count(tenantId: string, shardTypeId?: string): Promise<number> {
    const startTime = Date.now();

    try {
      let query: string;
      let parameters: { name: string; value: any }[];

      if (shardTypeId) {
        query = 'SELECT VALUE COUNT(1) FROM c WHERE c.tenantId = @tenantId AND c.shardTypeId = @shardTypeId';
        parameters = [
          { name: '@tenantId', value: tenantId },
          { name: '@shardTypeId', value: shardTypeId },
        ];
      } else {
        query = 'SELECT VALUE COUNT(1) FROM c WHERE c.tenantId = @tenantId';
        parameters = [{ name: '@tenantId', value: tenantId }];
      }

      const { resources } = await this.container.items
        .query<number>({ query, parameters })
        .fetchAll();

      this.monitoring.trackDependency(
        'cosmosdb.shard.count',
        'CosmosDB',
        '',
        Date.now() - startTime,
        true
      );

      return resources[0] || 0;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'shard.repository.count',
        tenantId,
        shardTypeId,
      });
      throw error;
    }
  }

  /**
   * Update vectors for a shard
   * Used by embedding generation service
   */
  async updateVectors(
    shardId: string,
    tenantId: string,
    vectors: Shard['vectors']
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Fetch current shard
      const shard = await this.findById(shardId, tenantId);
      if (!shard) {
        throw new Error(`Shard ${shardId} not found`);
      }

      // Update vectors and metadata
      const updatedShard: Shard = {
        ...shard,
        vectors,
        updatedAt: new Date(),
      };

      // Replace in Cosmos DB
      await this.container.items.upsert(updatedShard);

      // Invalidate cache
      if (this.cacheService) {
        await this.cacheService.invalidateShardCache(tenantId, shardId);
      }

      this.monitoring.trackEvent('shard.vectors.updated', {
        shardId,
        tenantId,
        vectorCount: vectors?.length || 0,
      });

      this.monitoring.trackDependency(
        'cosmosdb.shard.update-vectors',
        'CosmosDB',
        '',
        Date.now() - startTime,
        true
      );
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'shard.repository.updateVectors',
        shardId,
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Find shards by shard type
   * Used for bulk re-embedding operations
   */
  async findByShardType(
    shardTypeId: string,
    tenantId: string,
    options?: {
      limit?: number;
      offset?: number;
      statusFilter?: ShardStatus[];
    }
  ): Promise<Shard[]> {
    const startTime = Date.now();

    try {
      let query = `
        SELECT * FROM c 
        WHERE c.tenantId = @tenantId 
        AND c.shardTypeId = @shardTypeId
      `;

      const parameters: any[] = [
        { name: '@tenantId', value: tenantId },
        { name: '@shardTypeId', value: shardTypeId },
      ];

      // Add status filter if provided
      if (options?.statusFilter && options.statusFilter.length > 0) {
        query += ` AND c.status IN (${options.statusFilter.map((_, i) => `@status${i}`).join(', ')})`;
        options.statusFilter.forEach((status, i) => {
          parameters.push({ name: `@status${i}`, value: status });
        });
      }

      query += ' ORDER BY c.createdAt DESC';

      // Add pagination
      if (options?.offset) {
        query += ` OFFSET ${options.offset} LIMIT ${options.limit || 100}`;
      } else if (options?.limit) {
        query += ` OFFSET 0 LIMIT ${options.limit}`;
      }

      const { resources } = await this.container.items
        .query<Shard>({ query, parameters })
        .fetchAll();

      this.monitoring.trackDependency(
        'cosmosdb.shard.findByShardType',
        'CosmosDB',
        '',
        Date.now() - startTime,
        true
      );

      return resources;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'shard.repository.findByShardType',
        shardTypeId,
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Check if container is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.container.read();
      return true;
    } catch (error) {
      return false;
    }
  }
}
