import { CosmosClient, Container, ContainerDefinition } from '@azure/cosmos';
import { IMonitoringProvider } from '@castiel/monitoring';
import { config } from '../config/env.js';
import {
  Revision,
  CreateRevisionInput,
  RevisionListOptions,
  RevisionListResult,
  ChangeType,
  RevisionComparison,
  RevisionStats,
  RevisionRetentionPolicy,
  DEFAULT_RETENTION_POLICY,
  calculateRevisionTTL,
  FieldDelta,
  RevisionStorageStrategy,
} from '../types/revision.types.js';
import { v4 as uuidv4 } from 'uuid';
import { promisify } from 'util';
import { gzip, gunzip } from 'zlib';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

/**
 * Cosmos DB container configuration for Revisions
 * Always fetch fresh from DB (no caching)
 */
const REVISION_CONTAINER_CONFIG: ContainerDefinition = {
  id: config.cosmosDb.containers.revisions,
  partitionKey: {
    paths: ['/tenantId'],
  },
  defaultTtl: -1, // Disabled by default, set per document
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
        path: '/data/snapshot/*', // Don't index large snapshot objects
      },
      {
        path: '/data/delta/*', // Don't index delta objects
      },
    ],
    compositeIndexes: [
      [
        { path: '/tenantId', order: 'ascending' },
        { path: '/shardId', order: 'ascending' },
        { path: '/revisionNumber', order: 'descending' },
      ],
      [
        { path: '/tenantId', order: 'ascending' },
        { path: '/shardId', order: 'ascending' },
        { path: '/timestamp', order: 'descending' },
      ],
      [
        { path: '/tenantId', order: 'ascending' },
        { path: '/changeType', order: 'ascending' },
        { path: '/timestamp', order: 'descending' },
      ],
      [
        { path: '/tenantId', order: 'ascending' },
        { path: '/changedBy', order: 'ascending' },
        { path: '/timestamp', order: 'descending' },
      ],
    ],
  },
};

/**
 * Revision Repository
 * Handles all Cosmos DB operations for Revisions
 * NO CACHING - Always fetch fresh from DB for data integrity
 */
export class RevisionRepository {
  private client: CosmosClient;
  private container: Container;
  private monitoring: IMonitoringProvider;
  private retentionPolicy: RevisionRetentionPolicy;
  private compressionThreshold: number;

  constructor(
    monitoring: IMonitoringProvider,
    retentionPolicy: RevisionRetentionPolicy = DEFAULT_RETENTION_POLICY,
    compressionThreshold: number = 10 * 1024 // 10KB
  ) {
    this.monitoring = monitoring;
    this.retentionPolicy = retentionPolicy;
    this.compressionThreshold = compressionThreshold;
    this.client = new CosmosClient({
      endpoint: config.cosmosDb.endpoint,
      key: config.cosmosDb.key,
    });
    this.container = this.client
      .database(config.cosmosDb.databaseId)
      .container(config.cosmosDb.containers.revisions);
  }

  /**
   * Initialize container with proper indexing and TTL
   */
  async ensureContainer(): Promise<void> {
    try {
      const { database } = await this.client.databases.createIfNotExists({
        id: config.cosmosDb.databaseId,
      });

      await database.containers.createIfNotExists(REVISION_CONTAINER_CONFIG);

      this.monitoring.trackEvent('cosmosdb.container.ensured', {
        container: config.cosmosDb.containers.revisions,
      });

      this.monitoring.trackEvent('cosmosdb.container.ensured', { containerId: config.cosmosDb.containers.revisions });
    } catch (error: unknown) {
      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
        operation: 'revision.repository.ensureContainer',
      });
      throw error;
    }
  }

  /**
   * Compress data if it exceeds threshold
   */
  private async compressData(data: any): Promise<{ data: any; compressed: boolean; originalSize: number; compressedSize: number }> {
    const jsonString = JSON.stringify(data);
    const originalSize = Buffer.byteLength(jsonString, 'utf8');

    // Only compress if larger than threshold
    if (originalSize < this.compressionThreshold) {
      return {
        data,
        compressed: false,
        originalSize,
        compressedSize: originalSize,
      };
    }

    try {
      const buffer = Buffer.from(jsonString, 'utf8');
      const compressed = await gzipAsync(buffer);
      const compressedSize = compressed.length;

      this.monitoring.trackEvent('revision.data.compressed', {
        originalSize,
        compressedSize,
        compressionRatio: compressedSize / originalSize,
      });

      return {
        data: compressed.toString('base64'), // Store as base64 string
        compressed: true,
        originalSize,
        compressedSize,
      };
    } catch (error: unknown) {
      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
        operation: 'revision.repository.compressData',
      });
      // Fall back to uncompressed if compression fails
      return {
        data,
        compressed: false,
        originalSize,
        compressedSize: originalSize,
      };
    }
  }

  /**
   * Decompress data if it was compressed
   */
  private async decompressData(data: any, compressed: boolean): Promise<any> {
    if (!compressed) {
      return data;
    }

    try {
      const buffer = Buffer.from(data as string, 'base64');
      const decompressed = await gunzipAsync(buffer);
      return JSON.parse(decompressed.toString('utf8'));
    } catch (error: unknown) {
      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
        operation: 'revision.repository.decompressData',
      });
      throw new Error('Failed to decompress revision data');
    }
  }

  /**
   * Create a new revision
   */
  async create(input: CreateRevisionInput): Promise<Revision> {
    const startTime = Date.now();

    try {
      // Compress data if needed
      const { data: processedData, compressed, originalSize, compressedSize } = 
        await this.compressData(input.data.snapshot || input.data.delta);

      // Calculate TTL based on retention policy
      const ttl = input.ttl ?? calculateRevisionTTL(input.changeType, this.retentionPolicy);

      const revision: Revision = {
        id: uuidv4(),
        shardId: input.shardId,
        tenantId: input.tenantId,
        revisionNumber: input.revisionNumber,
        data: {
          strategy: input.data.strategy,
          snapshot: input.data.strategy === RevisionStorageStrategy.FULL_SNAPSHOT ? processedData : undefined,
          delta: input.data.strategy === RevisionStorageStrategy.DELTA ? processedData : undefined,
          compressed,
          originalSize,
          compressedSize,
        },
        changeType: input.changeType,
        changedBy: input.changedBy,
        timestamp: new Date(),
        metadata: input.metadata,
        ttl,
        createdAt: new Date(),
      };

      const { resource } = await this.container.items.create(revision);

      const duration = Date.now() - startTime;
      this.monitoring.trackDependency(
        'cosmosdb.revision.create',
        'CosmosDB',
        config.cosmosDb.endpoint,
        duration,
        true
      );

      this.monitoring.trackEvent('revision.created', {
        revisionId: revision.id,
        shardId: revision.shardId,
        tenantId: revision.tenantId,
        revisionNumber: revision.revisionNumber,
        changeType: revision.changeType,
        compressed,
        originalSize,
        compressedSize,
        ttl,
      });

      return resource as Revision;
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      this.monitoring.trackDependency(
        'cosmosdb.revision.create',
        'CosmosDB',
        config.cosmosDb.endpoint,
        duration,
        false
      );

      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
        operation: 'revision.repository.create',
        shardId: input.shardId,
        tenantId: input.tenantId,
      });

      throw error;
    }
  }

  /**
   * Find revision by ID
   */
  async findById(id: string, tenantId: string): Promise<Revision | null> {
    const startTime = Date.now();

    try {
      const { resource } = await this.container.item(id, tenantId).read<Revision>();

      const duration = Date.now() - startTime;
      this.monitoring.trackDependency(
        'cosmosdb.revision.findById',
        'CosmosDB',
        config.cosmosDb.endpoint,
        duration,
        true
      );

      if (!resource) {
        return null;
      }

      // Decompress data if needed
      if (resource.data.compressed) {
        if (resource.data.snapshot) {
          resource.data.snapshot = await this.decompressData(resource.data.snapshot, true);
        }
        if (resource.data.delta) {
          resource.data.delta = await this.decompressData(resource.data.delta, true);
        }
      }

      return resource;
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      this.monitoring.trackDependency(
        'cosmosdb.revision.findById',
        'CosmosDB',
        config.cosmosDb.endpoint,
        duration,
        false
      );

      const errorCode = error && typeof error === 'object' && 'code' in error ? (error as { code?: number }).code : undefined;
      if (errorCode === 404) {
        return null;
      }

      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
        operation: 'revision.repository.findById',
        id,
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Find revision by shard ID and revision number
   */
  async findByRevisionNumber(
    shardId: string,
    tenantId: string,
    revisionNumber: number
  ): Promise<Revision | null> {
    const startTime = Date.now();

    try {
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.shardId = @shardId AND c.tenantId = @tenantId AND c.revisionNumber = @revisionNumber',
        parameters: [
          { name: '@shardId', value: shardId },
          { name: '@tenantId', value: tenantId },
          { name: '@revisionNumber', value: revisionNumber },
        ],
      };

      const { resources } = await this.container.items.query<Revision>(querySpec).fetchAll();

      const duration = Date.now() - startTime;
      this.monitoring.trackDependency(
        'cosmosdb.revision.findByRevisionNumber',
        'CosmosDB',
        config.cosmosDb.endpoint,
        duration,
        true
      );

      if (!resources || resources.length === 0) {
        return null;
      }

      const revision = resources[0];

      // Decompress data if needed
      if (revision.data.compressed) {
        if (revision.data.snapshot) {
          revision.data.snapshot = await this.decompressData(revision.data.snapshot, true);
        }
        if (revision.data.delta) {
          revision.data.delta = await this.decompressData(revision.data.delta, true);
        }
      }

      return revision;
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      this.monitoring.trackDependency(
        'cosmosdb.revision.findByRevisionNumber',
        'CosmosDB',
        config.cosmosDb.endpoint,
        duration,
        false
      );

      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
        operation: 'revision.repository.findByRevisionNumber',
        shardId,
        tenantId,
        revisionNumber,
      });
      throw error;
    }
  }

  /**
   * Get the next revision number for a shard

      if (error.code === 404) {
        this.monitoring.trackDependency(
          'cosmosdb.revision.findById',
          'CosmosDB',
          config.cosmosDb.endpoint,
          duration,
          true
        );
        return null;
      }

      this.monitoring.trackDependency(
        'cosmosdb.revision.findById',
        'CosmosDB',
        config.cosmosDb.endpoint,
        duration,
        false
      );

      this.monitoring.trackException(error as Error, {
        operation: 'revision.repository.findById',
        revisionId: id,
        tenantId,
      });

      throw error;
    }
  }

  /**
   * Get next revision number for a shard
   * Sequential per shard: 1, 2, 3, ...
   */
  async getNextRevisionNumber(shardId: string, tenantId: string): Promise<number> {
    const startTime = Date.now();

    try {
      const querySpec = {
        query: 'SELECT VALUE MAX(c.revisionNumber) FROM c WHERE c.tenantId = @tenantId AND c.shardId = @shardId',
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@shardId', value: shardId },
        ],
      };

      const { resources } = await this.container.items.query(querySpec).fetchAll();

      const duration = Date.now() - startTime;
      this.monitoring.trackDependency(
        'cosmosdb.revision.getNextRevisionNumber',
        'CosmosDB',
        config.cosmosDb.endpoint,
        duration,
        true
      );

      const maxRevision = resources[0] || 0;
      return maxRevision + 1;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitoring.trackDependency(
        'cosmosdb.revision.getNextRevisionNumber',
        'CosmosDB',
        config.cosmosDb.endpoint,
        duration,
        false
      );

      this.monitoring.trackException(error as Error, {
        operation: 'revision.repository.getNextRevisionNumber',
        shardId,
        tenantId,
      });

      throw error;
    }
  }

  /**
   * Get latest revision for a shard
   */
  async getLatestRevision(shardId: string, tenantId: string): Promise<Revision | null> {
    const startTime = Date.now();

    try {
      const querySpec = {
        query: 'SELECT TOP 1 * FROM c WHERE c.tenantId = @tenantId AND c.shardId = @shardId ORDER BY c.revisionNumber DESC',
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@shardId', value: shardId },
        ],
      };

      const { resources } = await this.container.items.query(querySpec).fetchAll();

      const duration = Date.now() - startTime;
      this.monitoring.trackDependency(
        'cosmosdb.revision.getLatestRevision',
        'CosmosDB',
        config.cosmosDb.endpoint,
        duration,
        true
      );

      const revision = resources.length > 0 ? (resources[0] as Revision) : null;

      // Decompress if needed
      if (revision && revision.data.compressed) {
        if (revision.data.snapshot) {
          revision.data.snapshot = await this.decompressData(revision.data.snapshot, true);
        }
        if (revision.data.delta) {
          revision.data.delta = await this.decompressData(revision.data.delta, true);
        }
      }

      return revision;
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      this.monitoring.trackDependency(
        'cosmosdb.revision.getLatestRevision',
        'CosmosDB',
        config.cosmosDb.endpoint,
        duration,
        false
      );

      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
        operation: 'revision.repository.getLatestRevision',
        shardId,
        tenantId,
      });

      throw error;
    }
  }

  /**
   * List revisions with filtering and pagination
   */
  async list(options: RevisionListOptions): Promise<RevisionListResult> {
    const startTime = Date.now();

    try {
      const { filter, limit = 50, continuationToken, orderBy = 'revisionNumber', orderDirection = 'desc' } = options;

      // Build query
      let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
      const parameters: any[] = [
        { name: '@tenantId', value: filter.tenantId },
      ];

      if (filter.shardId) {
        query += ' AND c.shardId = @shardId';
        parameters.push({ name: '@shardId', value: filter.shardId });
      }

      if (filter.changeType) {
        query += ' AND c.changeType = @changeType';
        parameters.push({ name: '@changeType', value: filter.changeType });
      }

      if (filter.changedBy) {
        query += ' AND c.changedBy = @changedBy';
        parameters.push({ name: '@changedBy', value: filter.changedBy });
      }

      if (filter.timestampAfter) {
        query += ' AND c.timestamp >= @timestampAfter';
        parameters.push({ name: '@timestampAfter', value: filter.timestampAfter.toISOString() });
      }

      if (filter.timestampBefore) {
        query += ' AND c.timestamp <= @timestampBefore';
        parameters.push({ name: '@timestampBefore', value: filter.timestampBefore.toISOString() });
      }

      if (filter.revisionNumberMin !== undefined) {
        query += ' AND c.revisionNumber >= @revisionNumberMin';
        parameters.push({ name: '@revisionNumberMin', value: filter.revisionNumberMin });
      }

      if (filter.revisionNumberMax !== undefined) {
        query += ' AND c.revisionNumber <= @revisionNumberMax';
        parameters.push({ name: '@revisionNumberMax', value: filter.revisionNumberMax });
      }

      query += ` ORDER BY c.${orderBy} ${orderDirection.toUpperCase()}`;

      const querySpec = {
        query,
        parameters,
      };

      const { resources, continuationToken: newContinuationToken } = await this.container.items
        .query(querySpec, {
          maxItemCount: limit,
          continuationToken,
        })
        .fetchNext();

      // Decompress revisions if needed
      const revisions = await Promise.all(
        resources.map(async (revision: Revision) => {
          if (revision.data.compressed) {
            if (revision.data.snapshot) {
              revision.data.snapshot = await this.decompressData(revision.data.snapshot, true);
            }
            if (revision.data.delta) {
              revision.data.delta = await this.decompressData(revision.data.delta, true);
            }
          }
          return revision;
        })
      );

      const duration = Date.now() - startTime;
      this.monitoring.trackDependency(
        'cosmosdb.revision.list',
        'CosmosDB',
        config.cosmosDb.endpoint,
        duration,
        true
      );

      return {
        revisions,
        continuationToken: newContinuationToken,
        count: revisions.length,
      };
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      this.monitoring.trackDependency(
        'cosmosdb.revision.list',
        'CosmosDB',
        config.cosmosDb.endpoint,
        duration,
        false
      );

      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
        operation: 'revision.repository.list',
        tenantId: options.filter.tenantId,
      });

      throw error;
    }
  }

  /**
   * Compare two revisions
   */
  async compareRevisions(
    fromRevisionId: string,
    toRevisionId: string,
    tenantId: string
  ): Promise<RevisionComparison | null> {
    try {
      const [fromRevision, toRevision] = await Promise.all([
        this.findById(fromRevisionId, tenantId),
        this.findById(toRevisionId, tenantId),
      ]);

      if (!fromRevision || !toRevision) {
        return null;
      }

      // Simple field-level diff (can be enhanced with a proper diff library)
      const fromData = fromRevision.data.snapshot || fromRevision.data.delta;
      const toData = toRevision.data.snapshot || toRevision.data.delta;

      const changes: FieldDelta[] = this.computeDiff(fromData, toData);

      return {
        fromRevision,
        toRevision,
        changes,
        summary: `${changes.length} field(s) changed`,
      };
    } catch (error: unknown) {
      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
        operation: 'revision.repository.compareRevisions',
        fromRevisionId,
        toRevisionId,
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Simple diff algorithm
   * Can be replaced with a more sophisticated library like jsondiffpatch
   */
  private computeDiff(from: any, to: any, path: string = ''): FieldDelta[] {
    const changes: FieldDelta[] = [];

    const allKeys = new Set([...Object.keys(from || {}), ...Object.keys(to || {})]);

    for (const key of allKeys) {
      const fieldPath = path ? `${path}.${key}` : key;
      const oldValue = from?.[key];
      const newValue = to?.[key];

      if (oldValue === undefined && newValue !== undefined) {
        changes.push({ field: fieldPath, newValue, operation: 'add' });
      } else if (oldValue !== undefined && newValue === undefined) {
        changes.push({ field: fieldPath, oldValue, operation: 'remove' });
      } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        if (typeof oldValue === 'object' && typeof newValue === 'object' && !Array.isArray(oldValue)) {
          // Recursively diff nested objects
          changes.push(...this.computeDiff(oldValue, newValue, fieldPath));
        } else {
          changes.push({ field: fieldPath, oldValue, newValue, operation: 'replace' });
        }
      }
    }

    return changes;
  }

  /**
   * Get revision statistics for a shard
   */
  async getStats(shardId: string, tenantId: string): Promise<RevisionStats | null> {
    const startTime = Date.now();

    try {
      const querySpec = {
        query: `
          SELECT 
            c.shardId,
            c.tenantId,
            COUNT(1) AS totalRevisions,
            MIN(c.timestamp) AS firstRevisionDate,
            MAX(c.timestamp) AS lastRevisionDate,
            SUM(c.data.compressedSize) AS totalStorageSize,
            AVG(c.data.compressedSize) AS averageRevisionSize
          FROM c 
          WHERE c.tenantId = @tenantId AND c.shardId = @shardId
          GROUP BY c.shardId, c.tenantId
        `,
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@shardId', value: shardId },
        ],
      };

      const { resources } = await this.container.items.query(querySpec).fetchAll();

      if (resources.length === 0) {
        return null;
      }

      const stats = resources[0];

      // Get change type breakdown
      const changeTypeQuery = {
        query: 'SELECT c.changeType, COUNT(1) AS count FROM c WHERE c.tenantId = @tenantId AND c.shardId = @shardId GROUP BY c.changeType',
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@shardId', value: shardId },
        ],
      };

      const { resources: changeTypeResources } = await this.container.items.query(changeTypeQuery).fetchAll();

      const changeTypeBreakdown: Record<ChangeType, number> = {} as Record<ChangeType, number>;
      for (const item of changeTypeResources) {
        changeTypeBreakdown[item.changeType as ChangeType] = item.count;
      }

      const duration = Date.now() - startTime;
      this.monitoring.trackDependency(
        'cosmosdb.revision.getStats',
        'CosmosDB',
        config.cosmosDb.endpoint,
        duration,
        true
      );

      return {
        shardId: stats.shardId,
        tenantId: stats.tenantId,
        totalRevisions: stats.totalRevisions,
        firstRevisionDate: new Date(stats.firstRevisionDate),
        lastRevisionDate: new Date(stats.lastRevisionDate),
        totalStorageSize: stats.totalStorageSize || 0,
        averageRevisionSize: stats.averageRevisionSize || 0,
        changeTypeBreakdown,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitoring.trackDependency(
        'cosmosdb.revision.getStats',
        'CosmosDB',
        config.cosmosDb.endpoint,
        duration,
        false
      );

      this.monitoring.trackException(error as Error, {
        operation: 'revision.repository.getStats',
        shardId,
        tenantId,
      });

      throw error;
    }
  }

  /**
   * Delete old revisions based on retention policy
   * (Typically run as a scheduled job)
   */
  async cleanupOldRevisions(tenantId: string): Promise<number> {
    try {
      // Cosmos DB TTL handles automatic deletion
      // This method is for manual cleanup if needed
      this.monitoring.trackEvent('revision.cleanup.skipped', {
        tenantId,
        reason: 'TTL handles automatic deletion',
      });

      return 0; // TTL handles cleanup automatically
    } catch (error: unknown) {
      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
        operation: 'revision.repository.cleanupOldRevisions',
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
