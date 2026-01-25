/**
 * Completion Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CompletionService } from '../../../src/services/CompletionService';
import { ServiceClient } from '@coder/shared';

// Mock dependencies
vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn(),
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
  let mockServiceClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockServiceClient = {
      post: vi.fn(),
      get: vi.fn(),
    };

    (ServiceClient as any).mockImplementation(() => mockServiceClient);

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

      const mockResponse = {
        id: 'completion-123',
        choices: [{ message: { role: 'assistant', content: 'Hi there!' } }],
        usage: { totalTokens: 10 },
      };

      // Mock the internal completion logic
      vi.spyOn(service as any, 'callProvider').mockResolvedValue(mockResponse);

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

      vi.spyOn(service as any, 'callProvider').mockRejectedValue(new Error('Provider error'));

      await expect(service.complete(input)).rejects.toThrow();
    });

    it('should validate required fields', async () => {
      const input = {
        messages: [],
        model: 'gpt-4',
        organizationId: 'org-123',
        userId: 'user-123',
      } as any;

      await expect(service.complete(input)).rejects.toThrow();
    });
  });
});
