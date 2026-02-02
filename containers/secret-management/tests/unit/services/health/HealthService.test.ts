/**
 * Unit tests for Health Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HealthService } from '../../../../src/services/health/HealthService';

const mockDb = {
  $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
};

vi.mock('@coder/shared', () => ({
  getDatabaseClient: vi.fn(() => mockDb),
}));
vi.mock('../../../../src/services/encryption/KeyManager', () => ({
  KeyManager: vi.fn().mockImplementation(() => ({
    getActiveKey: vi.fn().mockResolvedValue({ keyId: 'key-1' }),
  })),
}));
vi.mock('../../../../src/services/logging/LoggingClient', () => ({
  getLoggingClient: vi.fn(() => ({ sendLog: vi.fn().mockResolvedValue(undefined) })),
}));
vi.mock('../../../../src/config', () => ({
  getConfig: vi.fn(() => ({
    services: { logging: { url: 'http://localhost:3000' } },
    logging: { serviceUrl: 'http://localhost:3000' },
  })),
}));

describe('HealthService', () => {
  let healthService: HealthService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    healthService = new HealthService();
  });

  describe('checkHealth', () => {
    it('should return healthy status when all checks pass', async () => {
      const result = await healthService.checkHealth();

      expect(result.status).toBe('healthy');
      expect(result.checks.database.status).toBe('healthy');
    });

    it('should return unhealthy status when database is down', async () => {
      mockDb.$queryRaw.mockRejectedValue(new Error('Connection failed'));

      const result = await healthService.checkHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.checks.database.status).toBe('unhealthy');
    });
  });
});


