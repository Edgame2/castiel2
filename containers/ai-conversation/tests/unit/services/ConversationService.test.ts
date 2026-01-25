/**
 * Conversation Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConversationService } from '../../../src/services/ConversationService';
import { getContainer } from '@coder/shared/database';
import { ServiceClient } from '@coder/shared';
import { generateServiceToken } from '@coder/shared';

// Mock dependencies
vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(),
}));

vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn(),
  generateServiceToken: vi.fn(() => 'mock-token'),
}));

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    services: {
      shard_manager: { url: 'http://shard-manager:3000' },
      ai_service: { url: 'http://ai-service:3000' },
      context_service: { url: 'http://context-service:3000' },
      embeddings: { url: 'http://embeddings:3000' },
    },
    database: {
      containers: {
        conversation_conversations: 'conversation_conversations',
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

vi.mock('../../../src/events/publishers/ConversationEventPublisher', () => ({
  publishConversationEvent: vi.fn(),
}));

describe('ConversationService', () => {
  let service: ConversationService;
  let mockShardManagerClient: any;
  let mockAiServiceClient: any;
  let mockContextServiceClient: any;
  let mockEmbeddingsClient: any;
  let mockContainer: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock container
    mockContainer = {
      items: {
        create: vi.fn(),
        query: vi.fn(() => ({
          fetchAll: vi.fn(),
        })),
        read: vi.fn(),
        replace: vi.fn(),
        delete: vi.fn(),
      },
    };
    (getContainer as any).mockReturnValue(mockContainer);

    // Mock ServiceClient instances
    mockShardManagerClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };
    mockAiServiceClient = {
      post: vi.fn(),
    };
    mockContextServiceClient = {
      post: vi.fn(),
    };
    mockEmbeddingsClient = {
      post: vi.fn(),
    };

    (ServiceClient as any).mockImplementation((config: any) => {
      if (config.baseURL?.includes('shard-manager')) {
        return mockShardManagerClient;
      }
      if (config.baseURL?.includes('ai-service')) {
        return mockAiServiceClient;
      }
      if (config.baseURL?.includes('context-service')) {
        return mockContextServiceClient;
      }
      if (config.baseURL?.includes('embeddings')) {
        return mockEmbeddingsClient;
      }
      return {};
    });

    service = new ConversationService();
  });

  describe('createConversation', () => {
    it('should create a conversation successfully', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const input = {
        title: 'Test Conversation',
        context: { projectId: 'project-123' },
      };

      // Mock shard type exists
      mockShardManagerClient.get.mockResolvedValue([
        { name: 'c_conversation', id: 'shard-type-123' },
      ]);

      // Mock shard creation
      mockShardManagerClient.post.mockResolvedValue({
        id: 'conversation-123',
        tenantId,
        userId,
        shardTypeName: 'c_conversation',
        data: {
          title: input.title,
          status: 'active',
          messages: [],
          createdAt: new Date().toISOString(),
        },
      });

      // Mock container create
      mockContainer.items.create.mockResolvedValue({
        resource: {
          id: 'conversation-123',
          tenantId,
          userId,
          title: input.title,
          status: 'active',
          messages: [],
          createdAt: new Date(),
        },
      });

      const result = await service.createConversation(tenantId, userId, input);

      expect(result).toHaveProperty('id');
      expect(result.title).toBe(input.title);
      expect(result.status).toBe('active');
      expect(mockShardManagerClient.post).toHaveBeenCalled();
      expect(mockContainer.items.create).toHaveBeenCalled();
    });

    it('should handle missing shard type and create it', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const input = {
        title: 'Test Conversation',
      };

      // Mock shard type does not exist
      mockShardManagerClient.get.mockResolvedValueOnce([]);

      // Mock shard type creation
      mockShardManagerClient.post.mockResolvedValueOnce({
        id: 'shard-type-123',
        name: 'c_conversation',
      });

      // Mock shard creation
      mockShardManagerClient.post.mockResolvedValueOnce({
        id: 'conversation-123',
        tenantId,
        userId,
        shardTypeName: 'c_conversation',
        data: {
          title: input.title,
          status: 'active',
          messages: [],
        },
      });

      mockContainer.items.create.mockResolvedValue({
        resource: {
          id: 'conversation-123',
          tenantId,
          userId,
          title: input.title,
          status: 'active',
          messages: [],
        },
      });

      const result = await service.createConversation(tenantId, userId, input);

      expect(result).toHaveProperty('id');
      expect(mockShardManagerClient.post).toHaveBeenCalledTimes(2); // Create shard type + create shard
    });

    it('should handle errors during conversation creation', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const input = {
        title: 'Test Conversation',
      };

      mockShardManagerClient.get.mockRejectedValue(new Error('Service unavailable'));

      await expect(
        service.createConversation(tenantId, userId, input)
      ).rejects.toThrow();
    });
  });

  describe('sendMessage', () => {
    it('should send a message successfully', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const conversationId = 'conversation-123';
      const input = {
        content: 'Hello, how can you help?',
        role: 'user' as const,
      };

      // Mock existing conversation
      mockContainer.items.read.mockResolvedValue({
        resource: {
          id: conversationId,
          tenantId,
          userId,
          title: 'Test Conversation',
          status: 'active',
          messages: [],
          createdAt: new Date(),
        },
      });

      // Mock AI service response
      mockAiServiceClient.post.mockResolvedValue({
        content: 'I can help you with various tasks.',
        model: 'gpt-4',
        usage: { promptTokens: 10, completionTokens: 20 },
      });

      // Mock container replace
      mockContainer.items.replace.mockResolvedValue({
        resource: {
          id: conversationId,
          tenantId,
          messages: [
            {
              id: 'msg-1',
              role: 'user',
              content: input.content,
              status: 'completed',
            },
            {
              id: 'msg-2',
              role: 'assistant',
              content: 'I can help you with various tasks.',
              status: 'completed',
            },
          ],
        },
      });

      const result = await service.sendMessage(tenantId, userId, conversationId, input);

      expect(result).toHaveProperty('messages');
      expect(result.messages.length).toBeGreaterThan(0);
      expect(mockAiServiceClient.post).toHaveBeenCalled();
      expect(mockContainer.items.replace).toHaveBeenCalled();
    });

    it('should handle conversation not found', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const conversationId = 'non-existent';
      const input = {
        content: 'Hello',
        role: 'user' as const,
      };

      mockContainer.items.read.mockRejectedValue(new Error('Not found'));

      await expect(
        service.sendMessage(tenantId, userId, conversationId, input)
      ).rejects.toThrow();
    });
  });

  describe('getConversation', () => {
    it('should retrieve a conversation successfully', async () => {
      const tenantId = 'tenant-123';
      const conversationId = 'conversation-123';

      const mockConversation = {
        id: conversationId,
        tenantId,
        userId: 'user-123',
        title: 'Test Conversation',
        status: 'active',
        messages: [],
        createdAt: new Date(),
      };

      mockContainer.items.read.mockResolvedValue({
        resource: mockConversation,
      });

      const result = await service.getConversation(tenantId, conversationId);

      expect(result).toEqual(mockConversation);
      expect(mockContainer.items.read).toHaveBeenCalledWith(
        conversationId,
        { partitionKey: tenantId }
      );
    });

    it('should handle conversation not found', async () => {
      const tenantId = 'tenant-123';
      const conversationId = 'non-existent';

      mockContainer.items.read.mockRejectedValue(new Error('Not found'));

      await expect(
        service.getConversation(tenantId, conversationId)
      ).rejects.toThrow();
    });
  });

  describe('listConversations', () => {
    it('should list conversations successfully', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';

      const mockConversations = [
        {
          id: 'conv-1',
          tenantId,
          userId,
          title: 'Conversation 1',
          status: 'active',
        },
        {
          id: 'conv-2',
          tenantId,
          userId,
          title: 'Conversation 2',
          status: 'active',
        },
      ];

      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: mockConversations,
        }),
      });

      const result = await service.listConversations(tenantId, userId, {});

      expect(result).toHaveProperty('conversations');
      expect(result.conversations.length).toBe(2);
    });

    it('should handle pagination', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';

      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [],
        }),
      });

      const result = await service.listConversations(tenantId, userId, {
        limit: 10,
        offset: 0,
      });

      expect(result).toHaveProperty('conversations');
      expect(result.conversations).toEqual([]);
    });
  });
});
