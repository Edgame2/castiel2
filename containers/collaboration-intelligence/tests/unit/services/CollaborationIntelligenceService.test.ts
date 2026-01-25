/**
 * Collaboration Intelligence Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CollaborationIntelligenceService } from '../../../src/services/CollaborationIntelligenceService';
import { ServiceClient } from '@coder/shared';

// Mock dependencies
vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn(),
}));

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    services: {
      ai_service: { url: 'http://ai-service:3000' },
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
  let mockAiServiceClient: any;
  let mockCollaborationServiceClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAiServiceClient = {
      post: vi.fn(),
    };
    mockCollaborationServiceClient = {
      get: vi.fn(),
      post: vi.fn(),
    };

    (ServiceClient as any).mockImplementation((config: any) => {
      if (config.baseURL?.includes('ai-service')) {
        return mockAiServiceClient;
      }
      if (config.baseURL?.includes('collaboration-service')) {
        return mockCollaborationServiceClient;
      }
      return {};
    });

    service = new CollaborationIntelligenceService();
  });

  describe('generateCollaborativeInsight', () => {
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

      // Mock AI insight generation
      mockAiServiceClient.post.mockResolvedValue({
        insight: {
          type: 'action_item',
          summary: 'Action item identified',
          participants: ['user-1'],
        },
      });

      const result = await service.generateCollaborativeInsight(tenantId, context);

      expect(result).toHaveProperty('insight');
      expect(mockAiServiceClient.post).toHaveBeenCalled();
    });
  });
});
