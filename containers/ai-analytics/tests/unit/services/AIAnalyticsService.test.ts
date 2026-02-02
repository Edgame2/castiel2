/**
 * AI Analytics Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIAnalyticsService } from '../../../src/services/AIAnalyticsService';
import { getContainer } from '@coder/shared/database';

// Mock dependencies
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-123'),
}));
vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn().mockImplementation(function (this: any) {
    this.get = vi.fn().mockResolvedValue({ data: {} });
    this.post = vi.fn().mockResolvedValue({ data: {} });
  }),
}));
vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(),
}));

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    database: {
      containers: {
        ai_analytics: 'ai_analytics',
      },
    },
    services: {
      ai_service: { url: 'http://ai-service' },
      ai_insights: { url: 'http://ai-insights' },
      analytics_service: { url: 'http://analytics-service' },
    },
  })),
}));

vi.mock('../../../src/utils/logger', () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('AIAnalyticsService', () => {
  let service: AIAnalyticsService;
  let mockContainer: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockContainer = {
      items: {
        create: vi.fn(),
        query: vi.fn(() => ({
          fetchAll: vi.fn(),
        })),
      },
    };
    (getContainer as any).mockReturnValue(mockContainer);

    service = new AIAnalyticsService();
  });

  describe('recordEvent', () => {
    it('should record AI analytics event successfully', async () => {
      const tenantId = 'tenant-123';
      const event = {
        eventType: 'usage' as const,
        modelId: 'gpt-4',
        tokens: 150,
        cost: 0.01,
      };

      mockContainer.items.create.mockResolvedValue({});

      await service.recordEvent(tenantId, event);

      expect(mockContainer.items.create).toHaveBeenCalled();
    });
  });

  describe('getModelAnalytics', () => {
    it('should retrieve model analytics', async () => {
      const tenantId = 'tenant-123';
      const mockModels = [
        { id: 'm1', tenantId, modelId: 'gpt-4', usageCount: 100, totalTokens: 5000 },
      ];

      mockContainer.items.query.mockReturnValue({
        fetchNext: vi.fn().mockResolvedValue({ resources: mockModels }),
      });

      const result = await service.getModelAnalytics(tenantId);

      expect(result).toEqual(mockModels);
      expect(mockContainer.items.query).toHaveBeenCalled();
    });
  });
});
