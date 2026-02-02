/**
 * Integration Catalog Service unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IntegrationCatalogService } from '../../../src/services/IntegrationCatalogService';

const mockCreateCatalogEntry = vi.fn();
const mockGetCatalogEntryByIntegrationId = vi.fn();
const mockListCatalogEntries = vi.fn();
const mockUpdateCatalogEntry = vi.fn();
const mockDeleteCatalogEntry = vi.fn();
const mockGetCatalogEntriesByCategory = vi.fn();
const mockCreateVisibilityRule = vi.fn();
const mockGetVisibilityRuleByTenantAndIntegration = vi.fn();
const mockUpdateVisibilityRule = vi.fn();
const mockApproveIntegrationForTenant = vi.fn();
const mockDenyIntegrationForTenant = vi.fn();
const mockListVisibilityRulesForIntegration = vi.fn();
const mockListVisibilityRulesForTenant = vi.fn();
const mockDeprecateCatalogEntry = vi.fn();

vi.mock('../../../src/repositories/IntegrationCatalogRepository', () => ({
  IntegrationCatalogRepository: vi.fn().mockImplementation(function (this: any) {
    this.createCatalogEntry = mockCreateCatalogEntry;
    this.getCatalogEntryByIntegrationId = mockGetCatalogEntryByIntegrationId;
    this.listCatalogEntries = mockListCatalogEntries;
    this.updateCatalogEntry = mockUpdateCatalogEntry;
    this.deleteCatalogEntry = mockDeleteCatalogEntry;
    this.getCatalogEntriesByCategory = mockGetCatalogEntriesByCategory;
    this.createVisibilityRule = mockCreateVisibilityRule;
    this.getVisibilityRuleByTenantAndIntegration = mockGetVisibilityRuleByTenantAndIntegration;
    this.updateVisibilityRule = mockUpdateVisibilityRule;
    this.approveIntegrationForTenant = mockApproveIntegrationForTenant;
    this.denyIntegrationForTenant = mockDenyIntegrationForTenant;
    this.listVisibilityRulesForIntegration = mockListVisibilityRulesForIntegration;
    this.listVisibilityRulesForTenant = mockListVisibilityRulesForTenant;
    this.deprecateCatalogEntry = mockDeprecateCatalogEntry;
  }),
}));

describe('IntegrationCatalogService', () => {
  let service: IntegrationCatalogService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new IntegrationCatalogService();
  });

  describe('createIntegration', () => {
    it('should validate shard mappings and delegate to repository', async () => {
      const entry = { id: 'cat-1', category: 'crm', provider: 'salesforce', name: 'Salesforce' };
      mockCreateCatalogEntry.mockResolvedValue(entry);
      const input = {
        category: 'crm',
        provider: 'salesforce',
        name: 'Salesforce',
        shardMappings: [{ integrationEntity: 'Account', supportedShardTypes: ['c_account'], defaultShardType: 'c_account', bidirectionalSync: false }],
      };
      const result = await service.createIntegration(input);
      expect(mockCreateCatalogEntry).toHaveBeenCalledWith(input);
      expect(result).toEqual(entry);
    });

    it('should throw when shard mapping has no supported shard types', async () => {
      const input = {
        category: 'crm',
        provider: 'salesforce',
        name: 'Salesforce',
        shardMappings: [{ integrationEntity: 'Account', supportedShardTypes: [], defaultShardType: 'c_account', bidirectionalSync: false }],
      };
      await expect(service.createIntegration(input)).rejects.toThrow(/at least one supported shard type/);
    });

    it('should throw when default shard type not in supported', async () => {
      const input = {
        category: 'crm',
        provider: 'salesforce',
        name: 'Salesforce',
        shardMappings: [{ integrationEntity: 'Account', supportedShardTypes: ['c_account'], defaultShardType: 'other', bidirectionalSync: false }],
      };
      await expect(service.createIntegration(input)).rejects.toThrow(/default shard type.*not in supported/);
    });
  });

  describe('getIntegration', () => {
    it('should delegate to repository', async () => {
      mockGetCatalogEntryByIntegrationId.mockResolvedValue({ id: 'int-1' });
      const result = await service.getIntegration('int-1');
      expect(mockGetCatalogEntryByIntegrationId).toHaveBeenCalledWith('int-1');
      expect(result).toEqual({ id: 'int-1' });
    });

    it('should return null when not found', async () => {
      mockGetCatalogEntryByIntegrationId.mockResolvedValue(null);
      expect(await service.getIntegration('missing')).toBeNull();
    });
  });

  describe('listIntegrations', () => {
    it('should delegate to repository', async () => {
      mockListCatalogEntries.mockResolvedValue({ entries: [], total: 0 });
      const result = await service.listIntegrations();
      expect(mockListCatalogEntries).toHaveBeenCalledWith(undefined);
      expect(result).toEqual({ entries: [], total: 0 });
    });
  });

  describe('updateIntegration', () => {
    it('should throw when integration not found', async () => {
      mockGetCatalogEntryByIntegrationId.mockResolvedValue(null);
      await expect(service.updateIntegration('missing', { name: 'New' })).rejects.toThrow(/Integration not found/);
    });

    it('should delegate when integration exists', async () => {
      const existing = { id: 'e1', category: 'crm', name: 'Old' };
      mockGetCatalogEntryByIntegrationId.mockResolvedValue(existing);
      mockUpdateCatalogEntry.mockResolvedValue({ ...existing, name: 'New' });
      const result = await service.updateIntegration('int-1', { name: 'New' });
      expect(mockUpdateCatalogEntry).toHaveBeenCalled();
      expect(result?.name).toBe('New');
    });
  });

  describe('deleteIntegration', () => {
    it('should throw when integration not found', async () => {
      mockGetCatalogEntryByIntegrationId.mockResolvedValue(null);
      await expect(service.deleteIntegration('missing')).rejects.toThrow(/Integration not found/);
    });

    it('should delegate when integration exists', async () => {
      const existing = { id: 'e1', category: 'crm' };
      mockGetCatalogEntryByIntegrationId.mockResolvedValue(existing);
      mockDeleteCatalogEntry.mockResolvedValue(true);
      const result = await service.deleteIntegration('int-1');
      expect(result).toBe(true);
    });
  });

  describe('getIntegrationsByCategory', () => {
    it('should delegate to repository', async () => {
      mockGetCatalogEntriesByCategory.mockResolvedValue([]);
      await service.getIntegrationsByCategory('crm');
      expect(mockGetCatalogEntriesByCategory).toHaveBeenCalledWith('crm');
    });
  });

  describe('getPremiumIntegrations', () => {
    it('should list with enterprise filter', async () => {
      mockListCatalogEntries.mockResolvedValue({ entries: [], total: 0 });
      await service.getPremiumIntegrations();
      expect(mockListCatalogEntries).toHaveBeenCalledWith({ filter: { requiredPlan: 'enterprise' } });
    });
  });
});
