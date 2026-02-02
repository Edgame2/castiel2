/**
 * Security Scanning Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SecurityScanningService } from '../../../src/services/SecurityScanningService';
import { getContainer } from '@coder/shared/database';

// Mock dependencies
vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(),
}));

const mockServiceClient = vi.hoisted(() => vi.fn());
vi.mock('@coder/shared', () => ({
  ServiceClient: mockServiceClient,
}));

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    database: {
      containers: {
        security_scans: 'security_scans',
        pii_detections: 'pii_detections',
      },
    },
    services: {
      auth: { url: 'http://auth:3000' },
      secret_management: { url: 'http://secret-management:3000' },
      shard_manager: { url: 'http://shard-manager:3000' },
    },
  })),
}));

vi.mock('../../../src/utils/logger', () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('SecurityScanningService', () => {
  let service: SecurityScanningService;
  let mockScansContainer: any;
  let mockPiiContainer: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockServiceClient.mockImplementation(function (this: any) {
      return this ?? {};
    });

    mockScansContainer = {
      items: {
        create: vi.fn(),
        query: vi.fn(() => ({
          fetchAll: vi.fn(),
        })),
        read: vi.fn(),
      },
      item: vi.fn().mockReturnValue({ replace: vi.fn().mockResolvedValue(undefined) }),
    };

    mockPiiContainer = {
      items: {
        create: vi.fn(),
        query: vi.fn(() => ({
          fetchAll: vi.fn(),
        })),
      },
    };

    (getContainer as any).mockImplementation((name: string) => {
      if (name === 'security_scans') {
        return mockScansContainer;
      }
      if (name === 'security_pii_detections' || name === 'pii_detections') {
        return mockPiiContainer;
      }
      return mockScansContainer;
    });

    service = new SecurityScanningService();
  });

  describe('detectPII', () => {
    it('should detect PII successfully', async () => {
      const tenantId = 'tenant-123';
      const contentId = 'content-1';
      const content = 'Contact John Doe at john.doe@example.com or call 555-123-4567';

      mockPiiContainer.items.create.mockImplementation((detection: any) =>
        Promise.resolve({ resource: detection })
      );

      const result = await service.detectPII(tenantId, contentId, content);

      expect(result).toHaveProperty('detectedPII');
      expect(result.detectedPII.length).toBeGreaterThan(0);
      expect(result.detectionId).toBeDefined();
      expect(mockPiiContainer.items.create).toHaveBeenCalled();
    });

    it('should return empty when no PII detected', async () => {
      const tenantId = 'tenant-123';
      const contentId = 'content-1';
      const content = 'This is a normal text without any sensitive information';

      mockPiiContainer.items.create.mockImplementation((detection: any) =>
        Promise.resolve({ resource: detection })
      );

      const result = await service.detectPII(tenantId, contentId, content);

      expect(result.detectedPII).toEqual([]);
    });
  });

  describe('scanSecurity', () => {
    it('should run vulnerability scan and store scan', async () => {
      const tenantId = 'tenant-123';
      const targetId = 'doc-1';
      const targetType = 'document' as const;

      mockScansContainer.items.create.mockImplementation((scan: any) =>
        Promise.resolve({ resource: scan })
      );

      const result = await service.scanSecurity(
        tenantId,
        targetId,
        targetType,
        'vulnerability'
      );

      expect(result).toHaveProperty('findings');
      expect(result.scanId).toBeDefined();
      expect(result.status).toBe('completed');
      expect(mockScansContainer.items.create).toHaveBeenCalled();
    });
  });

  describe('redactPII', () => {
    it('should redact PII from content', async () => {
      const tenantId = 'tenant-123';
      const contentId = 'content-1';
      const content = 'Contact John Doe at john.doe@example.com';

      const result = await service.redactPII(tenantId, contentId, content);

      expect(result).not.toContain('john.doe@example.com');
      expect(result).toContain('***@');
    });
  });
});
