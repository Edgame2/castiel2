/**
 * Integration Provider Service unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getContainer } from '@coder/shared';
import { IntegrationProviderService } from '../../../src/services/IntegrationProviderService';

describe('IntegrationProviderService', () => {
  let service: IntegrationProviderService;
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate = vi.fn().mockResolvedValue({ resource: { id: 'prov-1', category: 'crm', provider: 'salesforce' } });
    vi.mocked(getContainer).mockReturnValue({
      items: { create: mockCreate, query: vi.fn(() => ({ fetchNext: vi.fn().mockResolvedValue({ resources: [] }) })) },
      item: vi.fn(() => ({ read: vi.fn().mockResolvedValue({ resource: null }) })),
    } as any);
    service = new IntegrationProviderService();
  });

  describe('create', () => {
    it('should throw when category missing', async () => {
      await expect(
        service.create({
          provider: 'salesforce',
          name: 'Salesforce',
          authMethods: [],
          supportedEntities: [],
          webhookSupport: false,
          createdBy: 'u1',
        } as any)
      ).rejects.toThrow(/category is required/);
    });

    it('should throw when provider or name missing', async () => {
      await expect(
        service.create({
          category: 'crm',
          name: 'Salesforce',
          authMethods: [],
          supportedEntities: [],
          webhookSupport: false,
          createdBy: 'u1',
        } as any)
      ).rejects.toThrow(/provider is required/);
      await expect(
        service.create({
          category: 'crm',
          provider: 'salesforce',
          authMethods: [],
          supportedEntities: [],
          webhookSupport: false,
          createdBy: 'u1',
        } as any)
      ).rejects.toThrow(/name is required/);
    });

    it('should create and return provider', async () => {
      const input = {
        category: 'crm',
        provider: 'salesforce',
        name: 'Salesforce',
        authMethods: ['oauth2'],
        supportedEntities: ['Account'],
        webhookSupport: false,
        createdBy: 'u1',
      };
      const result = await service.create(input);
      expect(mockCreate).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.id).toBe('prov-1');
    });
  });
});
