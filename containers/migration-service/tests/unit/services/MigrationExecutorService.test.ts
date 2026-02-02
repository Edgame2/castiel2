/**
 * Unit tests for MigrationExecutorService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestError } from '@coder/shared/utils/errors';
import { MigrationService } from '../../../src/services/MigrationService';
import { MigrationStepService } from '../../../src/services/MigrationStepService';
import { MigrationExecutorService } from '../../../src/services/MigrationExecutorService';
import { MigrationStatus } from '../../../src/types/migration.types';

describe('MigrationExecutorService', () => {
  let migrationService: MigrationService;
  let stepService: MigrationStepService;
  let service: MigrationExecutorService;

  beforeEach(() => {
    migrationService = new MigrationService();
    stepService = new MigrationStepService(migrationService);
    service = new MigrationExecutorService(migrationService, stepService);
  });

  const migration = (status: MigrationStatus, steps: string[] = ['s1']) => ({
    id: 'm1',
    tenantId: 't1',
    name: 'M1',
    type: 'version_upgrade' as any,
    status,
    scope: { type: 'file' as const, paths: ['/src'] },
    source: {},
    target: {},
    steps,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'u1',
  });

  describe('execute', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(
        service.execute({
          tenantId: '',
          userId: 'u1',
          migrationId: 'm1',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when migrationId is missing', async () => {
      await expect(
        service.execute({
          tenantId: 't1',
          userId: 'u1',
          migrationId: '',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when migration is already RUNNING', async () => {
      vi.spyOn(migrationService, 'getById').mockResolvedValue(
        migration(MigrationStatus.RUNNING) as any
      );

      await expect(
        service.execute({
          tenantId: 't1',
          userId: 'u1',
          migrationId: 'm1',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when migration is already COMPLETED', async () => {
      vi.spyOn(migrationService, 'getById').mockResolvedValue(
        migration(MigrationStatus.COMPLETED) as any
      );

      await expect(
        service.execute({
          tenantId: 't1',
          userId: 'u1',
          migrationId: 'm1',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when migration has no steps', async () => {
      vi.spyOn(migrationService, 'getById').mockResolvedValue(
        migration(MigrationStatus.DRAFT, []) as any
      );

      await expect(
        service.execute({
          tenantId: 't1',
          userId: 'u1',
          migrationId: 'm1',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('updates status to RUNNING and returns updated migration', async () => {
      const draft = migration(MigrationStatus.DRAFT);
      const running = { ...draft, status: MigrationStatus.RUNNING };
      vi.spyOn(migrationService, 'getById').mockResolvedValue(draft as any);
      vi.spyOn(migrationService, 'update').mockResolvedValue(running as any);

      const result = await service.execute({
        tenantId: 't1',
        userId: 'u1',
        migrationId: 'm1',
      });

      expect(migrationService.update).toHaveBeenCalledWith(
        'm1',
        't1',
        expect.objectContaining({ status: MigrationStatus.RUNNING })
      );
      expect(result.status).toBe(MigrationStatus.RUNNING);
    });
  });

  describe('rollback', () => {
    it('throws BadRequestError when migration is not COMPLETED or FAILED', async () => {
      vi.spyOn(migrationService, 'getById').mockResolvedValue(
        migration(MigrationStatus.DRAFT) as any
      );

      await expect(service.rollback('m1', 't1')).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when migration has no rollback steps', async () => {
      const completed = migration(MigrationStatus.COMPLETED);
      (completed as any).rollbackSteps = undefined;
      vi.spyOn(migrationService, 'getById').mockResolvedValue(completed as any);

      await expect(service.rollback('m1', 't1')).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when rollbackSteps is empty', async () => {
      const completed = migration(MigrationStatus.COMPLETED);
      (completed as any).rollbackSteps = [];
      vi.spyOn(migrationService, 'getById').mockResolvedValue(completed as any);

      await expect(service.rollback('m1', 't1')).rejects.toThrow(BadRequestError);
    });
  });
});
