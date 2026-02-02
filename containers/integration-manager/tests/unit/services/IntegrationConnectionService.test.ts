/**
 * Integration Connection Service unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IntegrationConnectionService } from '../../../src/services/IntegrationConnectionService';

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    services: {
      secret_management: { url: 'http://secret-management' },
    },
  })),
}));

vi.mock('@coder/shared', () => {
  function MockServiceClient(this: any) {
    this.get = vi.fn().mockResolvedValue({ data: {} });
    this.post = vi.fn().mockResolvedValue({ data: {} });
  }
  return {
    ServiceClient: MockServiceClient,
    getContainer: vi.fn(),
    BadRequestError: class BadRequestError extends Error { constructor(m: string) { super(m); this.name = 'BadRequestError'; } },
    NotFoundError: class NotFoundError extends Error { constructor(_e: string, _i: string) { super('Not found'); this.name = 'NotFoundError'; } },
    generateServiceToken: vi.fn(() => 'token'),
  };
});

describe('IntegrationConnectionService', () => {
  it('should throw when secret_management url not configured', async () => {
    const { loadConfig } = await import('../../../src/config');
    vi.mocked(loadConfig).mockReturnValueOnce({ services: {} } as any);
    expect(() => new IntegrationConnectionService()).toThrow(/Secret management service URL must be configured/);
  });

  describe('when configured', () => {
    let service: IntegrationConnectionService;

    beforeEach(() => {
      vi.clearAllMocks();
      vi.doMock('../../../src/config', () => ({
        loadConfig: vi.fn(() => ({
          services: { secret_management: { url: 'http://secret-management' } },
        })),
      }));
      service = new IntegrationConnectionService();
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });
});
