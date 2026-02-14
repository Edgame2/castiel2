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
  let mockCosmosConfig: any;

  beforeEach(() => {
    mockCosmosConfig = {
      findFirst: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    };

    configService = new ConfigurationService(mockCosmosConfig);
    configService.clearCache(); // Clear cache between tests
  });

  describe('getOrganizationConfig', () => {
    it('should retrieve tenant configuration', async () => {
      const mockConfig = {
        id: 'config-1',
        tenantId: 'org-1',
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

      vi.mocked(mockCosmosConfig.findFirst).mockResolvedValue(mockConfig);

      const result = await configService.getOrganizationConfig('org-1');

      expect(result).toBeDefined();
      expect(result?.tenantId).toBe('org-1');
      expect(result?.captureIpAddress).toBe(true);
    });

    it('should return null if no configuration exists', async () => {
      vi.mocked(mockCosmosConfig.findFirst).mockResolvedValue(null);

      const result = await configService.getOrganizationConfig('org-1');

      expect(result).toBeNull();
    });

    it('should fall back to global config when no org-specific config exists', async () => {
      const globalConfig = {
        id: 'global-1',
        tenantId: null,
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
      vi.mocked(mockCosmosConfig.findFirst)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(globalConfig);

      const result = await configService.getOrganizationConfig('org-1');

      expect(result).toBeDefined();
      expect(result?.tenantId == null).toBe(true); // global config has null/undefined org
      expect(result?.captureIpAddress).toBe(true);
      expect(mockCosmosConfig.findFirst).toHaveBeenCalledWith({
        where: { tenantId: 'org-1' },
      });
      expect(mockCosmosConfig.findFirst).toHaveBeenCalledWith({
        where: { tenantId: null },
      });
    });
    
    it('should cache configuration', async () => {
      const mockConfig = {
        id: 'config-1',
        tenantId: 'org-1',
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

      vi.mocked(mockCosmosConfig.findFirst).mockResolvedValue(mockConfig);

      // First call
      await configService.getOrganizationConfig('org-1');
      // Second call (should use cache)
      await configService.getOrganizationConfig('org-1');

      // Should only query database once
      expect(mockCosmosConfig.findFirst).toHaveBeenCalledTimes(1);
    });
  });

  describe('upsertOrganizationConfig', () => {
    it('should create tenant configuration when none exists', async () => {
      const updates = {
        captureIpAddress: false,
        redactSensitiveData: false,
      };

      vi.mocked(mockCosmosConfig.findFirst).mockResolvedValue(null);
      
      const mockConfig = {
        id: 'config-1',
        tenantId: 'org-1',
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

      vi.mocked(mockCosmosConfig.upsert).mockResolvedValue(mockConfig);

      const result = await configService.upsertOrganizationConfig('org-1', updates);

      expect(result).toBeDefined();
      expect(result.captureIpAddress).toBe(false);
      expect(mockCosmosConfig.upsert).toHaveBeenCalled();
    });
    
    it('should update tenant configuration when one exists', async () => {
      const existingConfig = {
        id: 'config-1',
        tenantId: 'org-1',
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

      vi.mocked(mockCosmosConfig.findFirst).mockResolvedValue(existingConfig);
      
      const updatedConfig = {
        ...existingConfig,
        captureIpAddress: false,
      };

      vi.mocked(mockCosmosConfig.upsert).mockResolvedValue(updatedConfig);

      const result = await configService.upsertOrganizationConfig('org-1', { captureIpAddress: false });

      expect(result).toBeDefined();
      expect(result.captureIpAddress).toBe(false);
      expect(mockCosmosConfig.upsert).toHaveBeenCalled();
    });
  });

  describe('deleteOrganizationConfig', () => {
    it('should delete tenant configuration', async () => {
      vi.mocked(mockCosmosConfig.delete).mockResolvedValue(undefined);

      await configService.deleteOrganizationConfig('org-1');

      expect(mockCosmosConfig.delete).toHaveBeenCalledWith({
        where: { tenantId: 'org-1' },
      });
    });
  });
  
  describe('clearCache', () => {
    it('should clear the cache', async () => {
      const mockConfig = {
        id: 'config-1',
        tenantId: 'org-1',
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

      vi.mocked(mockCosmosConfig.findFirst).mockResolvedValue(mockConfig);

      // First call (caches)
      await configService.getOrganizationConfig('org-1');
      
      // Clear cache
      configService.clearCache();
      
      // Second call (should query database again)
      await configService.getOrganizationConfig('org-1');

      expect(mockCosmosConfig.findFirst).toHaveBeenCalledTimes(2);
    });
  });
});
