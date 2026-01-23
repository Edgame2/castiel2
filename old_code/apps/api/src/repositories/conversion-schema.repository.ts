import { Container, CosmosClient, SqlQuerySpec } from '@azure/cosmos';
import { v4 as uuidv4 } from 'uuid';
import {
  ConversionSchema,
  CreateConversionSchemaInput,
  UpdateConversionSchemaInput,
  ConversionSchemaListOptions,
  ConversionSchemaListResult,
} from '../types/conversion-schema.types.js';

/**
 * Conversion Schema Repository
 * Manages data mapping schemas for integrations
 */
export class ConversionSchemaRepository {
  private container: Container;

  constructor(client: CosmosClient, databaseId: string, containerId: string) {
    this.container = client.database(databaseId).container(containerId);
  }

  /**
   * Ensure container exists
   */
  static async ensureContainer(
    client: CosmosClient,
    databaseId: string,
    containerId: string
  ): Promise<Container> {
    const database = client.database(databaseId);
    const { container } = await database.containers.createIfNotExists({
      id: containerId,
      partitionKey: { paths: ['/tenantId'] },
      indexingPolicy: {
        automatic: true,
        indexingMode: 'consistent',
        includedPaths: [{ path: '/*' }],
        excludedPaths: [{ path: '/"_etag"/?' }],
        compositeIndexes: [
          [
            { path: '/tenantId', order: 'ascending' },
            { path: '/tenantIntegrationId', order: 'ascending' },
          ],
        ],
      },
    });
    return container;
  }

  /**
   * Create conversion schema
   */
  async create(input: CreateConversionSchemaInput): Promise<ConversionSchema> {
    const now = new Date();
    const schema: ConversionSchema = {
      id: uuidv4(),
      tenantIntegrationId: input.tenantIntegrationId,
      tenantId: input.tenantId,
      name: input.name,
      description: input.description,
      source: input.source,
      target: input.target,
      fieldMappings: input.fieldMappings.map(m => ({
        ...m,
        id: uuidv4(),
      })),
      relationshipMappings: input.relationshipMappings,
      preserveRelationships: input.preserveRelationships ?? false,
      deduplication: input.deduplication,
      isActive: input.isActive ?? true,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    const { resource } = await this.container.items.create(schema);
    return resource as ConversionSchema;
  }

  /**
   * Update conversion schema
   */
  async update(
    id: string,
    tenantId: string,
    input: UpdateConversionSchemaInput
  ): Promise<ConversionSchema | null> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {return null;}

    const updated: ConversionSchema = {
      ...existing,
      ...input,
      fieldMappings: input.fieldMappings
        ? input.fieldMappings.map(m => ({
            ...m,
            id: uuidv4(),
          }))
        : existing.fieldMappings,
      updatedAt: new Date(),
    };

    const { resource } = await this.container
      .item(id, tenantId)
      .replace(updated);
    return resource as ConversionSchema;
  }

  /**
   * Delete conversion schema
   */
  async delete(id: string, tenantId: string): Promise<boolean> {
    try {
      await this.container.item(id, tenantId).delete();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Find by ID
   */
  async findById(id: string, tenantId: string): Promise<ConversionSchema | null> {
    try {
      const { resource } = await this.container.item(id, tenantId).read<ConversionSchema>();
      return resource || null;
    } catch {
      return null;
    }
  }

  /**
   * Find by name for tenant integration
   */
  async findByName(
    name: string,
    tenantIntegrationId: string,
    tenantId: string
  ): Promise<ConversionSchema | null> {
    const query: SqlQuerySpec = {
      query: `SELECT * FROM c WHERE c.tenantId = @tenantId 
              AND c.tenantIntegrationId = @tenantIntegrationId 
              AND c.name = @name`,
      parameters: [
        { name: '@tenantId', value: tenantId },
        { name: '@tenantIntegrationId', value: tenantIntegrationId },
        { name: '@name', value: name },
      ],
    };

    const { resources } = await this.container.items.query<ConversionSchema>(query).fetchAll();
    return resources[0] || null;
  }

  /**
   * List conversion schemas
   */
  async list(options: ConversionSchemaListOptions): Promise<ConversionSchemaListResult> {
    const { filter, limit = 50, offset = 0 } = options;

    const conditions: string[] = ['c.tenantId = @tenantId'];
    const parameters: { name: string; value: any }[] = [
      { name: '@tenantId', value: filter.tenantId },
    ];

    if (filter.tenantIntegrationId) {
      conditions.push('c.tenantIntegrationId = @tenantIntegrationId');
      parameters.push({ name: '@tenantIntegrationId', value: filter.tenantIntegrationId });
    }

    if (filter.isActive !== undefined) {
      conditions.push('c.isActive = @isActive');
      parameters.push({ name: '@isActive', value: filter.isActive });
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Count query
    const countQuery: SqlQuerySpec = {
      query: `SELECT VALUE COUNT(1) FROM c ${whereClause}`,
      parameters,
    };
    const { resources: countResult } = await this.container.items.query<number>(countQuery).fetchAll();
    const total = countResult[0] || 0;

    // Data query
    const dataQuery: SqlQuerySpec = {
      query: `SELECT * FROM c ${whereClause} ORDER BY c.name OFFSET ${offset} LIMIT ${limit}`,
      parameters,
    };
    const { resources } = await this.container.items.query<ConversionSchema>(dataQuery).fetchAll();

    return {
      schemas: resources,
      total,
      hasMore: offset + resources.length < total,
    };
  }

  /**
   * Find active schemas for tenant integration
   */
  async findActiveByTenantIntegration(
    tenantIntegrationId: string,
    tenantId: string
  ): Promise<ConversionSchema[]> {
    const query: SqlQuerySpec = {
      query: `SELECT * FROM c WHERE c.tenantId = @tenantId 
              AND c.tenantIntegrationId = @tenantIntegrationId 
              AND c.isActive = true`,
      parameters: [
        { name: '@tenantId', value: tenantId },
        { name: '@tenantIntegrationId', value: tenantIntegrationId },
      ],
    };

    const { resources } = await this.container.items.query<ConversionSchema>(query).fetchAll();
    return resources;
  }
}











