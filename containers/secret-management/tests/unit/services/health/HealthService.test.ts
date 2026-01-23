/**
 * Unit tests for Health Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HealthService } from '../../../../src/services/health/HealthService';
import { BackendFactory } from '../../../../src/services/backends/BackendFactory';
import { VaultService } from '../../../../src/services/VaultService';

// Mock dependencies
vi.mock('../../../../src/services/backends/BackendFactory');
vi.mock('../../../../src/services/VaultService');
vi.mock('@coder/shared', () => {
  return {
    getDatabaseClient: vi.fn(() => ({
      $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
      secret_secrets: {
        count: vi.fn().mockResolvedValue(10),
      },
    })),
  };
});

describe('HealthService', () => {
  let healthService: HealthService;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    healthService = new HealthService();
    mockDb = (healthService as any).db;
  });

  describe('getHealthStatus', () => {
    it('should return healthy status when all checks pass', async () => {
      const mockBackend = {
        healthCheck: vi.fn().mockResolvedValue({
          status: 'healthy',
          latencyMs: 10,
        }),
      };
      (BackendFactory.createBackend as any).mockResolvedValue(mockBackend);
      
      const mockVaultService = (healthService as any).vaultService;
      mockVaultService.listVaults = vi.fn().mockResolvedValue([
        {
          id: 'vault-1',
          backend: 'LOCAL_ENCRYPTED',
        },
      ]);
      
      const result = await healthService.getHealthStatus();
      
      expect(result.status).toBe('healthy');
      expect(result.database).toBe('healthy');
    });

    it('should return unhealthy status when database is down', async () => {
      mockDb.$queryRaw.mockRejectedValue(new Error('Connection failed'));
      
      const result = await healthService.getHealthStatus();
      
      expect(result.status).toBe('unhealthy');
      expect(result.database).toBe('unhealthy');
    });
  });
});


