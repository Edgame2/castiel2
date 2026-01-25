/**
 * AI Analytics Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIAnalyticsService } from '../../../src/services/AIAnalyticsService';
import { getContainer } from '@coder/shared/database';

// Mock dependencies
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

  describe('recordAIUsage', () => {
    it('should record AI usage successfully', async () => {
      const tenantId = 'tenant-123';
      const usage = {
        modelId: 'gpt-4',
        promptTokens: 100,
        completionTokens: 50,
        cost: 0.01,
      };

      mockContainer.items.create.mockResolvedValue({
        resource: {
          id: 'usage-123',
          tenantId,
          ...usage,
          timestamp: new Date(),
        },
      });

      await service.recordAIUsage(tenantId, usage);

      expect(mockContainer.items.create).toHaveBeenCalled();
    });
  });

  describe('getAIUsageStats', () => {
    it('should retrieve AI usage statistics', async () => {
      const tenantId = 'tenant-123';

      const mockStats = {
        totalRequests: 1000,
        totalTokens: 50000,
        totalCost: 10.5,
        byModel: {
          'gpt-4': { requests: 500, tokens: 25000, cost: 5.0 },
          'gpt-3.5-turbo': { requests: 500, tokens: 25000, cost: 5.5 },
        },
      };

      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            { modelId: 'gpt-4', promptTokens: 100, completionTokens: 50, cost: 0.01 },
            { modelId: 'gpt-3.5-turbo', promptTokens: 80, completionTokens: 40, cost: 0.005 },
          ],
        }),
      });

      const result = await service.getAIUsageStats(tenantId, {});

      expect(result).toHaveProperty('totalRequests');
      expect(result).toHaveProperty('totalCost');
    });
  });
});
