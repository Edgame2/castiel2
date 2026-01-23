/**
 * Intent Pattern Repository
 * Manages intent classification patterns in Cosmos DB
 */

import { Container, CosmosClient, SqlQuerySpec } from '@azure/cosmos';
import { v4 as uuidv4 } from 'uuid';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type {
  IntentPattern,
  CreateIntentPatternInput,
  UpdateIntentPatternInput,
  ListIntentPatternsOptions,
} from '../types/intent-pattern.types.js';

export class IntentPatternRepository {
  private container: Container;

  constructor(
    client: CosmosClient,
    databaseId: string,
    containerId: string = 'intent-patterns'
  ) {
    this.container = client.database(databaseId).container(containerId);
  }

  /**
   * Ensure container exists
   */
  static async ensureContainer(
    client: CosmosClient,
    databaseId: string,
    containerId: string = 'intent-patterns'
  ): Promise<Container> {
    const database = client.database(databaseId);
    
    try {
      await database.containers.createIfNotExists({
        id: containerId,
        partitionKey: '/partitionKey',
        indexingPolicy: {
          automatic: true,
          indexingMode: 'consistent' as any,
          includedPaths: [{ path: '/*' }],
          excludedPaths: [{ path: '/_etag/?' }],
          compositeIndexes: [
            [
              { path: '/partitionKey', order: 'ascending' as any },
              { path: '/isActive', order: 'ascending' as any },
              { path: '/intentType', order: 'ascending' as any },
              { path: '/metrics.accuracyRate', order: 'descending' as any },
            ],
            [
              { path: '/partitionKey', order: 'ascending' as any },
              { path: '/priority', order: 'descending' as any },
            ],
          ],
        } as any,
        throughput: 400,
      });
    } catch (error) {
      // Container might already exist, ignore
    }

    return database.container(containerId);
  }

  /**
   * Create a new intent pattern
   */
  async create(input: CreateIntentPatternInput, createdBy: string): Promise<IntentPattern> {
    const now = new Date();
    const pattern: IntentPattern = {
      id: uuidv4(),
      name: input.name,
      description: input.description,
      intentType: input.intentType,
      subtype: input.subtype,
      patterns: input.patterns,
      keywords: input.keywords || [],
      phrases: input.phrases || [],
      priority: input.priority ?? 5,
      confidenceWeight: input.confidenceWeight ?? 1.0,
      requiresContext: input.requiresContext,
      excludePatterns: input.excludePatterns,
      metrics: {
        totalMatches: 0,
        accuracyRate: 0,
        avgConfidence: 0,
      },
      source: 'manual',
      createdBy,
      createdAt: now,
      updatedAt: now,
      version: 1,
      isActive: input.isActive ?? true,
      tenantId: 'SYSTEM',
      partitionKey: 'SYSTEM',
      type: 'intent-pattern',
    };

    const { resource } = await this.container.items.create(pattern);
    return resource as IntentPattern;
  }

  /**
   * Get pattern by ID
   */
  async findById(id: string): Promise<IntentPattern | null> {
    try {
      const { resource } = await this.container.item(id, 'SYSTEM').read<IntentPattern>();
      return resource || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * List patterns with filters
   */
  async list(options: ListIntentPatternsOptions = {}): Promise<{
    patterns: IntentPattern[];
    total: number;
  }> {
    const conditions: string[] = ['c.partitionKey = @partitionKey'];
    const parameters: Array<{ name: string; value: any }> = [
      { name: '@partitionKey', value: 'SYSTEM' },
    ];

    if (options.intentType) {
      conditions.push('c.intentType = @intentType');
      parameters.push({ name: '@intentType', value: options.intentType });
    }

    if (options.isActive !== undefined) {
      conditions.push('c.isActive = @isActive');
      parameters.push({ name: '@isActive', value: options.isActive });
    }

    if (options.minAccuracy !== undefined) {
      conditions.push('c.metrics.accuracyRate >= @minAccuracy');
      parameters.push({ name: '@minAccuracy', value: options.minAccuracy });
    }

    const whereClause = conditions.join(' AND ');

    // Determine sort order
    let orderBy = 'c.priority DESC, c.createdAt DESC';
    if (options.sortBy === 'accuracy') {
      orderBy = 'c.metrics.accuracyRate DESC';
    } else if (options.sortBy === 'coverage') {
      orderBy = 'c.metrics.totalMatches DESC';
    } else if (options.sortBy === 'createdAt') {
      orderBy = 'c.createdAt DESC';
    } else if (options.sortBy === 'priority') {
      orderBy = 'c.priority DESC';
    }

    const querySpec: SqlQuerySpec = {
      query: `SELECT * FROM c WHERE ${whereClause} ORDER BY ${orderBy}`,
      parameters,
    };

    const { resources } = await this.container.items.query(querySpec).fetchAll();
    const patterns = resources as IntentPattern[];

    // Get total count
    const countQuerySpec: SqlQuerySpec = {
      query: `SELECT VALUE COUNT(1) FROM c WHERE ${whereClause}`,
      parameters,
    };
    const { resources: countResources } = await this.container.items.query(countQuerySpec).fetchAll();
    const total = (countResources)[0] || 0;

    // Apply pagination
    const limit = options.limit || 100;
    const offset = options.offset || 0;
    const paginatedPatterns = patterns.slice(offset, offset + limit);

    return {
      patterns: paginatedPatterns,
      total,
    };
  }

  /**
   * Update pattern
   */
  async update(id: string, input: UpdateIntentPatternInput, updatedBy: string): Promise<IntentPattern> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Intent pattern ${id} not found`);
    }

    const updated: IntentPattern = {
      ...existing,
      ...input,
      updatedAt: new Date(),
      version: existing.version + 1,
    };

    const { resource } = await this.container.item(id, 'SYSTEM').replace(updated);
    return resource as IntentPattern;
  }

  /**
   * Delete pattern
   */
  async delete(id: string): Promise<void> {
    await this.container.item(id, 'SYSTEM').delete();
  }

  /**
   * Get active patterns for a specific intent type
   */
  async findActiveByIntentType(intentType: string): Promise<IntentPattern[]> {
    const querySpec: SqlQuerySpec = {
      query: `
        SELECT * FROM c 
        WHERE c.partitionKey = @partitionKey 
          AND c.intentType = @intentType 
          AND c.isActive = @isActive
        ORDER BY c.priority DESC
      `,
      parameters: [
        { name: '@partitionKey', value: 'SYSTEM' },
        { name: '@intentType', value: intentType },
        { name: '@isActive', value: true },
      ],
    };

    const { resources } = await this.container.items.query(querySpec).fetchAll();
    return resources as IntentPattern[];
  }

  /**
   * Update pattern metrics
   */
  async updateMetrics(
    id: string,
    metrics: Partial<IntentPattern['metrics']>
  ): Promise<IntentPattern> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Intent pattern ${id} not found`);
    }

    const updated: IntentPattern = {
      ...existing,
      metrics: {
        ...existing.metrics,
        ...metrics,
      },
      updatedAt: new Date(),
    };

    const { resource } = await this.container.item(id, 'SYSTEM').replace(updated);
    return resource as IntentPattern;
  }
}






