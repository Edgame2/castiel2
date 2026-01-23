/**
 * Migration Executor Service
 * Handles migration execution
 */

import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { MigrationService } from './MigrationService';
import { MigrationStepService } from './MigrationStepService';
import {
  Migration,
  MigrationStep,
  ExecuteMigrationInput,
  MigrationStatus,
  MigrationStepStatus,
} from '../types/migration.types';

export class MigrationExecutorService {
  private migrationService: MigrationService;
  private stepService: MigrationStepService;

  constructor(migrationService: MigrationService, stepService: MigrationStepService) {
    this.migrationService = migrationService;
    this.stepService = stepService;
  }

  /**
   * Execute migration
   * Note: This is a placeholder - actual execution would transform code
   */
  async execute(input: ExecuteMigrationInput): Promise<Migration> {
    if (!input.tenantId || !input.migrationId) {
      throw new BadRequestError('tenantId and migrationId are required');
    }

    const migration = await this.migrationService.getById(input.migrationId, input.tenantId);

    if (migration.status === MigrationStatus.RUNNING) {
      throw new BadRequestError('Migration is already running');
    }

    if (migration.status === MigrationStatus.COMPLETED) {
      throw new BadRequestError('Migration has already been completed');
    }

    if (migration.steps.length === 0) {
      throw new BadRequestError('Migration has no steps to execute');
    }

    // Update status to running
    const updatedMigration = await this.migrationService.update(
      input.migrationId,
      input.tenantId,
      {
        status: MigrationStatus.RUNNING,
      }
    );

    // Start execution (async)
    this.executeSteps(updatedMigration, input.tenantId, input.dryRun || false).catch(
      (error) => {
        console.error('Migration execution failed:', error);
      }
    );

    return updatedMigration;
  }

  /**
   * Execute migration steps (async)
   */
  private async executeSteps(
    migration: Migration,
    tenantId: string,
    dryRun: boolean
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Get all steps in order
      const steps = await this.stepService.getByMigrationId(migration.id, tenantId);
      const sortedSteps = steps.sort((a, b) => a.order - b.order);

      // Execute each step
      for (const step of sortedSteps) {
        try {
          await this.executeStep(step, tenantId, dryRun);
        } catch (error: any) {
          // Mark step as failed
          await this.stepService.updateStatus(step.id, tenantId, MigrationStepStatus.FAILED, {
            error: error.message,
            completedAt: new Date(),
          });

          // If step validation is required, stop execution
          if (step.validation?.required) {
            throw error;
          }
          // Otherwise, continue with next step
        }
      }

      const duration = Date.now() - startTime;

      // Mark migration as completed
      await this.migrationService.update(migration.id, tenantId, {
        status: MigrationStatus.COMPLETED,
      });

      // Update migration with completion time
      const migrationContainer = getContainer('migration_migrations');
      await migrationContainer.item(migration.id, tenantId).replace({
        ...migration,
        status: MigrationStatus.COMPLETED,
        completedAt: new Date(),
        duration,
      });
    } catch (error: any) {
      // Mark migration as failed
      await this.migrationService.update(migration.id, tenantId, {
        status: MigrationStatus.FAILED,
      });

      const migrationContainer = getContainer('migration_migrations');
      await migrationContainer.item(migration.id, tenantId).replace({
        ...migration,
        status: MigrationStatus.FAILED,
        error: error.message,
        completedAt: new Date(),
        duration: Date.now() - startTime,
      });
    }
  }

  /**
   * Execute a single step
   */
  private async executeStep(
    step: MigrationStep,
    tenantId: string,
    dryRun: boolean
  ): Promise<void> {
    const stepStartTime = Date.now();

    // Update step status to running
    await this.stepService.updateStatus(step.id, tenantId, MigrationStepStatus.RUNNING, {
      startedAt: new Date(),
    });

    try {
      // Placeholder: In a real implementation, this would:
      // 1. Load files from migration scope
      // 2. Apply transformation (pattern replacement, script execution, etc.)
      // 3. Validate changes if validation is configured
      // 4. Save changes (if not dry run)

      // Simulate execution
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const results = {
        filesChanged: dryRun ? 0 : Math.floor(Math.random() * 10) + 1,
        linesChanged: dryRun ? 0 : Math.floor(Math.random() * 100) + 10,
        errors: 0,
        warnings: Math.floor(Math.random() * 3),
      };

      const duration = Date.now() - stepStartTime;

      // Mark step as completed
      await this.stepService.updateStatus(step.id, tenantId, MigrationStepStatus.COMPLETED, {
        results,
        completedAt: new Date(),
        duration,
      });
    } catch (error: any) {
      const duration = Date.now() - stepStartTime;
      await this.stepService.updateStatus(step.id, tenantId, MigrationStepStatus.FAILED, {
        error: error.message,
        completedAt: new Date(),
        duration,
      });
      throw error;
    }
  }

  /**
   * Rollback migration
   */
  async rollback(migrationId: string, tenantId: string): Promise<Migration> {
    const migration = await this.migrationService.getById(migrationId, tenantId);

    if (migration.status !== MigrationStatus.COMPLETED && migration.status !== MigrationStatus.FAILED) {
      throw new BadRequestError('Can only rollback completed or failed migrations');
    }

    if (!migration.rollbackSteps || migration.rollbackSteps.length === 0) {
      throw new BadRequestError('Migration has no rollback steps');
    }

    // Get rollback steps
    const steps = await this.stepService.getByMigrationId(migrationId, tenantId);
    const rollbackSteps = steps.filter((step) => migration.rollbackSteps!.includes(step.id));
    const sortedRollbackSteps = rollbackSteps.sort((a, b) => b.order - a.order); // Reverse order

    // Execute rollback steps
    for (const step of sortedRollbackSteps) {
      if (step.rollback) {
        // Execute rollback transformation
        await this.executeStep(step, tenantId, false);
      }
    }

    // Update migration status
    const updatedMigration = await this.migrationService.update(migrationId, tenantId, {
      status: MigrationStatus.ROLLED_BACK,
    });

    const migrationContainer = getContainer('migration_migrations');
    await migrationContainer.item(migrationId, tenantId).replace({
      ...updatedMigration,
      rolledBackAt: new Date(),
    });

    return updatedMigration;
  }
}

