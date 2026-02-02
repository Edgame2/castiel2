/**
 * Integration Service unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getContainer } from '@coder/shared';
import { IntegrationService } from '../../../src/services/IntegrationService';

describe('IntegrationService', () => {
  let service: IntegrationService;
  let mockCreate: ReturnType<typeof vi.fn>;
  let mockItemRead: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate = vi.fn().mockResolvedValue({
      resource: {
        id: 'int-1',
        tenantId: 't1',
        integrationId: 'i1',
        name: 'Test',
        status: 'active',
      },
    });
    mockItemRead = vi.fn().mockResolvedValue({ resource: null });
    vi.mocked(getContainer).mockReturnValue({
      items: {
        create: mockCreate,
        query: vi.fn(() => ({
          fetchNext: vi.fn().mockResolvedValue({ resources: [], continuationToken: undefined }),
        })),
      },
      item: vi.fn(() => ({ read: mockItemRead, replace: vi.fn(), delete: vi.fn() })),
    } as any);
    service = new IntegrationService('http://secret', undefined);
  });

  describe('create', () => {
    it('should throw when tenantId missing', async () => {
      await expect(
        service.create({
          integrationId: 'i1',
          name: 'Test',
          credentialSecretName: 'secret',
          userId: 'u1',
        } as any)
      ).rejects.toThrow(/tenantId is required/);
    });

    it('should throw when integrationId missing', async () => {
      await expect(
        service.create({
          tenantId: 't1',
          name: 'Test',
          credentialSecretName: 'secret',
          userId: 'u1',
        } as any)
      ).rejects.toThrow(/integrationId is required/);
    });

    it('should throw when name missing', async () => {
      await expect(
        service.create({
          tenantId: 't1',
          integrationId: 'i1',
          credentialSecretName: 'secret',
          userId: 'u1',
        } as any)
      ).rejects.toThrow(/name is required/);
    });

    it('should throw when credentialSecretName missing', async () => {
      await expect(
        service.create({
          tenantId: 't1',
          integrationId: 'i1',
          name: 'Test',
          userId: 'u1',
        } as any)
      ).rejects.toThrow(/credentialSecretName is required/);
    });

    it('should create integration and return resource', async () => {
      const input = {
        tenantId: 't1',
        integrationId: 'i1',
        name: 'Test',
        credentialSecretName: 'secret',
        userId: 'u1',
      };
      const result = await service.create(input);
      expect(getContainer).toHaveBeenCalledWith('integration_integrations');
      expect(mockCreate).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.id).toBe('int-1');
      expect(result.tenantId).toBe('t1');
    });
  });

  describe('getById', () => {
    it('should throw when integrationId or tenantId missing', async () => {
      await expect(service.getById('', 't1')).rejects.toThrow(/required/);
      await expect(service.getById('i1', '')).rejects.toThrow(/required/);
    });

    it('should throw when resource is null', async () => {
      await expect(service.getById('i1', 't1')).rejects.toThrow();
    });

    it('should return integration when found', async () => {
      const integration = { id: 'i1', tenantId: 't1', name: 'Test' };
      mockItemRead.mockResolvedValueOnce({ resource: integration });
      const result = await service.getById('i1', 't1');
      expect(result).toEqual(integration);
    });
  });

  describe('list', () => {
    it('should throw when tenantId missing', async () => {
      await expect(service.list('')).rejects.toThrow(/tenantId is required/);
    });

    it('should return items and continuationToken', async () => {
      const result = await service.list('t1');
      expect(result.items).toEqual([]);
    });
  });

  describe('testConnection', () => {
    it('should throw when integration not found', async () => {
      await expect(service.testConnection('i1', 't1')).rejects.toThrow();
    });

    it('should return success placeholder when integration found', async () => {
      mockItemRead.mockResolvedValueOnce({ resource: { id: 'i1', tenantId: 't1' } });
      const result = await service.testConnection('i1', 't1');
      expect(result.success).toBe(true);
      expect(result.message).toContain('not yet implemented');
    });
  });
});
