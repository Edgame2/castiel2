/**
 * Unit tests for Export Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExportService } from '../../../../src/services/export/ExportService';
import { SecretService } from '../../../../src/services/SecretService';

// Mock dependencies
vi.mock('../../../../src/services/SecretService');
vi.mock('@coder/shared', () => {
  return {
    getDatabaseClient: vi.fn(() => ({
      secret_secrets: {
        findMany: vi.fn(),
      },
    })),
  };
});

describe('ExportService', () => {
  let exportService: ExportService;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    exportService = new ExportService();
    mockDb = (exportService as any).db;
  });

  describe('exportSecrets', () => {
    it('should export secrets to JSON format', async () => {
      const mockSecrets = [
        {
          id: 'secret-1',
          name: 'secret-1',
          type: 'API_KEY',
          scope: 'ORGANIZATION',
        },
        {
          id: 'secret-2',
          name: 'secret-2',
          type: 'API_KEY',
          scope: 'ORGANIZATION',
        },
      ];
      
      mockDb.secret_secrets.findMany.mockResolvedValue(mockSecrets);
      
      const mockSecretService = (exportService as any).secretService;
      mockSecretService.getSecretValue = vi.fn()
        .mockResolvedValueOnce({ type: 'API_KEY', key: 'key-1' })
        .mockResolvedValueOnce({ type: 'API_KEY', key: 'key-2' });
      
      const result = await exportService.exportSecrets({
        organizationId: 'org-123',
      }, {
        userId: 'user-123',
        organizationId: 'org-123',
      });
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      const parsed = JSON.parse(result);
      expect(parsed.secrets).toHaveLength(2);
    });
  });
});


