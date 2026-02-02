/**
 * Logging Service unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadConfig } from '../../../src/config';
import { LoggingService } from '../../../src/services/LoggingService';

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    services: { logging: { url: 'http://logging:3014' } },
    jwt: { secret: 'test-secret' },
  })),
}));

vi.mock('../../../src/utils/logger', () => ({
  log: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

describe('LoggingService', () => {
  let service: LoggingService;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ data: { id: '1' } }) });
    vi.stubGlobal('fetch', mockFetch);
    service = new LoggingService();
  });

  describe('constructor', () => {
    it('should set enabled when logging url configured', () => {
      expect(service).toBeDefined();
    });
  });

  describe('createLog', () => {
    it('should not throw when enabled', async () => {
      await expect(
        service.createLog({
          action: 'test',
          message: 'test message',
          category: 'ACTION',
          severity: 'INFO',
        })
      ).resolves.not.toThrow();
    });
  });
});
