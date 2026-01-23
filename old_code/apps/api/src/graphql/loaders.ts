/**
 * GraphQL DataLoaders
 * 
 * Implements DataLoader pattern for batching and caching GraphQL queries
 * Eliminates N+1 query problems by batching database requests
 */

import DataLoader from 'dataloader';
import type { ShardRepository } from '@castiel/api-core';
import type { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import type { RevisionRepository } from '../repositories/revision.repository.js';
import type { ACLService } from '../services/acl.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type {
  Shard,
  PermissionLevel,
} from '../types/shard.types.js';
import type { ShardType } from '../types/shard-type.types.js';
import type { Revision } from '../types/revision.types.js';
import type {
  ShardLoaderKey,
  ShardTypeLoaderKey,
  RevisionLoaderKey,
  ACLLoaderKey,
  ShardsByTypeKey,
} from './types.js';
import { ShardStatus } from '../types/shard.types.js';

export interface GraphQLLoaders {
  shardLoader: DataLoader<ShardLoaderKey, Shard | null>;
  shardTypeLoader: DataLoader<ShardTypeLoaderKey, ShardType | null>;
  revisionLoader: DataLoader<RevisionLoaderKey, Revision | null>;
  aclLoader: DataLoader<ACLLoaderKey, PermissionLevel[]>;
  shardsByTypeLoader: DataLoader<ShardsByTypeKey, Shard[]>;
}

export interface LoaderDependencies {
  shardRepository: ShardRepository;
  shardTypeRepository: ShardTypeRepository;
  revisionRepository: RevisionRepository;
  aclService: ACLService;
  monitoring: IMonitoringProvider;
}

/**
 * Create all GraphQL DataLoaders
 */
export function createGraphQLLoaders(deps: LoaderDependencies): GraphQLLoaders {
  const {
    shardRepository,
    shardTypeRepository,
    revisionRepository,
    aclService,
    monitoring,
  } = deps;

  /**
   * Shard Loader
   * Batches shard lookups by ID
   */
  const shardLoader = new DataLoader<ShardLoaderKey, Shard | null>(
    async (keys: readonly ShardLoaderKey[]) => {
      const startTime = Date.now();
      
      try {
        // Group keys by tenantId for efficient batching
        const byTenant = new Map<string, string[]>();
        for (const key of keys) {
          if (!byTenant.has(key.tenantId)) {
            byTenant.set(key.tenantId, []);
          }
          byTenant.get(key.tenantId)!.push(key.shardId);
        }

        // Fetch all shards in parallel by tenant
        const fetchPromises = Array.from(byTenant.entries()).map(async ([tenantId, shardIds]) => {
          const results = await shardRepository.findByIds(shardIds, tenantId);
          return { tenantId, results };
        });

        const tenantResults = await Promise.all(fetchPromises);

        // Create a map of results for quick lookup
        const resultMap = new Map<string, Shard | null>();
        for (const { tenantId, results } of tenantResults) {
          const shardIds = byTenant.get(tenantId)!;
          shardIds.forEach((shardId, index) => {
            const key = `${tenantId}:${shardId}`;
            resultMap.set(key, results[index] || null);
          });
        }

        // Return results in the same order as keys
        const results = keys.map(key => {
          const mapKey = `${key.tenantId}:${key.shardId}`;
          return resultMap.get(mapKey) || null;
        });

        const duration = Date.now() - startTime;
        monitoring.trackMetric('graphql.loader.shard.batch', keys.length, {
          duration,
          tenantCount: byTenant.size,
        });

        return results;
      } catch (error) {
        monitoring.trackException(error as Error, {
          operation: 'graphql.loader.shard.batch',
          keyCount: keys.length,
        });
        // Return errors for all keys
        return keys.map(() => null);
      }
    },
    {
      // Cache results for the duration of the request
      cache: true,
      // Batch size limit
      maxBatchSize: 100,
    }
  );

  /**
   * ShardType Loader
   * Batches shard type lookups by ID
   */
  const shardTypeLoader = new DataLoader<ShardTypeLoaderKey, ShardType | null>(
    async (keys: readonly ShardTypeLoaderKey[]) => {
      const startTime = Date.now();
      
      try {
        // Fetch all shard types in parallel
        // Note: ShardTypeRepository doesn't have batch method, so we use Promise.all
        const results = await Promise.all(
          keys.map(key => shardTypeRepository.findById(key.shardTypeId, key.tenantId))
        );

        const duration = Date.now() - startTime;
        monitoring.trackMetric('graphql.loader.shardType.batch', keys.length, {
          duration,
        });

        return results;
      } catch (error) {
        monitoring.trackException(error as Error, {
          operation: 'graphql.loader.shardType.batch',
          keyCount: keys.length,
        });
        // Return nulls for all keys on error
        return keys.map(() => null);
      }
    },
    {
      cache: true,
      maxBatchSize: 100,
    }
  );

  /**
   * Revision Loader
   * Batches revision lookups by ID
   */
  const revisionLoader = new DataLoader<RevisionLoaderKey, Revision | null>(
    async (keys: readonly RevisionLoaderKey[]) => {
      const startTime = Date.now();
      
      try {
        // Fetch all revisions in parallel
        // Note: RevisionRepository doesn't have batch method, so we use Promise.all
        const results = await Promise.all(
          keys.map(key => revisionRepository.findById(key.revisionId, key.tenantId))
        );

        const duration = Date.now() - startTime;
        monitoring.trackMetric('graphql.loader.revision.batch', keys.length, {
          duration,
        });

        return results;
      } catch (error) {
        monitoring.trackException(error as Error, {
          operation: 'graphql.loader.revision.batch',
          keyCount: keys.length,
        });
        // Return nulls for all keys on error
        return keys.map(() => null);
      }
    },
    {
      cache: true,
      maxBatchSize: 100,
    }
  );

  /**
   * ACL Loader
   * Batches ACL permission lookups
   */
  const aclLoader = new DataLoader<ACLLoaderKey, PermissionLevel[]>(
    async (keys: readonly ACLLoaderKey[]) => {
      const startTime = Date.now();
      
      try {
        // Group keys by tenantId and userId for efficient batching
        const byTenantUser = new Map<string, { userId: string; shardIds: string[] }>();
        for (const key of keys) {
          const mapKey = `${key.tenantId}:${key.userId}`;
          if (!byTenantUser.has(mapKey)) {
            byTenantUser.set(mapKey, { userId: key.userId, shardIds: [] });
          }
          byTenantUser.get(mapKey)!.shardIds.push(key.shardId);
        }

        // Fetch all permissions in parallel
        const fetchPromises = Array.from(byTenantUser.entries()).map(async ([mapKey, { userId, shardIds }]) => {
          const [tenantId] = mapKey.split(':');
          const batchResult = await aclService.batchCheckPermissions({
            userId,
            tenantId,
            shardIds,
            requiredPermission: PermissionLevel.READ, // Default to READ for GraphQL queries
          });
          return { mapKey, batchResult };
        });

        const batchResults = await Promise.all(fetchPromises);

        // Create a map of results for quick lookup
        const resultMap = new Map<string, PermissionLevel[]>();
        for (const { mapKey, batchResult } of batchResults) {
          for (const [shardId, checkResult] of batchResult.results) {
            const key = `${mapKey}:${shardId}`;
            resultMap.set(key, checkResult.grantedPermissions || []);
          }
        }

        // Return results in the same order as keys
        const results = keys.map(key => {
          const mapKey = `${key.tenantId}:${key.userId}:${key.shardId}`;
          return resultMap.get(mapKey) || [];
        });

        const duration = Date.now() - startTime;
        monitoring.trackMetric('graphql.loader.acl.batch', keys.length, {
          duration,
          tenantUserCount: byTenantUser.size,
        });

        return results;
      } catch (error) {
        monitoring.trackException(error as Error, {
          operation: 'graphql.loader.acl.batch',
          keyCount: keys.length,
        });
        // Return empty arrays for all keys on error
        return keys.map(() => []);
      }
    },
    {
      cache: true,
      maxBatchSize: 100,
    }
  );

  /**
   * Shards By Type Loader
   * Batches shard lookups by shard type
   */
  const shardsByTypeLoader = new DataLoader<ShardsByTypeKey, Shard[]>(
    async (keys: readonly ShardsByTypeKey[]) => {
      const startTime = Date.now();
      
      try {
        // Fetch all shard lists in parallel
        const results = await Promise.all(
          keys.map(async key => {
            try {
              const shards = await shardRepository.findByShardType(
                key.shardTypeId,
                key.tenantId,
                {
                  limit: 100, // Limit for GraphQL queries
                  statusFilter: key.status ? [key.status] : undefined,
                }
              );
              return shards;
            } catch (error) {
              monitoring.trackException(error as Error, {
                operation: 'graphql.loader.shardsByType.fetch',
                shardTypeId: key.shardTypeId,
                tenantId: key.tenantId,
              });
              return [];
            }
          })
        );

        const duration = Date.now() - startTime;
        monitoring.trackMetric('graphql.loader.shardsByType.batch', keys.length, {
          duration,
        });

        return results;
      } catch (error) {
        monitoring.trackException(error as Error, {
          operation: 'graphql.loader.shardsByType.batch',
          keyCount: keys.length,
        });
        // Return empty arrays for all keys on error
        return keys.map(() => []);
      }
    },
    {
      cache: true,
      maxBatchSize: 50, // Smaller batch size for list queries
    }
  );

  return {
    shardLoader,
    shardTypeLoader,
    revisionLoader,
    aclLoader,
    shardsByTypeLoader,
  };
}
