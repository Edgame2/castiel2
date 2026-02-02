/**
 * Unit tests for ValidationService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { ValidationRuleService } from '../../../src/services/ValidationRuleService';
import { ValidationService } from '../../../src/services/ValidationService';
import { ValidationStatus, ValidationSeverity } from '../../../src/types/validation.types';

describe('ValidationService', () => {
  let ruleService: ValidationRuleService;
  let service: ValidationService;

  beforeEach(() => {
    ruleService = new ValidationRuleService();
    service = new ValidationService(ruleService);
  });

  describe('runValidation', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(
        service.runValidation({
          tenantId: '',
          userId: 'u1',
          target: { type: 'file', path: '/p' },
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when target.path is missing', async () => {
      await expect(
        service.runValidation({
          tenantId: 't1',
          userId: 'u1',
          target: { type: 'file', path: '' },
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('creates validation run and returns it', async () => {
      const mockCreate = vi.fn().mockImplementation((doc: any) =>
        Promise.resolve({ resource: { ...doc, id: doc.id || 'run-id' } })
      );
      vi.mocked(getContainer).mockReturnValue({
        items: {
          create: mockCreate,
          query: vi.fn(() => ({
            fetchNext: vi.fn().mockResolvedValue({ resources: [], continuationToken: undefined }),
            fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
          })),
        },
        item: vi.fn((id: string, pk: string) => ({
          read: vi.fn().mockResolvedValue({
            resource: {
              id,
              tenantId: pk,
              status: 'pending',
              results: { total: 0, passed: 0, failed: 0, skipped: 0, errors: 0, warnings: 0, info: 0 },
              createdAt: new Date(),
              createdBy: 'u1',
              target: { type: 'file', path: '/p' },
            },
          }),
          replace: vi.fn().mockImplementation((doc: any) => Promise.resolve({ resource: doc })),
          delete: vi.fn(),
        })),
      } as any);

      const result = await service.runValidation({
        tenantId: 't1',
        userId: 'u1',
        target: { type: 'file', path: '/app/src' },
      });

      expect(result.tenantId).toBe('t1');
      expect(result.target.path).toBe('/app/src');
      expect(result.status).toBe(ValidationStatus.PENDING);
      expect(mockCreate).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('throws BadRequestError when validationId or tenantId is missing', async () => {
      await expect(service.getById('', 't1')).rejects.toThrow(BadRequestError);
      await expect(service.getById('v1', '')).rejects.toThrow(BadRequestError);
    });

    it('returns validation run when found', async () => {
      const run = {
        id: 'v1',
        tenantId: 't1',
        status: ValidationStatus.COMPLETED,
        results: { total: 1, passed: 1, failed: 0, skipped: 0, errors: 0, warnings: 0, info: 0 },
        createdAt: new Date(),
        createdBy: 'u1',
        target: { type: 'file', path: '/p' },
      };
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: run }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      const result = await service.getById('v1', 't1');

      expect(result).toEqual(run);
    });

    it('throws NotFoundError when run not found', async () => {
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: null }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      await expect(service.getById('v1', 't1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateStatus', () => {
    it('updates status and returns run', async () => {
      const existing = {
        id: 'v1',
        tenantId: 't1',
        status: ValidationStatus.PENDING,
        results: { total: 0, passed: 0, failed: 0, skipped: 0, errors: 0, warnings: 0, info: 0 },
        createdAt: new Date(),
        createdBy: 'u1',
        target: { type: 'file', path: '/p' },
      };
      const mockReplace = vi.fn().mockImplementation((doc: any) => Promise.resolve({ resource: doc }));
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: existing }),
          replace: mockReplace,
          delete: vi.fn(),
        })),
      } as any);

      const result = await service.updateStatus('v1', 't1', ValidationStatus.RUNNING);

      expect(mockReplace).toHaveBeenCalled();
      expect(result.status).toBe(ValidationStatus.RUNNING);
    });
  });

  describe('getResults', () => {
    it('throws BadRequestError when validationId or tenantId is missing', async () => {
      await expect(service.getResults('', 't1')).rejects.toThrow(BadRequestError);
      await expect(service.getResults('v1', '')).rejects.toThrow(BadRequestError);
    });

    it('returns results from query', async () => {
      const results = [
        {
          id: 'res1',
          tenantId: 't1',
          validationId: 'v1',
          ruleId: 'r1',
          ruleName: 'R1',
          type: 'syntax' as any,
          severity: ValidationSeverity.ERROR,
          status: 'failed' as const,
          message: 'Failed',
          createdAt: new Date(),
        },
      ];
      vi.mocked(getContainer).mockReturnValue({
        items: {
          create: vi.fn(),
          query: vi.fn(() => ({
            fetchNext: vi.fn(),
            fetchAll: vi.fn().mockResolvedValue({ resources: results }),
          })),
        },
        item: vi.fn(() => ({ read: vi.fn(), replace: vi.fn(), delete: vi.fn() })),
      } as any);

      const list = await service.getResults('v1', 't1');

      expect(list).toHaveLength(1);
      expect(list[0].ruleName).toBe('R1');
    });
  });

  describe('list', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(service.list('')).rejects.toThrow(BadRequestError);
    });

    it('returns items and continuationToken', async () => {
      const runs = [
        {
          id: 'v1',
          tenantId: 't1',
          status: ValidationStatus.COMPLETED,
          results: { total: 0, passed: 0, failed: 0, skipped: 0, errors: 0, warnings: 0, info: 0 },
          createdAt: new Date(),
          createdBy: 'u1',
          target: { type: 'file', path: '/p' },
        },
      ];
      vi.mocked(getContainer).mockReturnValue({
        items: {
          create: vi.fn(),
          query: vi.fn(() => ({
            fetchNext: vi.fn().mockResolvedValue({ resources: runs, continuationToken: 'tok' }),
            fetchAll: vi.fn(),
          })),
        },
        item: vi.fn(() => ({ read: vi.fn(), replace: vi.fn(), delete: vi.fn() })),
      } as any);

      const result = await service.list('t1');

      expect(result.items).toHaveLength(1);
      expect(result.continuationToken).toBe('tok');
    });
  });
});
