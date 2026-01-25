/**
 * Analytics Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalyticsService } from '../../../src/services/AnalyticsService';
import { ServiceClient } from '@coder/shared';

// Mock dependencies
vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn(),
}));

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    services: {},
    cosmos_db: {
      endpoint: 'https://test.documents.azure.com:443/',
      key: 'test-key',
      database_id: 'test',
    },
  })),
}));

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let mockServiceClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockServiceClient = {
      post: vi.fn(),
      get: vi.fn(),
    };

    (ServiceClient as any).mockImplementation(() => mockServiceClient);

    service = new AnalyticsService();
  });

  describe('recordEvent', () => {
    it('should record an event successfully', async () => {
      const event = {
        type: 'user_action',
        userId: 'user-123',
        organizationId: 'org-123',
        data: { action: 'click' },
      };

      // Mock the internal recording logic
      vi.spyOn(service as any, 'storeEvent').mockResolvedValue({ id: 'event-123' });

      const result = await service.recordEvent('tenant-123', event);

      expect(result).toHaveProperty('id');
    });

    it('should handle errors gracefully', async () => {
      const event = {
        type: 'user_action',
        userId: 'user-123',
        organizationId: 'org-123',
        data: {},
      };

      vi.spyOn(service as any, 'storeEvent').mockRejectedValue(new Error('Storage error'));

      await expect(service.recordEvent('tenant-123', event)).rejects.toThrow();
    });

    it('should validate required fields', async () => {
      const event = {
        type: '',
        userId: 'user-123',
        organizationId: 'org-123',
        data: {},
      } as any;

      await expect(service.recordEvent('tenant-123', event)).rejects.toThrow();
    });
  });

  describe('getMetrics', () => {
    it('should retrieve metrics successfully', async () => {
      const mockMetrics = {
        totalEvents: 100,
        uniqueUsers: 50,
      };

      vi.spyOn(service as any, 'queryMetrics').mockResolvedValue(mockMetrics);

      const result = await service.getMetrics('tenant-123', {
        startDate: new Date(),
        endDate: new Date(),
      });

      expect(result).toHaveProperty('totalEvents');
      expect(result).toHaveProperty('uniqueUsers');
    });

    it('should handle empty results', async () => {
      vi.spyOn(service as any, 'queryMetrics').mockResolvedValue({ totalEvents: 0, uniqueUsers: 0 });

      const result = await service.getMetrics('tenant-123', {
        startDate: new Date(),
        endDate: new Date(),
      });

      expect(result.totalEvents).toBe(0);
    });
  });
});
