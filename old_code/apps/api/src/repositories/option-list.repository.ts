/**
 * Option List Repository
 * 
 * Cosmos DB operations for Option Lists.
 * Supports system-wide and tenant-specific option lists.
 */

import {
  CosmosClient,
  Container,
  ContainerDefinition,
} from '@azure/cosmos';
import { IMonitoringProvider } from '@castiel/monitoring';
import { config } from '../config/env.js';
import {
  OptionList,
  CreateOptionListInput,
  UpdateOptionListInput,
  OptionListListOptions,
  OptionListListResult,
  OptionListQueryFilter,
} from '../types/option-list.types.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Container configuration for Option Lists
 */
const OPTION_LIST_CONTAINER_CONFIG: ContainerDefinition = {
  id: 'optionLists',
  partitionKey: {
    paths: ['/tenantId'],
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
        { path: '/createdAt', order: 'descending' },
      ],
      [
        { path: '/isSystem', order: 'ascending' },
        { path: '/name', order: 'ascending' },
      ],
    ],
  },
};

/**
 * Option List Repository
 */
export class OptionListRepository {
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
    if (this.initialized) {return;}

    try {
      const database = this.client.database(config.cosmosDb.databaseId);
      
      // Create container if it doesn't exist
      const { container } = await database.containers.createIfNotExists(
        OPTION_LIST_CONTAINER_CONFIG
      );
      
      this.container = container;
      this.initialized = true;

      this.monitoring.trackEvent('option-list-repository-initialized');
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'initialize',
        repository: 'OptionListRepository',
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
   * Create an option list
   */
  async create(input: CreateOptionListInput): Promise<OptionList> {
    await this.ensureInitialized();

    const now = new Date();
    const optionList: OptionList = {
      id: uuidv4(),
      tenantId: input.tenantId,
      name: input.name,
      displayName: input.displayName,
      description: input.description,
      options: input.options,
      isSystem: input.isSystem || false,
      allowTenantOverride: input.allowTenantOverride ?? true,
      isActive: true,
      tags: input.tags || [],
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const { resource } = await this.container.items.create(optionList);

      this.monitoring.trackMetric('option-list-created', 1, {
        tenantId: input.tenantId,
        name: input.name,
        isSystem: input.isSystem,
      });

      return resource as OptionList;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'create',
        tenantId: input.tenantId,
        name: input.name,
      });
      throw error;
    }
  }

  /**
   * Get an option list by ID
   */
  async getById(id: string, tenantId: string): Promise<OptionList | null> {
    await this.ensureInitialized();

    try {
      const { resource } = await this.container
        .item(id, tenantId)
        .read<OptionList>();

      return resource || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      this.monitoring.trackException(error as Error, {
        operation: 'getById',
        id,
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Get an option list by name
   */
  async getByName(name: string, tenantId: string): Promise<OptionList | null> {
    await this.ensureInitialized();

    try {
      const query = {
        query: `
          SELECT * FROM c 
          WHERE c.tenantId = @tenantId 
          AND c.name = @name 
          AND c.isActive = true
        `,
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@name', value: name },
        ],
      };

      const { resources } = await this.container.items
        .query<OptionList>(query)
        .fetchAll();

      return resources[0] || null;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'getByName',
        name,
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Get a system option list by name
   */
  async getSystemByName(name: string): Promise<OptionList | null> {
    return this.getByName(name, 'system');
  }

  /**
   * Update an option list
   */
  async update(
    id: string,
    tenantId: string,
    input: UpdateOptionListInput
  ): Promise<OptionList | null> {
    await this.ensureInitialized();

    const existing = await this.getById(id, tenantId);
    if (!existing) {
      return null;
    }

    const updated: OptionList = {
      ...existing,
      ...input,
      updatedAt: new Date(),
    };

    try {
      const { resource } = await this.container
        .item(id, tenantId)
        .replace(updated);

      this.monitoring.trackMetric('option-list-updated', 1, {
        tenantId,
        id,
      });

      return resource as OptionList;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'update',
        id,
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Delete an option list (soft delete - sets isActive to false)
   */
  async delete(id: string, tenantId: string, deletedBy: string): Promise<boolean> {
    await this.ensureInitialized();

    const existing = await this.getById(id, tenantId);
    if (!existing) {
      return false;
    }

    // Don't allow deleting system lists
    if (existing.isSystem) {
      throw new Error('Cannot delete system option lists');
    }

    try {
      await this.container.item(id, tenantId).replace({
        ...existing,
        isActive: false,
        updatedAt: new Date(),
        updatedBy: deletedBy,
      });

      this.monitoring.trackMetric('option-list-deleted', 1, {
        tenantId,
        id,
      });

      return true;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'delete',
        id,
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Hard delete an option list (permanent)
   */
  async hardDelete(id: string, tenantId: string): Promise<boolean> {
    await this.ensureInitialized();

    try {
      await this.container.item(id, tenantId).delete();

      this.monitoring.trackMetric('option-list-hard-deleted', 1, {
        tenantId,
        id,
      });

      return true;
    } catch (error: any) {
      if (error.code === 404) {
        return false;
      }
      this.monitoring.trackException(error as Error, {
        operation: 'hardDelete',
        id,
        tenantId,
      });
      throw error;
    }
  }

  /**
   * List option lists
   */
  async list(options: OptionListListOptions): Promise<OptionListListResult> {
    await this.ensureInitialized();

    const filter = options.filter || {};
    const limit = options.limit || 50;
    let orderBy: 'createdAt' | 'updatedAt' | 'name' | 'displayName' = options.orderBy || 'name';
    const orderDirection = options.orderDirection || 'asc';
    
    // Validate orderBy field name to prevent SQL injection
    const sanitizedOrderBy = String(orderBy).trim();
    const validOrderByFields: Array<'createdAt' | 'updatedAt' | 'name' | 'displayName'> = ['createdAt', 'updatedAt', 'name', 'displayName'];
    if (!sanitizedOrderBy || !validOrderByFields.includes(sanitizedOrderBy as any)) {
      this.monitoring.trackException(new Error('Invalid orderBy field name'), {
        operation: 'option-list.repository.list',
        invalidField: sanitizedOrderBy,
      });
      orderBy = 'name'; // Fallback to safe default
    } else {
      orderBy = sanitizedOrderBy as 'createdAt' | 'updatedAt' | 'name' | 'displayName';
    }

    // Build query
    const conditions: string[] = [];
    const parameters: { name: string; value: any }[] = [];

    if (filter.tenantId) {
      conditions.push('c.tenantId = @tenantId');
      parameters.push({ name: '@tenantId', value: filter.tenantId });
    }

    if (filter.name) {
      conditions.push('c.name = @name');
      parameters.push({ name: '@name', value: filter.name });
    }

    if (filter.isSystem !== undefined) {
      conditions.push('c.isSystem = @isSystem');
      parameters.push({ name: '@isSystem', value: filter.isSystem });
    }

    if (filter.isActive !== undefined) {
      conditions.push('c.isActive = @isActive');
      parameters.push({ name: '@isActive', value: filter.isActive });
    } else {
      // Default to active only
      conditions.push('c.isActive = true');
    }

    if (filter.tags && filter.tags.length > 0) {
      conditions.push('ARRAY_CONTAINS(@tags, c.tags)');
      parameters.push({ name: '@tags', value: filter.tags });
    }

    if (filter.search) {
      conditions.push(
        '(CONTAINS(LOWER(c.name), LOWER(@search)) OR CONTAINS(LOWER(c.displayName), LOWER(@search)))'
      );
      parameters.push({ name: '@search', value: filter.search });
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';

    const query = {
      query: `
        SELECT * FROM c 
        ${whereClause}
        ORDER BY c.${orderBy} ${orderDirection.toUpperCase()}
        OFFSET 0 LIMIT @limit
      `,
      parameters: [...parameters, { name: '@limit', value: limit }],
    };

    try {
      const queryIterator = this.container.items.query<OptionList>(query, {
        maxItemCount: limit,
        continuationToken: options.continuationToken,
      });

      const { resources, continuationToken } = await queryIterator.fetchNext();

      return {
        optionLists: resources || [],
        continuationToken,
        count: resources?.length || 0,
      };
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'list',
        filter: JSON.stringify(filter),
      });
      throw error;
    }
  }

  /**
   * Get all system option lists
   */
  async getSystemLists(): Promise<OptionList[]> {
    const result = await this.list({
      filter: {
        tenantId: 'system',
        isSystem: true,
        isActive: true,
      },
      limit: 1000,
    });
    return result.optionLists;
  }

  /**
   * Get all tenant option lists (including overrides of system lists)
   */
  async getTenantLists(tenantId: string): Promise<OptionList[]> {
    const result = await this.list({
      filter: {
        tenantId,
        isActive: true,
      },
      limit: 1000,
    });
    return result.optionLists;
  }

  /**
   * Check if a name is unique within the tenant
   */
  async isNameUnique(name: string, tenantId: string, excludeId?: string): Promise<boolean> {
    await this.ensureInitialized();

    const query = {
      query: `
        SELECT c.id FROM c 
        WHERE c.tenantId = @tenantId 
        AND c.name = @name 
        ${excludeId ? 'AND c.id != @excludeId' : ''}
      `,
      parameters: [
        { name: '@tenantId', value: tenantId },
        { name: '@name', value: name },
        ...(excludeId ? [{ name: '@excludeId', value: excludeId }] : []),
      ],
    };

    const { resources } = await this.container.items
      .query(query)
      .fetchAll();

    return resources.length === 0;
  }
}

