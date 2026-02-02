/**
 * Signal Intelligence Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SignalIntelligenceService } from '../../../src/services/SignalIntelligenceService';
import { ServiceClient } from '@coder/shared';

// Mock dependencies - ServiceClient must be a constructor (use function, not arrow)
const mockServiceClientImpl = vi.hoisted(() => vi.fn());
vi.mock('@coder/shared', () => ({
  ServiceClient: mockServiceClientImpl,
}));

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    services: {
      ai_service: { url: 'http://ai-service:3000' },
      analytics_service: { url: 'http://analytics-service:3000' },
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

describe('SignalIntelligenceService', () => {
  let service: SignalIntelligenceService;
  let mockAiServiceClient: any;
  let mockAnalyticsServiceClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAiServiceClient = {
      post: vi.fn(),
    };
    mockAnalyticsServiceClient = {
      get: vi.fn(),
      post: vi.fn(),
    };

    mockServiceClientImpl.mockImplementation(function (this: any, config: any) {
      if (config?.baseURL?.includes('ai-service')) {
        return mockAiServiceClient;
      }
      if (config?.baseURL?.includes('analytics-service')) {
        return mockAnalyticsServiceClient;
      }
      return this ?? {};
    });

    service = new SignalIntelligenceService();
  });

  describe('analyzeSignal', () => {
    it('should analyze communication signal successfully', async () => {
      const tenantId = 'tenant-123';
      const signal = {
        type: 'communication' as const,
        source: 'email',
        data: {
          from: 'user@example.com',
          to: 'team@example.com',
          subject: 'Project Update',
        },
      };

      mockAiServiceClient.post.mockResolvedValue({
        analysis: {
          sentiment: 'positive',
          urgency: 'medium',
          topics: ['project', 'update'],
        },
      });

      const result = await service.analyzeSignal(tenantId, signal);

      expect(result).toHaveProperty('analysis');
      expect(result.analysis).toHaveProperty('sentiment');
      expect(mockAiServiceClient.post).toHaveBeenCalled();
    });

    it('should analyze calendar signal successfully', async () => {
      const tenantId = 'tenant-123';
      const signal = {
        type: 'calendar' as const,
        data: {
          eventTitle: 'Team Meeting',
          attendees: ['user-1', 'user-2'],
          duration: 60,
        },
      };

      mockAiServiceClient.post.mockResolvedValue({
        analysis: {
          importance: 'high',
          category: 'meeting',
          participants: ['user-1', 'user-2'],
        },
      });

      const result = await service.analyzeSignal(tenantId, signal);

      expect(result).toHaveProperty('analysis');
      expect(mockAiServiceClient.post).toHaveBeenCalled();
    });
  });
});
