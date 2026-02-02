/**
 * Collaboration Intelligence Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CollaborationIntelligenceService } from '../../../src/services/CollaborationIntelligenceService';

const { mockAiServiceClient, mockCollaborationServiceClient } = vi.hoisted(() => ({
  mockAiServiceClient: { post: vi.fn() },
  mockCollaborationServiceClient: { get: vi.fn(), post: vi.fn() },
}));
vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn().mockImplementation(function (this: any, config: any) {
    if (config?.baseURL?.includes('ai-insights')) return mockAiServiceClient;
    if (config?.baseURL?.includes('collaboration-service')) return mockCollaborationServiceClient;
    return { get: vi.fn(), post: vi.fn() };
  }),
}));

vi.mock('uuid', () => ({ v4: vi.fn(() => 'test-uuid-123') }));
vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(() => ({ items: { create: vi.fn().mockResolvedValue({}) } })),
}));
vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    services: {
      ai_service: { url: 'http://ai-service:3000' },
      ai_insights: { url: 'http://ai-insights:3000' },
      collaboration_service: { url: 'http://collaboration-service:3000' },
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

describe('CollaborationIntelligenceService', () => {
  let service: CollaborationIntelligenceService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CollaborationIntelligenceService();
  });

  describe('generateInsight', () => {
    it('should generate collaborative insight successfully', async () => {
      const tenantId = 'tenant-123';
      const context = {
        conversationId: 'conv-123',
        participants: ['user-1', 'user-2'],
      };

      // Mock conversation data
      mockCollaborationServiceClient.get.mockResolvedValue({
        id: 'conv-123',
        messages: [
          { userId: 'user-1', content: 'Message 1' },
          { userId: 'user-2', content: 'Message 2' },
        ],
      });

      mockAiServiceClient.post.mockResolvedValue({ insight: 'Action item', relevanceScore: 0.9 });

      const result = await service.generateInsight(tenantId, context);

      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('insightType');
    });
  });
});
