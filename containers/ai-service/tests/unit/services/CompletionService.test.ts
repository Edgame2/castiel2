/**
 * Completion Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CompletionService } from '../../../src/services/CompletionService';

const { mockServiceClient, mockDb, mockOpenaiPost } = vi.hoisted(() => {
  const post = vi.fn().mockResolvedValue({
    choices: [{ message: { content: 'Hi there!' } }],
    usage: { total_tokens: 10 },
  });
  return {
    mockServiceClient: { post: vi.fn(), get: vi.fn() },
    mockOpenaiPost: post,
    mockDb: {
      ai_completions: {
        create: vi.fn().mockResolvedValue({ id: 'c1', createdAt: new Date() }),
        update: vi.fn().mockResolvedValue({}),
      },
    },
  };
});
vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn().mockImplementation(function (this: any) {
    return mockServiceClient;
  }),
  getDatabaseClient: vi.fn(() => mockDb),
  HttpClient: vi.fn().mockImplementation(function (this: any) {
    return { post: mockOpenaiPost, get: vi.fn() };
  }),
}));
vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    providers: {
      openai: { api_key: 'test-key' },
      anthropic: { api_key: 'test-key' },
    },
    services: {},
  })),
}));

describe('CompletionService', () => {
  let service: CompletionService;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';
    service = new CompletionService();
  });

  describe('complete', () => {
    it('should create a completion successfully', async () => {
      const input = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'gpt-4',
        organizationId: 'org-123',
        userId: 'user-123',
      };

      const result = await service.complete(input);

      expect(result).toHaveProperty('id');
      expect(result.choices).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      const input = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'gpt-4',
        organizationId: 'org-123',
        userId: 'user-123',
      };
      mockOpenaiPost.mockRejectedValueOnce(new Error('Provider error'));

      await expect(service.complete(input)).rejects.toThrow();
    });

    it('should throw when OPENAI API key not configured', async () => {
      delete process.env.OPENAI_API_KEY;
      const svc = new CompletionService();
      const input = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'gpt-4',
        organizationId: 'org-123',
        userId: 'user-123',
      };

      await expect(svc.complete(input)).rejects.toThrow('OpenAI API key not configured');
      process.env.OPENAI_API_KEY = 'test-key';
    });
  });
});
