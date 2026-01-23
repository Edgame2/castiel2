/**
 * Unit tests for Import Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImportService } from '../../../../src/services/import/ImportService';
import { SecretService } from '../../../../src/services/SecretService';

// Mock dependencies
vi.mock('../../../../src/services/SecretService');
vi.mock('@coder/shared', () => {
  return {
    getDatabaseClient: vi.fn(() => ({
      secret_secrets: {
        create: vi.fn(),
      },
    })),
  };
});

describe('ImportService', () => {
  let importService: ImportService;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    importService = new ImportService();
    mockDb = (importService as any).db;
  });

  describe('importSecrets', () => {
    it('should import secrets from JSON format', async () => {
      const importData = {
        secrets: [
          {
            name: 'secret-1',
            type: 'API_KEY',
            value: { type: 'API_KEY', key: 'test-key' },
            scope: 'ORGANIZATION',
            organizationId: 'org-123',
          },
        ],
      };
      
      const mockSecretService = (importService as any).secretService;
      mockSecretService.createSecret = vi.fn().mockResolvedValue({
        id: 'secret-1',
        name: 'secret-1',
      });
      
      const result = await importService.importSecrets(
        JSON.stringify(importData),
        {
          userId: 'user-123',
          organizationId: 'org-123',
        }
      );
      
      expect(result.imported).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should handle import errors gracefully', async () => {
      const importData = {
        secrets: [
          {
            name: 'secret-1',
            type: 'API_KEY',
            value: { type: 'API_KEY', key: 'test-key' },
            scope: 'ORGANIZATION',
          },
        ],
      };
      
      const mockSecretService = (importService as any).secretService;
      mockSecretService.createSecret = vi.fn().mockRejectedValue(
        new Error('Import failed')
      );
      
      const result = await importService.importSecrets(
        JSON.stringify(importData),
        {
          userId: 'user-123',
        }
      );
      
      expect(result.imported).toBe(0);
      expect(result.failed).toBe(1);
    });
  });
});


