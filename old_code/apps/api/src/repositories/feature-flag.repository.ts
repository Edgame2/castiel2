/**
 * Feature Flag Repository
 * 
 * Cosmos DB operations for Feature Flags.
 * Supports global and tenant-specific feature flags.
 */

import {
  CosmosClient,
  Container,
  ContainerDefinition,
} from '@azure/cosmos';
import { IMonitoringProvider } from '@castiel/monitoring';
import { config } from '../config/env.js';
import {
  FeatureFlag,
  CreateFeatureFlagInput,
  UpdateFeatureFlagInput,
} from '../types/feature-flag.types.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Container configuration for Feature Flags
 */
const FEATURE_FLAG_CONTAINER_CONFIG: ContainerDefinition = {
  id: config.cosmosDb.containers.featureFlags,
  partitionKey: {
    paths: ['/tenantId'], // Use tenantId as partition key ('global' for global flags)
  },
  indexingPolicy: {
    automatic: true,
    indexingMode: 'consistent',
    includedPaths: [{ path: '/*' }],
    excludedPaths: [{ path: '/_etag/?' }],
    compositeIndexes: [
      [
        { path: '/tenantId', order: 'ascending' },
        { path: '/name', order: 'ascending' },
      ],
      [
        { path: '/tenantId', order: 'ascending' },
        { path: '/enabled', order: 'ascending' },
      ],
      [
        { path: '/name', order: 'ascending' },
        { path: '/enabled', order: 'ascending' },
      ],
    ],
  },
};

/**
 * Feature Flag Repository
 */
export class FeatureFlagRepository {
  private client: CosmosClient;
  private container!: Container;
  private monitoring: IMonitoringProvider;
  private initialized = false;

  constructor(monitoring: IMonitoringProvider) {
    this.monitoring = monitoring;
    this.client = new CosmosClient({
      endpoint: config.cosmosDb.endpoint,
      key: config.cosmosDb.key,
    });
  }

  /**
   * Initialize the container
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const database = this.client.database(config.cosmosDb.databaseId);
      
      // Create container if it doesn't exist
      const { container } = await database.containers.createIfNotExists(
        FEATURE_FLAG_CONTAINER_CONFIG
      );
      
      this.container = container;
      this.initialized = true;

      this.monitoring.trackEvent('feature-flag-repository-initialized');
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'initialize',
        repository: 'FeatureFlagRepository',
      });
      throw error;
    }
  }

  /**
   * Ensure container is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Create a feature flag
   */
  async create(input: CreateFeatureFlagInput, userId: string): Promise<FeatureFlag> {
    await this.ensureInitialized();

    const now = new Date();
    const featureFlag: FeatureFlag = {
      id: uuidv4(),
      name: input.name,
      description: input.description,
      enabled: input.enabled,
      environments: input.environments,
      roles: input.roles,
      percentage: input.percentage,
      tenantId: input.tenantId || 'global', // 'global' for global flags
      createdAt: now,
      updatedAt: now,
      updatedBy: userId,
    };

    try {
      const { resource } = await this.container.items.create(featureFlag);

      this.monitoring.trackMetric('feature-flag-created', 1, {
        name: input.name,
        tenantId: input.tenantId || 'global',
        enabled: input.enabled,
      });

      return resource as FeatureFlag;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'create',
        name: input.name,
        tenantId: input.tenantId,
      });
      throw error;
    }
  }

  /**
   * Get a feature flag by name
   */
  async getByName(name: string, tenantId?: string | null): Promise<FeatureFlag | null> {
    await this.ensureInitialized();

    try {
      const partitionKey = tenantId ?? 'global';
      const query = {
        query: `
          SELECT * FROM c 
          WHERE c.name = @name 
          AND (c.tenantId = @tenantId OR c.tenantId = 'global')
          ORDER BY c.tenantId DESC
        `,
        parameters: [
          { name: '@name', value: name },
          { name: '@tenantId', value: partitionKey },
        ],
      };

      const { resources } = await this.container.items
        .query<FeatureFlag>(query)
        .fetchAll();

      // Return tenant-specific override if exists, otherwise global
      return resources[0] || null;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'getByName',
        name,
        tenantId: tenantId ?? 'global',
      });
      throw error;
    }
  }

  /**
   * Get a feature flag by ID
   */
  async getById(id: string, tenantId: string | null): Promise<FeatureFlag | null> {
    await this.ensureInitialized();

    try {
      const partitionKey = tenantId ?? 'global';
      const { resource } = await this.container
        .item(id, partitionKey)
        .read<FeatureFlag>();

      return resource || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      this.monitoring.trackException(error as Error, {
        operation: 'getById',
        id,
        tenantId: tenantId ?? 'global',
      });
      throw error;
    }
  }

  /**
   * List all feature flags (global and tenant-specific)
   */
  async list(tenantId?: string | null): Promise<FeatureFlag[]> {
    await this.ensureInitialized();

    try {
      const partitionKey = tenantId ?? 'global';
      const query = {
        query: `
          SELECT * FROM c 
          WHERE (c.tenantId = @tenantId OR c.tenantId = 'global')
          ORDER BY c.name ASC
        `,
        parameters: [
          { name: '@tenantId', value: partitionKey },
        ],
      };

      const { resources } = await this.container.items
        .query<FeatureFlag>(query)
        .fetchAll();

      return resources;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'list',
        tenantId: tenantId ?? 'global',
      });
      throw error;
    }
  }

  /**
   * Update a feature flag
   */
  async update(
    id: string,
    tenantId: string | null,
    input: UpdateFeatureFlagInput,
    userId: string
  ): Promise<FeatureFlag | null> {
    await this.ensureInitialized();

    try {
      const partitionKey = tenantId ?? 'global';
      const { resource: existing } = await this.container
        .item(id, partitionKey)
        .read<FeatureFlag>();

      if (!existing) {
        return null;
      }

      const updated: FeatureFlag = {
        ...existing,
        ...input,
        updatedAt: new Date(),
        updatedBy: userId,
      };

      const { resource } = await this.container
        .item(id, partitionKey)
        .replace(updated);

      this.monitoring.trackMetric('feature-flag-updated', 1, {
        id,
        tenantId: tenantId || 'global',
      });

      return resource as FeatureFlag;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      this.monitoring.trackException(error as Error, {
        operation: 'update',
        id,
        tenantId: tenantId ?? 'global',
      });
      throw error;
    }
  }

  /**
   * Delete a feature flag
   */
  async delete(id: string, tenantId: string | null): Promise<boolean> {
    await this.ensureInitialized();

    try {
      const partitionKey = tenantId ?? 'global';
      await this.container.item(id, partitionKey).delete();

      this.monitoring.trackMetric('feature-flag-deleted', 1, {
        id,
        tenantId: tenantId || 'global',
      });

      return true;
    } catch (error: any) {
      if (error.code === 404) {
        return false;
      }
      this.monitoring.trackException(error as Error, {
        operation: 'delete',
        id,
        tenantId: tenantId ?? 'global',
      });
      throw error;
    }
  }
}

