/**
 * CompliancePolicyService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CompliancePolicyService } from '../../../src/services/CompliancePolicyService';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { ComplianceStandard, PolicyType } from '../../../src/types/compliance.types';

describe('CompliancePolicyService', () => {
  let service: CompliancePolicyService;
  let mockCreate: ReturnType<typeof vi.fn>;
  let mockRead: ReturnType<typeof vi.fn>;
  let mockReplace: ReturnType<typeof vi.fn>;
  let mockDelete: ReturnType<typeof vi.fn>;
  let mockFetchNext: ReturnType<typeof vi.fn>;

  const baseInput = {
    tenantId: 't1',
    userId: 'u1',
    name: 'Policy 1',
    type: PolicyType.SECURITY,
    standard: ComplianceStandard.OWASP,
    rules: [
      { name: 'r1', description: 'd1', condition: 'c1', severity: 'high' as const },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate = vi.fn();
    mockRead = vi.fn().mockResolvedValue({ resource: null });
    mockReplace = vi.fn();
    mockDelete = vi.fn();
    mockFetchNext = vi.fn().mockResolvedValue({ resources: [], continuationToken: undefined });
    vi.mocked(getContainer).mockReturnValue({
      items: {
        create: mockCreate,
        query: vi.fn(() => ({ fetchNext: mockFetchNext })),
      },
      item: vi.fn(() => ({ read: mockRead, replace: mockReplace, delete: mockDelete })),
    } as unknown as ReturnType<typeof getContainer>);
    service = new CompliancePolicyService();
  });

  describe('create', () => {
    it('throws BadRequestError when required fields are missing', async () => {
      await expect(
        service.create({ ...baseInput, tenantId: '' })
      ).rejects.toThrow(BadRequestError);
      await expect(
        service.create({ ...baseInput, name: '' })
      ).rejects.toThrow(/tenantId, name, type, standard, and rules are required/);
      await expect(
        service.create({ ...baseInput, type: undefined as unknown as PolicyType })
      ).rejects.toThrow(BadRequestError);
      await expect(
        service.create({ ...baseInput, standard: undefined as unknown as ComplianceStandard })
      ).rejects.toThrow(BadRequestError);
      await expect(
        service.create({ ...baseInput, rules: undefined as unknown as typeof baseInput.rules })
      ).rejects.toThrow(BadRequestError);
    });

    it('creates policy and returns resource', async () => {
      const created = {
        id: 'p1',
        tenantId: 't1',
        name: baseInput.name,
        type: PolicyType.SECURITY,
        standard: ComplianceStandard.OWASP,
        rules: baseInput.rules.map((r, i) => ({ id: `rule-${i}`, ...r })),
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'u1',
      };
      mockCreate.mockResolvedValue({ resource: created });
      const result = await service.create(baseInput);
      expect(result.tenantId).toBe('t1');
      expect(result.name).toBe(baseInput.name);
      expect(result.enabled).toBe(true);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 't1',
          name: baseInput.name,
          type: PolicyType.SECURITY,
          standard: ComplianceStandard.OWASP,
        }),
        { partitionKey: 't1' }
      );
    });

    it('throws when create returns no resource', async () => {
      mockCreate.mockResolvedValue({ resource: null });
      await expect(service.create(baseInput)).rejects.toThrow(/Failed to create compliance policy/);
    });

    it('throws BadRequestError on 409 conflict', async () => {
      mockCreate.mockRejectedValue({ code: 409 });
      await expect(service.create(baseInput)).rejects.toThrow(/already exists/);
    });
  });

  describe('getById', () => {
    it('throws BadRequestError when policyId or tenantId is missing', async () => {
      await expect(service.getById('', 't1')).rejects.toThrow(BadRequestError);
      await expect(service.getById('p1', '')).rejects.toThrow(BadRequestError);
    });

    it('returns policy when found', async () => {
      const policy = {
        id: 'p1',
        tenantId: 't1',
        name: 'Policy 1',
        type: PolicyType.SECURITY,
        standard: ComplianceStandard.OWASP,
        rules: [],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'u1',
      };
      mockRead.mockResolvedValue({ resource: policy });
      const result = await service.getById('p1', 't1');
      expect(result).toEqual(policy);
      expect(mockRead).toHaveBeenCalled();
    });

    it('throws NotFoundError when resource is null', async () => {
      mockRead.mockResolvedValue({ resource: null });
      await expect(service.getById('p1', 't1')).rejects.toThrow(NotFoundError);
      await expect(service.getById('p1', 't1')).rejects.toThrow(/not found/);
    });

    it('throws NotFoundError on 404', async () => {
      mockRead.mockRejectedValue({ code: 404 });
      await expect(service.getById('p1', 't1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('updates policy and returns resource', async () => {
      const existing = {
        id: 'p1',
        tenantId: 't1',
        name: 'Policy 1',
        type: PolicyType.SECURITY,
        standard: ComplianceStandard.OWASP,
        rules: [],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'u1',
      };
      const updated = { ...existing, name: 'Policy Updated' };
      mockRead.mockResolvedValue({ resource: existing });
      mockReplace.mockResolvedValue({ resource: updated });
      const result = await service.update('p1', 't1', { name: 'Policy Updated' });
      expect(result.name).toBe('Policy Updated');
      expect(mockReplace).toHaveBeenCalled();
    });

    it('throws NotFoundError on 404 from replace', async () => {
      mockRead.mockResolvedValue({
        resource: {
          id: 'p1',
          tenantId: 't1',
          name: 'Policy 1',
          type: PolicyType.SECURITY,
          standard: ComplianceStandard.OWASP,
          rules: [],
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'u1',
        },
      });
      mockReplace.mockRejectedValue({ code: 404 });
      await expect(service.update('p1', 't1', { name: 'x' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('deletes policy after getById', async () => {
      mockRead.mockResolvedValue({
        resource: {
          id: 'p1',
          tenantId: 't1',
          name: 'Policy 1',
          type: PolicyType.SECURITY,
          standard: ComplianceStandard.OWASP,
          rules: [],
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'u1',
        },
      });
      await service.delete('p1', 't1');
      expect(mockRead).toHaveBeenCalled();
      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(service.list('')).rejects.toThrow(BadRequestError);
    });

    it('returns items and continuationToken', async () => {
      const items = [
        {
          id: 'p1',
          tenantId: 't1',
          name: 'Policy 1',
          type: PolicyType.SECURITY,
          standard: ComplianceStandard.OWASP,
          rules: [],
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'u1',
        },
      ];
      mockFetchNext.mockResolvedValue({ resources: items, continuationToken: 'token1' });
      const result = await service.list('t1');
      expect(result.items).toEqual(items);
      expect(result.continuationToken).toBe('token1');
    });

    it('throws on list failure', async () => {
      mockFetchNext.mockRejectedValue(new Error('db error'));
      await expect(service.list('t1')).rejects.toThrow(/Failed to list compliance policies/);
    });
  });
});
