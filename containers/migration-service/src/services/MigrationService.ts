/**
 * Migration Service
 * Handles migration CRUD operations
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import {
  Migration,
  CreateMigrationInput,
  UpdateMigrationInput,
  MigrationType,
  MigrationStatus,
} from '../types/migration.types';

export class MigrationService {
  private containerName = 'migration_migrations';

  /**
   * Create migration
   */
  async create(input: CreateMigrationInput): Promise<Migration> {
    if (!input.tenantId || !input.name || !input.type || !input.scope) {
      throw new BadRequestError('tenantId, name, type, and scope are required');
    }

    const migration: Migration = {
      id: uuidv4(),
      tenantId: input.tenantId,
      name: input.name,
      description: input.description,
      type: input.type,
      status: MigrationStatus.DRAFT,
      source: input.source,
      target: input.target,
      scope: input.scope,
      steps: [],
      metadata: {
        ...input.metadata,
        priority: input.metadata?.priority || 'medium',
        riskLevel: input.metadata?.riskLevel || 'medium',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: input.userId,
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.items.create(migration, {
        partitionKey: input.tenantId,
      });

      if (!resource) {
        throw new Error('Failed to create migration');
      }

      return resource as Migration;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Migration with this ID already exists');
      }
      throw error;
    }
  }

  /**
   * Get migration by ID
   */
  async getById(migrationId: string, tenantId: string): Promise<Migration> {
    if (!migrationId || !tenantId) {
      throw new BadRequestError('migrationId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(migrationId, tenantId).read<Migration>();

      if (!resource) {
        throw new NotFoundError(`Migration ${migrationId} not found`);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError(`Migration ${migrationId} not found`);
      }
      throw error;
    }
  }

  /**
   * Update migration
   */
  async update(
    migrationId: string,
    tenantId: string,
    input: UpdateMigrationInput
  ): Promise<Migration> {
    const existing = await this.getById(migrationId, tenantId);

    const updated: Migration = {
      ...existing,
      ...input,
      metadata: {
        ...existing.metadata,
        ...input.metadata,
      },
      updatedAt: new Date(),
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(migrationId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update migration');
      }

      return resource as Migration;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError(`Migration ${migrationId} not found`);
      }
      throw error;
    }
  }

  /**
   * Delete migration
   */
  async delete(migrationId: string, tenantId: string): Promise<void> {
    const migration = await this.getById(migrationId, tenantId);

    // Don't allow deletion of running migrations
    if (migration.status === MigrationStatus.RUNNING) {
      throw new BadRequestError('Cannot delete a migration that is currently running');
    }

    const container = getContainer(this.containerName);
    await container.item(migrationId, tenantId).delete();
  }

  /**
   * List migrations
   */
  async list(
    tenantId: string,
    filters?: {
      type?: MigrationType;
      status?: MigrationStatus;
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<{ items: Migration[]; continuationToken?: string }> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.containerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    if (filters?.type) {
      query += ' AND c.type = @type';
      parameters.push({ name: '@type', value: filters.type });
    }

    if (filters?.status) {
      query += ' AND c.status = @status';
      parameters.push({ name: '@status', value: filters.status });
    }

    query += ' ORDER BY c.createdAt DESC';

    const limit = filters?.limit || 100;

    try {
      const { resources, continuationToken } = await container.items
        .query<Migration>({
          query,
          parameters,
        })
        .fetchNext();

      return {
        items: resources.slice(0, limit),
        continuationToken,
      };
    } catch (error: any) {
      throw new Error(`Failed to list migrations: ${error.message}`);
    }
  }
}

