/**
 * Unit tests for Import Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImportService } from '../../../../src/services/import/ImportService';

vi.mock('../../../../src/services/SecretService');
vi.mock('../../../../src/services/events/SecretEventPublisher', () => ({
  publishSecretEvent: vi.fn().mockResolvedValue(undefined),
  SecretEvents: {
    secretsImported: (d: Record<string, unknown>) => ({ type: 'secret.secrets.imported', ...d }),
  },
}));
vi.mock('../../../../src/services/logging/LoggingClient', () => ({
  getLoggingClient: vi.fn(() => ({ sendLog: vi.fn().mockResolvedValue(undefined) })),
}));
vi.mock('../../../../src/services/AuditService', () => ({
  AuditService: vi.fn().mockImplementation(() => ({
    log: vi.fn().mockResolvedValue(undefined),
  })),
}));
vi.mock('@coder/shared', () => ({
  getDatabaseClient: vi.fn(() => ({})),
}));

describe('ImportService', () => {
  let importService: ImportService;

  beforeEach(() => {
    vi.clearAllMocks();
    importService = new ImportService();
  });

  describe('importFromJson', () => {
    it('should import secrets from JSON format', async () => {
      const importData = [
        {
          name: 'secret-1',
          type: 'API_KEY',
          value: { type: 'API_KEY', key: 'test-key' },
        },
      ];
      const mockSecretService = (importService as any).secretService;
      mockSecretService.createSecret = vi.fn().mockResolvedValue({
        id: 'secret-1',
        name: 'secret-1',
      });

      const result = await importService.importFromJson(
        JSON.stringify(importData),
        { scope: 'ORGANIZATION', organizationId: 'org-123' },
        { userId: 'user-123', organizationId: 'org-123', consumerModule: 'test' }
      );

      expect(result.imported).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle import errors gracefully', async () => {
      const importData = [
        {
          name: 'secret-1',
          type: 'API_KEY',
          value: { type: 'API_KEY', key: 'test-key' },
        },
      ];
      const mockSecretService = (importService as any).secretService;
      mockSecretService.createSecret = vi.fn().mockRejectedValue(new Error('Import failed'));

      const result = await importService.importFromJson(
        JSON.stringify(importData),
        { scope: 'ORGANIZATION' },
        { userId: 'user-123', consumerModule: 'test' }
      );

      expect(result.imported).toBe(0);
      expect(result.errors).toHaveLength(1);
    });
  });
});


