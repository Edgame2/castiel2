/**
 * Migration Step Service
 * Handles migration step CRUD operations
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { MigrationService } from './MigrationService';
import {
  MigrationStep,
  CreateMigrationStepInput,
  MigrationStepStatus,
} from '../types/migration.types';

export class MigrationStepService {
  private containerName = 'migration_steps';
  private migrationService: MigrationService;

  constructor(migrationService: MigrationService) {
    this.migrationService = migrationService;
  }

  /**
   * Create migration step
   */
  async create(input: CreateMigrationStepInput): Promise<MigrationStep> {
    if (!input.tenantId || !input.migrationId || !input.name || !input.transformation) {
      throw new BadRequestError('tenantId, migrationId, name, and transformation are required');
    }

    // Verify migration exists
    await this.migrationService.getById(input.migrationId, input.tenantId);

    const step: MigrationStep = {
      id: uuidv4(),
      tenantId: input.tenantId,
      migrationId: input.migrationId,
      order: input.order,
      name: input.name,
      description: input.description,
      type: input.type,
      status: MigrationStepStatus.PENDING,
      transformation: input.transformation,
      validation: input.validation,
      rollback: input.rollback,
      createdAt: new Date(),
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await (container.items as any).create(step, {
        partitionKey: input.tenantId,
      });

      if (!resource) {
        throw new Error('Failed to create migration step');
      }

      // Add step to migration
      const migration = await this.migrationService.getById(input.migrationId, input.tenantId);
      const updatedSteps = [...migration.steps, resource.id];

      // Update migration steps directly
      const migrationContainer = getContainer('migration_migrations');
      await migrationContainer.item(input.migrationId, input.tenantId).replace({
        ...migration,
        steps: updatedSteps,
        updatedAt: new Date(),
      });

      return resource as MigrationStep;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Migration step with this ID already exists');
      }
      throw error;
    }
  }

  /**
   * Get step by ID
   */
  async getById(stepId: string, tenantId: string): Promise<MigrationStep> {
    if (!stepId || !tenantId) {
      throw new BadRequestError('stepId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(stepId, tenantId).read<MigrationStep>();

      if (!resource) {
        throw new NotFoundError('Migration step', stepId);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError('Migration step', stepId);
      }
      throw error;
    }
  }

  /**
   * Get steps for a migration
   */
  async getByMigrationId(
    migrationId: string,
    tenantId: string
  ): Promise<MigrationStep[]> {
    if (!migrationId || !tenantId) {
      throw new BadRequestError('migrationId and tenantId are required');
    }

    const container = getContainer(this.containerName);
    const { resources } = await container.items
      .query<MigrationStep>({
        query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.migrationId = @migrationId ORDER BY c.order ASC',
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@migrationId', value: migrationId },
        ],
      })
      .fetchAll();

    return resources;
  }

  /**
   * Update step status
   */
  async updateStatus(
    stepId: string,
    tenantId: string,
    status: MigrationStepStatus,
    updates?: {
      results?: MigrationStep['results'];
      startedAt?: Date;
      completedAt?: Date;
      duration?: number;
      error?: string;
    }
  ): Promise<MigrationStep> {
    const existing = await this.getById(stepId, tenantId);

    const updated: MigrationStep = {
      ...existing,
      status,
      ...updates,
      results: updates?.results || existing.results,
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(stepId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update migration step');
      }

      return resource as MigrationStep;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError('Migration step', stepId);
      }
      throw error;
    }
  }

  /**
   * Delete step
   */
  async delete(stepId: string, tenantId: string): Promise<void> {
    const step = await this.getById(stepId, tenantId);

    // Don't allow deletion of running steps
    if (step.status === MigrationStepStatus.RUNNING) {
      throw new BadRequestError('Cannot delete a step that is currently running');
    }

    // Remove from migration
    const migration = await this.migrationService.getById(step.migrationId, tenantId);
    const updatedSteps = migration.steps.filter((id) => id !== stepId);

    const migrationContainer = getContainer('migration_migrations');
    await migrationContainer.item(step.migrationId, tenantId).replace({
      ...migration,
      steps: updatedSteps,
    });

    const container = getContainer(this.containerName);
    await container.item(stepId, tenantId).delete();
  }
}

