/**
 * ConfigurationService Unit Tests
 * Per ModuleImplementationGuide Section 12: Testing Requirements
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigurationService } from '../../../src/services/ConfigurationService';

// Mock config
vi.mock('../../../src/config', () => ({
  getConfig: vi.fn().mockReturnValue({
    defaults: {
      capture: {
        ip_address: true,
        user_agent: true,
        geolocation: false,
      },
      redaction: {
        enabled: true,
        patterns: [],
      },
      hash_chain: {
        enabled: true,
      },
      alerts: {
        enabled: true,
      },
    },
  }),
}));

// Mock logger
vi.mock('../../../src/utils/logger', () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ConfigurationService', () => {
  let configService: ConfigurationService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      audit_configurations: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };

    configService = new ConfigurationService(mockPrisma);
    configService.clearCache(); // Clear cache between tests
  });

  describe('getOrganizationConfig', () => {
    it('should retrieve organization configuration', async () => {
      const mockConfig = {
        id: 'config-1',
        organizationId: 'org-1',
        captureIpAddress: true,
        captureUserAgent: true,
        captureGeolocation: false,
        redactSensitiveData: true,
        redactionPatterns: [],
        hashChainEnabled: true,
        alertsEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockPrisma.audit_configurations.findFirst).mockResolvedValue(mockConfig);

      const result = await configService.getOrganizationConfig('org-1');

      expect(result).toBeDefined();
      expect(result?.organizationId).toBe('org-1');
      expect(result?.captureIpAddress).toBe(true);
    });

    it('should return null if no configuration exists', async () => {
      vi.mocked(mockPrisma.audit_configurations.findFirst).mockResolvedValue(null);

      const result = await configService.getOrganizationConfig('org-1');

      expect(result).toBeNull();
    });
    
    it('should cache configuration', async () => {
      const mockConfig = {
        id: 'config-1',
        organizationId: 'org-1',
        captureIpAddress: true,
        captureUserAgent: true,
        captureGeolocation: false,
        redactSensitiveData: true,
        redactionPatterns: [],
        hashChainEnabled: true,
        alertsEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockPrisma.audit_configurations.findFirst).mockResolvedValue(mockConfig);

      // First call
      await configService.getOrganizationConfig('org-1');
      // Second call (should use cache)
      await configService.getOrganizationConfig('org-1');

      // Should only query database once
      expect(mockPrisma.audit_configurations.findFirst).toHaveBeenCalledTimes(1);
    });
  });

  describe('upsertOrganizationConfig', () => {
    it('should create organization configuration when none exists', async () => {
      const updates = {
        captureIpAddress: false,
        redactSensitiveData: false,
      };

      vi.mocked(mockPrisma.audit_configurations.findFirst).mockResolvedValue(null);
      
      const mockConfig = {
        id: 'config-1',
        organizationId: 'org-1',
        captureIpAddress: false,
        captureUserAgent: true,
        captureGeolocation: false,
        redactSensitiveData: false,
        redactionPatterns: [],
        hashChainEnabled: true,
        alertsEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockPrisma.audit_configurations.create).mockResolvedValue(mockConfig);

      const result = await configService.upsertOrganizationConfig('org-1', updates);

      expect(result).toBeDefined();
      expect(result.captureIpAddress).toBe(false);
      expect(mockPrisma.audit_configurations.create).toHaveBeenCalled();
    });
    
    it('should update organization configuration when one exists', async () => {
      const existingConfig = {
        id: 'config-1',
        organizationId: 'org-1',
        captureIpAddress: true,
        captureUserAgent: true,
        captureGeolocation: false,
        redactSensitiveData: true,
        redactionPatterns: [],
        hashChainEnabled: true,
        alertsEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockPrisma.audit_configurations.findFirst).mockResolvedValue(existingConfig);
      
      const updatedConfig = {
        ...existingConfig,
        captureIpAddress: false,
      };

      vi.mocked(mockPrisma.audit_configurations.update).mockResolvedValue(updatedConfig);

      const result = await configService.upsertOrganizationConfig('org-1', { captureIpAddress: false });

      expect(result).toBeDefined();
      expect(result.captureIpAddress).toBe(false);
      expect(mockPrisma.audit_configurations.update).toHaveBeenCalled();
    });
  });

  describe('deleteOrganizationConfig', () => {
    it('should delete organization configuration', async () => {
      vi.mocked(mockPrisma.audit_configurations.delete).mockResolvedValue({});

      await configService.deleteOrganizationConfig('org-1');

      expect(mockPrisma.audit_configurations.delete).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
      });
    });
  });
  
  describe('clearCache', () => {
    it('should clear the cache', async () => {
      const mockConfig = {
        id: 'config-1',
        organizationId: 'org-1',
        captureIpAddress: true,
        captureUserAgent: true,
        captureGeolocation: false,
        redactSensitiveData: true,
        redactionPatterns: [],
        hashChainEnabled: true,
        alertsEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockPrisma.audit_configurations.findFirst).mockResolvedValue(mockConfig);

      // First call (caches)
      await configService.getOrganizationConfig('org-1');
      
      // Clear cache
      configService.clearCache();
      
      // Second call (should query database again)
      await configService.getOrganizationConfig('org-1');

      expect(mockPrisma.audit_configurations.findFirst).toHaveBeenCalledTimes(2);
    });
  });
});
