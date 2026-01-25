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

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    database: {
      containers: {
        security_scans: 'security_scans',
        pii_detections: 'pii_detections',
      },
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

    mockScansContainer = {
      items: {
        create: vi.fn(),
        query: vi.fn(() => ({
          fetchAll: vi.fn(),
        })),
        read: vi.fn(),
      },
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
      if (name === 'pii_detections') {
        return mockPiiContainer;
      }
      return mockScansContainer;
    });

    service = new SecurityScanningService();
  });

  describe('scanForPII', () => {
    it('should detect PII successfully', async () => {
      const tenantId = 'tenant-123';
      const content = 'Contact John Doe at john.doe@example.com or call 555-1234';

      const mockDetection = {
        id: 'detection-123',
        tenantId,
        piiTypes: ['email', 'phone'],
        locations: [
          { type: 'email', value: 'john.doe@example.com', position: 20 },
          { type: 'phone', value: '555-1234', position: 50 },
        ],
        severity: 'high',
      };

      mockPiiContainer.items.create.mockResolvedValue({
        resource: mockDetection,
      });

      const result = await service.scanForPII(tenantId, content);

      expect(result).toHaveProperty('piiTypes');
      expect(result.piiTypes.length).toBeGreaterThan(0);
      expect(mockPiiContainer.items.create).toHaveBeenCalled();
    });

    it('should return empty when no PII detected', async () => {
      const tenantId = 'tenant-123';
      const content = 'This is a normal text without any sensitive information';

      const result = await service.scanForPII(tenantId, content);

      expect(result.piiTypes).toEqual([]);
    });
  });

  describe('scanForVulnerabilities', () => {
    it('should detect vulnerabilities successfully', async () => {
      const tenantId = 'tenant-123';
      const code = 'SELECT * FROM users WHERE id = ' + userId; // SQL injection example

      const mockScan = {
        id: 'scan-123',
        tenantId,
        vulnerabilities: [
          {
            type: 'sql_injection',
            severity: 'high',
            location: { line: 1, column: 30 },
            description: 'Potential SQL injection vulnerability',
          },
        ],
      };

      mockScansContainer.items.create.mockResolvedValue({
        resource: mockScan,
      });

      const result = await service.scanForVulnerabilities(tenantId, code);

      expect(result).toHaveProperty('vulnerabilities');
      expect(result.vulnerabilities.length).toBeGreaterThan(0);
      expect(mockScansContainer.items.create).toHaveBeenCalled();
    });
  });

  describe('redactPII', () => {
    it('should redact PII from content', async () => {
      const tenantId = 'tenant-123';
      const content = 'Contact John Doe at john.doe@example.com';

      const result = await service.redactPII(tenantId, content);

      expect(result).not.toContain('john.doe@example.com');
      expect(result).toContain('[REDACTED]');
    });
  });
});
