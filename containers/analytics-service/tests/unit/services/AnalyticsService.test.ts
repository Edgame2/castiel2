/**
 * Analytics Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalyticsService } from '../../../src/services/AnalyticsService';
import { getContainer } from '@coder/shared/database';

vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(),
}));
vi.mock('uuid', () => ({ v4: vi.fn(() => 'test-uuid-123') }));

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let mockContainer: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContainer = {
      items: {
        create: vi.fn().mockResolvedValue({
          resource: {
            id: 'event-123',
            tenantId: 'tenant-123',
            eventName: 'test',
            timestamp: new Date(),
          },
        }),
        query: vi.fn().mockReturnValue({
          fetchNext: vi.fn().mockResolvedValue({ resources: [] }),
        }),
      },
    };
    (getContainer as any).mockReturnValue(mockContainer);
    service = new AnalyticsService();
  });

  describe('trackEvent', () => {
    it('should track an event successfully', async () => {
      const input = {
        tenantId: 'tenant-123',
        eventName: 'user_click',
        eventType: 'user_action',
      };

      const result = await service.trackEvent(input);

      expect(result).toHaveProperty('id');
      expect(mockContainer.items.create).toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      await expect(service.trackEvent({} as any)).rejects.toThrow();
      await expect(service.trackEvent({ tenantId: 't1' } as any)).rejects.toThrow();
    });
  });

  describe('getAggregateMetrics', () => {
    it('should retrieve metrics successfully', async () => {
      const mockEvents = [
        { tenantId: 'tenant-123', eventName: 'click', value: 10, timestamp: new Date() },
        { tenantId: 'tenant-123', eventName: 'click', value: 20, timestamp: new Date() },
      ];
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: mockEvents }),
      });

      const result = await service.getAggregateMetrics({
        tenantId: 'tenant-123',
        startDate: new Date(),
        endDate: new Date(),
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });
});
