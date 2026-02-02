/**
 * Webhook Service unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getContainer } from '@coder/shared';
import { WebhookService } from '../../../src/services/WebhookService';

describe('WebhookService', () => {
  let service: WebhookService;
  let mockCreate: ReturnType<typeof vi.fn>;
  let mockItemRead: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate = vi.fn().mockResolvedValue({ resource: { id: 'wh-1', tenantId: 't1' } });
    mockItemRead = vi.fn().mockResolvedValue({ resource: null });
    vi.mocked(getContainer).mockReturnValue({
      items: {
        create: mockCreate,
        query: vi.fn(() => ({ fetchNext: vi.fn().mockResolvedValue({ resources: [], continuationToken: undefined }) })),
      },
      item: vi.fn(() => ({ read: mockItemRead, replace: vi.fn(), delete: vi.fn() })),
    } as any);
    service = new WebhookService('http://secret');
  });

  describe('create', () => {
    it('should throw when tenantId missing', async () => {
      await expect(
        service.create({
          integrationId: 'i1',
          webhookUrl: 'https://example.com',
          events: ['created'],
          userId: 'u1',
        } as any)
      ).rejects.toThrow(/tenantId is required/);
    });

    it('should throw when webhookUrl or events missing', async () => {
      await expect(
        service.create({
          tenantId: 't1',
          integrationId: 'i1',
          events: ['created'],
          userId: 'u1',
        } as any)
      ).rejects.toThrow(/webhookUrl is required/);
      await expect(
        service.create({
          tenantId: 't1',
          integrationId: 'i1',
          webhookUrl: 'https://example.com',
          events: [],
          userId: 'u1',
        } as any)
      ).rejects.toThrow(/events are required/);
    });

    it('should create and return webhook', async () => {
      const input = {
        tenantId: 't1',
        integrationId: 'i1',
        webhookUrl: 'https://example.com/hook',
        events: ['created'],
        userId: 'u1',
      };
      const result = await service.create(input);
      expect(mockCreate).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.id).toBe('wh-1');
    });
  });

  describe('getById', () => {
    it('should throw when webhookId or tenantId missing', async () => {
      await expect(service.getById('', 't1')).rejects.toThrow(/required/);
      await expect(service.getById('id', '')).rejects.toThrow(/required/);
    });

    it('should throw when not found', async () => {
      await expect(service.getById('id', 't1')).rejects.toThrow();
    });
  });
});
