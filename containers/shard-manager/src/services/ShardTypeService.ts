/**
 * ShardType Service
 * Handles shard type (schema) management
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import {
  ShardType,
  CreateShardTypeInput,
  UpdateShardTypeInput,
} from '../types/shard.types';

export class ShardTypeService {
  private containerName = 'shard_types';

  /**
   * Create a new shard type
   */
  async create(input: CreateShardTypeInput): Promise<ShardType> {
    if (!input.tenantId) {
      throw new BadRequestError('tenantId is required');
    }
    if (!input.name) {
      throw new BadRequestError('name is required');
    }
    if (!input.schema) {
      throw new BadRequestError('schema is required');
    }

    // Optional: validate schema is valid JSON Schema (e.g. ajv) when strict validation is added.

    const shardType: ShardType = {
      id: uuidv4(),
      tenantId: input.tenantId,
      name: input.name,
      description: input.description,
      schema: input.schema,
      displayConfig: input.displayConfig,
      isSystem: input.isSystem || false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: input.createdBy,
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await (container.items as any).create(shardType, {
        partitionKey: input.tenantId,
      } as any);

      if (!resource) {
        throw new Error('Failed to create shard type');
      }

      return resource as ShardType;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Shard type with this name already exists');
      }
      throw error;
    }
  }

  /**
   * Get shard type by ID
   */
  async getById(shardTypeId: string, tenantId: string): Promise<ShardType> {
    if (!shardTypeId || !tenantId) {
      throw new BadRequestError('shardTypeId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(shardTypeId, tenantId).read<ShardType>();

      if (!resource) {
        throw new NotFoundError('Shard type', shardTypeId);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError('Shard type', shardTypeId);
      }
      throw error;
    }
  }

  /**
   * Get shard type by name
   */
  async getByName(name: string, tenantId: string): Promise<ShardType | null> {
    if (!name || !tenantId) {
      throw new BadRequestError('name and tenantId are required');
    }

    const container = getContainer(this.containerName);
    const { resources } = await container.items
      .query<ShardType>({
        query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.name = @name',
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@name', value: name },
        ],
      })
      .fetchAll();

    return resources.length > 0 ? resources[0] : null;
  }

  /**
   * Update shard type
   */
  async update(
    shardTypeId: string,
    tenantId: string,
    input: UpdateShardTypeInput
  ): Promise<ShardType> {
    const existing = await this.getById(shardTypeId, tenantId);

    if (!existing.isActive && input.isActive === false) {
      // Already inactive
      return existing;
    }

    const updated: ShardType = {
      ...existing,
      ...input,
      updatedAt: new Date(),
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(shardTypeId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update shard type');
      }

      return resource as ShardType;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError('Shard type', shardTypeId);
      }
      throw error;
    }
  }

  /**
   * List shard types
   */
  async list(
    tenantId: string,
    filters?: {
      isActive?: boolean;
      isSystem?: boolean;
      limit?: number;
    }
  ): Promise<ShardType[]> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.containerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    if (filters?.isActive !== undefined) {
      query += ' AND c.isActive = @isActive';
      parameters.push({ name: '@isActive', value: filters.isActive });
    }

    if (filters?.isSystem !== undefined) {
      query += ' AND c.isSystem = @isSystem';
      parameters.push({ name: '@isSystem', value: filters.isSystem });
    }

    query += ' ORDER BY c.name ASC';

    const limit = filters?.limit || 100;

    try {
      const { resources } = await container.items
        .query<ShardType>({
          query,
          parameters,
        })
        .fetchNext();

      return resources.slice(0, limit);
    } catch (error: any) {
      throw new Error(`Failed to list shard types: ${error.message}`);
    }
  }

  /**
   * Delete shard type (deactivate)
   */
  async delete(shardTypeId: string, tenantId: string): Promise<void> {
    const existing = await this.getById(shardTypeId, tenantId);

    if (existing.isSystem) {
      throw new BadRequestError('Cannot delete system shard type');
    }

    // Deactivate instead of deleting
    await this.update(shardTypeId, tenantId, {
      isActive: false,
    });
  }

  /**
   * Validate test data against shard type schema
   */
  async validateTestData(
    shardTypeId: string,
    tenantId: string,
    testData: any
  ): Promise<{
    valid: boolean;
    errors: Array<{ path: string; message: string }>;
    warnings: Array<{ path: string; message: string }>;
  }> {
    const shardType = await this.getById(shardTypeId, tenantId);
    const errors: Array<{ path: string; message: string }> = [];
    const warnings: Array<{ path: string; message: string }> = [];

    // Basic validation: check if schema exists
    if (!shardType.schema || typeof shardType.schema !== 'object') {
      errors.push({
        path: 'schema',
        message: 'Shard type schema is invalid or missing',
      });
      return { valid: false, errors, warnings };
    }

    // Simple validation: check required fields if schema has them
    if (shardType.schema.required && Array.isArray(shardType.schema.required)) {
      for (const requiredField of shardType.schema.required) {
        if (!(requiredField in testData)) {
          errors.push({
            path: requiredField,
            message: `Required field '${requiredField}' is missing`,
          });
        }
      }
    }

    // Type validation for known fields
    if (shardType.schema.properties && typeof shardType.schema.properties === 'object') {
      for (const [fieldName, fieldSchema] of Object.entries(shardType.schema.properties as any)) {
        if (testData[fieldName] !== undefined) {
          const fieldValue = testData[fieldName];
          const fieldDef = fieldSchema as any;

          // Type checking
          if (fieldDef.type) {
            const expectedType = fieldDef.type;
            const actualType = Array.isArray(fieldValue) ? 'array' : typeof fieldValue;

            if (expectedType === 'string' && actualType !== 'string') {
              errors.push({
                path: fieldName,
                message: `Field '${fieldName}' must be a string, got ${actualType}`,
              });
            } else if (expectedType === 'number' && actualType !== 'number') {
              errors.push({
                path: fieldName,
                message: `Field '${fieldName}' must be a number, got ${actualType}`,
              });
            } else if (expectedType === 'boolean' && actualType !== 'boolean') {
              errors.push({
                path: fieldName,
                message: `Field '${fieldName}' must be a boolean, got ${actualType}`,
              });
            } else if (expectedType === 'array' && actualType !== 'array') {
              errors.push({
                path: fieldName,
                message: `Field '${fieldName}' must be an array, got ${actualType}`,
              });
            } else if (expectedType === 'object' && (actualType !== 'object' || Array.isArray(fieldValue))) {
              errors.push({
                path: fieldName,
                message: `Field '${fieldName}' must be an object, got ${actualType}`,
              });
            }
          }

          // Additional validations
          if (fieldDef.type === 'string' && fieldDef.minLength && fieldValue.length < fieldDef.minLength) {
            warnings.push({
              path: fieldName,
              message: `Field '${fieldName}' is shorter than minimum length (${fieldDef.minLength})`,
            });
          }

          if (fieldDef.type === 'number' && fieldDef.minimum !== undefined && fieldValue < fieldDef.minimum) {
            warnings.push({
              path: fieldName,
              message: `Field '${fieldName}' is less than minimum value (${fieldDef.minimum})`,
            });
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get shard type usage statistics
   */
  async getStatistics(
    shardTypeId: string,
    tenantId: string
  ): Promise<{
    shardCount: number;
    tenantsUsing: number;
    lastCreated: Date | null;
    avgShardSize: number;
  }> {
    const shardType = await this.getById(shardTypeId, tenantId);
    const shardContainer = getContainer('shard_shards');

    // Count shards of this type for the tenant
    const tenantShardsQuery = `
      SELECT COUNT(1) as count, MAX(c.createdAt) as lastCreated
      FROM c
      WHERE c.tenantId = @tenantId AND c.shardTypeId = @shardTypeId
    `;

    const tenantResult = await shardContainer.items
      .query<{ count: number; lastCreated: string | null }>({
        query: tenantShardsQuery,
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@shardTypeId', value: shardTypeId },
        ],
      })
      .fetchAll();

    const shardCount = tenantResult.resources[0]?.count || 0;
    const lastCreated = tenantResult.resources[0]?.lastCreated
      ? new Date(tenantResult.resources[0].lastCreated)
      : null;

    // Count distinct tenants using this shard type (across all tenants)
    // Note: This is a simplified approach - in production, you might want to cache this
    const allTenantsQuery = `
      SELECT DISTINCT c.tenantId
      FROM c
      WHERE c.shardTypeId = @shardTypeId
    `;

    const allTenantsResult = await shardContainer.items
      .query<{ tenantId: string }>({
        query: allTenantsQuery,
        parameters: [{ name: '@shardTypeId', value: shardTypeId }],
      })
      .fetchAll();

    const tenantsUsing = new Set(allTenantsResult.resources.map((r) => r.tenantId)).size;

    // Calculate average shard size (approximate - using JSON string length)
    const sizeQuery = `
      SELECT c.id, c.structuredData, c.unstructuredData
      FROM c
      WHERE c.tenantId = @tenantId AND c.shardTypeId = @shardTypeId
    `;

    const sizeResult = await shardContainer.items
      .query<{ structuredData?: any; unstructuredData?: any }>({
        query: sizeQuery,
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@shardTypeId', value: shardTypeId },
        ],
      })
      .fetchNext();

    let totalSize = 0;
    let sizeCount = 0;

    for (const shard of sizeResult.resources) {
      const shardSize =
        JSON.stringify(shard.structuredData || {}).length +
        JSON.stringify(shard.unstructuredData || {}).length;
      totalSize += shardSize;
      sizeCount++;
    }

    const avgShardSize = sizeCount > 0 ? totalSize / sizeCount : 0;

    return {
      shardCount,
      tenantsUsing,
      lastCreated,
      avgShardSize: Math.round(avgShardSize),
    };
  }
}

