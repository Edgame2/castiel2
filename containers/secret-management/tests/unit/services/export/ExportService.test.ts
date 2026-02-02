/**
 * Unit tests for Export Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExportService } from '../../../../src/services/export/ExportService';

vi.mock('../../../../src/services/SecretService');
vi.mock('../../../../src/services/events/SecretEventPublisher', () => ({
  publishSecretEvent: vi.fn().mockResolvedValue(undefined),
  SecretEvents: {
    secretsExported: (d: Record<string, unknown>) => ({ type: 'secret.secrets.exported', ...d }),
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

describe('ExportService', () => {
  let exportService: ExportService;

  beforeEach(() => {
    vi.clearAllMocks();
    exportService = new ExportService();
  });

  describe('exportToJson', () => {
    it('should export secrets to JSON format', async () => {
      const mockSecrets = [
        {
          id: 'secret-1',
          name: 'secret-1',
          type: 'API_KEY',
          scope: 'ORGANIZATION',
          description: null,
          tags: [],
          metadata: null,
          createdAt: new Date(),
        },
        {
          id: 'secret-2',
          name: 'secret-2',
          type: 'API_KEY',
          scope: 'ORGANIZATION',
          description: null,
          tags: [],
          metadata: null,
          createdAt: new Date(),
        },
      ];
      const mockSecretService = (exportService as any).secretService;
      mockSecretService.listSecrets = vi.fn().mockResolvedValue(mockSecrets);
      mockSecretService.getSecretValue = vi.fn()
        .mockResolvedValueOnce({ type: 'API_KEY', key: 'key-1' })
        .mockResolvedValueOnce({ type: 'API_KEY', key: 'key-2' });

      const result = await exportService.exportToJson(
        { organizationId: 'org-123', includeValues: true },
        { userId: 'user-123', organizationId: 'org-123', consumerModule: 'test' }
      );

      expect(result).toBeDefined();
      expect(result.format).toBe('json');
      expect(result.secretCount).toBe(2);
      const parsed = JSON.parse(result.data);
      expect(parsed).toHaveLength(2);
    });
  });
});


