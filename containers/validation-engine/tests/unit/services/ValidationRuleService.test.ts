/**
 * Unit tests for ValidationRuleService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { ValidationRuleService } from '../../../src/services/ValidationRuleService';
import { ValidationType, ValidationSeverity } from '../../../src/types/validation.types';

describe('ValidationRuleService', () => {
  let service: ValidationRuleService;

  beforeEach(() => {
    service = new ValidationRuleService();
  });

  describe('create', () => {
    it('creates a validation rule with required fields', async () => {
      const input = {
        tenantId: 'tenant-1',
        userId: 'user-1',
        name: 'Rule 1',
        type: ValidationType.SYNTAX,
        severity: ValidationSeverity.ERROR,
        ruleDefinition: { pattern: 'test' },
      };
      const created = { ...input, id: 'rule-id', createdAt: new Date(), updatedAt: new Date() };
      const mockCreate = vi.fn().mockResolvedValue({ resource: created });
      vi.mocked(getContainer).mockReturnValue({
        items: {
          create: mockCreate,
          query: vi.fn(() => ({
            fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
            fetchNext: vi.fn().mockResolvedValue({ resources: [], continuationToken: undefined }),
          })),
        },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: null }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      const result = await service.create(input);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: input.tenantId,
          name: input.name,
          type: input.type,
          ruleDefinition: input.ruleDefinition,
        }),
        { partitionKey: input.tenantId }
      );
      expect(result).toEqual(created);
    });

    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(
        service.create({
          tenantId: '',
          userId: 'user-1',
          name: 'R',
          type: ValidationType.SYNTAX,
          severity: ValidationSeverity.ERROR,
          ruleDefinition: {},
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when name is missing', async () => {
      await expect(
        service.create({
          tenantId: 't1',
          userId: 'user-1',
          name: '',
          type: ValidationType.SYNTAX,
          severity: ValidationSeverity.ERROR,
          ruleDefinition: {},
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when ruleDefinition is missing', async () => {
      await expect(
        service.create({
          tenantId: 't1',
          userId: 'user-1',
          name: 'R',
          type: ValidationType.SYNTAX,
          severity: ValidationSeverity.ERROR,
          ruleDefinition: undefined as any,
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError on 409 conflict', async () => {
      const mockCreate = vi.fn().mockRejectedValue({ code: 409 });
      vi.mocked(getContainer).mockReturnValue({
        items: { create: mockCreate, query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({ read: vi.fn(), replace: vi.fn(), delete: vi.fn() })),
      } as any);

      await expect(
        service.create({
          tenantId: 't1',
          userId: 'u1',
          name: 'R',
          type: ValidationType.SYNTAX,
          severity: ValidationSeverity.ERROR,
          ruleDefinition: {},
        })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('getById', () => {
    it('throws BadRequestError when ruleId or tenantId is missing', async () => {
      await expect(service.getById('', 't1')).rejects.toThrow(BadRequestError);
      await expect(service.getById('r1', '')).rejects.toThrow(BadRequestError);
    });

    it('returns rule when found', async () => {
      const rule = {
        id: 'r1',
        tenantId: 't1',
        name: 'Rule 1',
        type: ValidationType.SYNTAX,
        severity: ValidationSeverity.ERROR,
        enabled: true,
        ruleDefinition: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'u1',
      };
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: rule }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      const result = await service.getById('r1', 't1');

      expect(result).toEqual(rule);
    });

    it('throws NotFoundError when rule not found', async () => {
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: null }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      await expect(service.getById('r1', 't1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('updates rule and returns updated resource', async () => {
      const existing = {
        id: 'r1',
        tenantId: 't1',
        name: 'Old',
        type: ValidationType.SYNTAX,
        severity: ValidationSeverity.ERROR,
        enabled: true,
        ruleDefinition: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'u1',
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

      const result = await service.update('r1', 't1', { name: 'New' });

      expect(mockReplace).toHaveBeenCalled();
      expect(result.name).toBe('New');
    });
  });

  describe('delete', () => {
    it('deletes rule when found', async () => {
      const mockDelete = vi.fn().mockResolvedValue(undefined);
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: { id: 'r1', tenantId: 't1' } }),
          replace: vi.fn(),
          delete: mockDelete,
        })),
      } as any);

      await service.delete('r1', 't1');

      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(service.list('')).rejects.toThrow(BadRequestError);
    });

    it('returns items and continuationToken from fetchNext', async () => {
      const items = [
        {
          id: 'r1',
          tenantId: 't1',
          name: 'R1',
          type: ValidationType.SYNTAX,
          severity: ValidationSeverity.ERROR,
          enabled: true,
          ruleDefinition: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'u1',
        },
      ];
      vi.mocked(getContainer).mockReturnValue({
        items: {
          create: vi.fn(),
          query: vi.fn(() => ({
            fetchNext: vi.fn().mockResolvedValue({ resources: items, continuationToken: 'token' }),
            fetchAll: vi.fn(),
          })),
        },
        item: vi.fn(() => ({ read: vi.fn(), replace: vi.fn(), delete: vi.fn() })),
      } as any);

      const result = await service.list('t1');

      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('R1');
      expect(result.continuationToken).toBe('token');
    });
  });

  describe('getEnabledRules', () => {
    it('returns enabled rules filtered by validation types', async () => {
      const syntaxRule = {
        id: 'r1',
        tenantId: 't1',
        name: 'Syntax',
        type: ValidationType.SYNTAX,
        severity: ValidationSeverity.ERROR,
        enabled: true,
        ruleDefinition: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'u1',
      };
      vi.mocked(getContainer).mockReturnValue({
        items: {
          create: vi.fn(),
          query: vi.fn(() => ({
            fetchNext: vi.fn().mockResolvedValue({ resources: [syntaxRule], continuationToken: undefined }),
            fetchAll: vi.fn(),
          })),
        },
        item: vi.fn(() => ({ read: vi.fn(), replace: vi.fn(), delete: vi.fn() })),
      } as any);

      const result = await service.getEnabledRules('t1', [ValidationType.SYNTAX]);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(ValidationType.SYNTAX);
    });
  });
});
