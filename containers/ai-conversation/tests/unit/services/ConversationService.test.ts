/**
 * Conversation Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConversationService } from '../../../src/services/ConversationService';
import { getContainer } from '@coder/shared/database';

// Mock dependencies
vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(),
}));

const { mockShardManagerClient, mockAiServiceClient, mockContextServiceClient, mockEmbeddingsClient } = vi.hoisted(
  () => ({
    mockShardManagerClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
    mockAiServiceClient: { post: vi.fn() },
    mockContextServiceClient: { post: vi.fn() },
    mockEmbeddingsClient: { post: vi.fn() },
  })
);
vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn().mockImplementation(function (this: any, config: any) {
    if (config?.baseURL?.includes('shard-manager')) return mockShardManagerClient;
    if (config?.baseURL?.includes('ai-service')) return mockAiServiceClient;
    if (config?.baseURL?.includes('context-service')) return mockContextServiceClient;
    if (config?.baseURL?.includes('embeddings')) return mockEmbeddingsClient;
    return { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() };
  }),
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
  let mockContainer: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockContainer = {
      items: {
        create: vi.fn(),
        query: vi.fn(() => ({
          fetchAll: vi.fn(),
          fetchNext: vi.fn().mockResolvedValue({ resources: [] }),
        })),
        read: vi.fn(),
        replace: vi.fn(),
        delete: vi.fn(),
      },
      item: vi.fn(() => ({ read: vi.fn(), replace: vi.fn(), delete: vi.fn() })),
    };
    (getContainer as any).mockReturnValue(mockContainer);

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

      // Mock shard creation (service uses shard.id, shard.tenantId, shard.createdAt, shard.updatedAt)
      const now = new Date();
      mockShardManagerClient.post.mockResolvedValue({
        id: 'conversation-123',
        tenantId,
        createdAt: now,
        updatedAt: now,
      });

      const result = await service.createConversation(tenantId, userId, input);

      expect(result).toHaveProperty('id');
      expect(result.structuredData?.title).toBe(input.title);
      expect(result.structuredData?.status).toBe('active');
      expect(mockShardManagerClient.post).toHaveBeenCalled();
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

      const mockShard = {
        id: conversationId,
        tenantId,
        structuredData: {
          title: 'Test',
          status: 'active',
          messages: [],
          stats: { messageCount: 0, userMessageCount: 0, assistantMessageCount: 0 },
          lastActivityAt: new Date(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockShardManagerClient.get.mockResolvedValue(mockShard);
      mockShardManagerClient.put.mockResolvedValue({
        ...mockShard,
        structuredData: { ...mockShard.structuredData, messages: [input] },
      });
      mockAiServiceClient.post.mockResolvedValue({
        content: 'I can help.',
        model: 'gpt-4',
        usage: { promptTokens: 10, completionTokens: 20 },
      });

      const result = await service.sendMessage(conversationId, tenantId, userId, input);

      expect(result).toHaveProperty('content');
      expect(result.content).toBe(input.content);
      expect(mockShardManagerClient.put).toHaveBeenCalled();
    });

    it('should handle conversation not found', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const conversationId = 'non-existent';
      const input = { content: 'Hello', role: 'user' as const };

      mockShardManagerClient.get.mockRejectedValue(new Error('Not found'));

      await expect(
        service.sendMessage(conversationId, tenantId, userId, input)
      ).rejects.toThrow();
    });
  });

  describe('getConversation', () => {
    it('should retrieve a conversation successfully', async () => {
      const tenantId = 'tenant-123';
      const conversationId = 'conversation-123';

      const mockShard = {
        id: conversationId,
        tenantId,
        structuredData: { title: 'Test Conversation', status: 'active', messages: [] },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockShardManagerClient.get.mockResolvedValue(mockShard);

      const result = await service.getConversation(conversationId, tenantId);

      expect(result.id).toBe(conversationId);
      expect(result.tenantId).toBe(tenantId);
      expect(mockShardManagerClient.get).toHaveBeenCalled();
    });

    it('should handle conversation not found', async () => {
      const tenantId = 'tenant-123';
      const conversationId = 'non-existent';

      mockShardManagerClient.get.mockRejectedValue(new Error('Not found'));

      await expect(
        service.getConversation(conversationId, tenantId)
      ).rejects.toThrow();
    });
  });

  describe('listConversations', () => {
    it('should list conversations successfully', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';

      const mockShards = [
        {
          id: 'conv-1',
          tenantId,
          structuredData: { title: 'Conv 1', participants: [{ userId, isActive: true }] },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'conv-2',
          tenantId,
          structuredData: { title: 'Conv 2', participants: [{ userId, isActive: true }] },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockShardManagerClient.get.mockResolvedValue({ items: mockShards, total: 2 });

      const result = await service.listConversations(tenantId, userId, {});

      expect(result).toHaveProperty('conversations');
      expect(result.conversations.length).toBe(2);
    });

    it('should handle pagination', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';

      mockShardManagerClient.get.mockResolvedValue({ items: [], total: 0 });

      const result = await service.listConversations(tenantId, userId, { limit: 10 });

      expect(result).toHaveProperty('conversations');
      expect(result.conversations).toEqual([]);
    });
  });
});
