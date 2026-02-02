/**
 * ApiKeyService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getContainer } from '@coder/shared';
import { listApiKeys, createApiKey } from '../../../src/services/ApiKeyService';

vi.mock('@coder/shared', () => ({
  getContainer: vi.fn(),
}));

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    cosmos_db: { containers: { api_keys: 'user_api_keys' } },
  })),
}));

describe('ApiKeyService', () => {
  let mockContainer: {
    items: {
      query: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockContainer = {
      items: {
        query: vi.fn().mockReturnValue({
          fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
        }),
        create: vi.fn().mockResolvedValue(undefined),
      },
    };
    (getContainer as ReturnType<typeof vi.fn>).mockReturnValue(mockContainer);
  });

  describe('listApiKeys', () => {
    it('returns api key summaries for organization', async () => {
      mockContainer.items.query = vi.fn().mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              id: 'apikey_1',
              name: 'Key One',
              organizationId: 'org-1',
              createdAt: '2025-01-01T00:00:00.000Z',
            },
          ],
        }),
      });

      const result = await listApiKeys('org-1');

      expect(getContainer).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('apikey_1');
      expect(result[0].name).toBe('Key One');
    });
  });

  describe('createApiKey', () => {
    it('creates api key and returns raw key once', async () => {
      const result = await createApiKey('org-1', { name: 'New Key' }, 'user-1');

      expect(mockContainer.items.create).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.name).toBe('New Key');
      expect(result.key).toBeDefined();
      expect(result.id).toBeDefined();
    });
  });
});
