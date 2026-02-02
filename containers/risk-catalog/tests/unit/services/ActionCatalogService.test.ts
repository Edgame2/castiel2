/**
 * Unit tests for ActionCatalogService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActionCatalogService } from '../../../src/services/ActionCatalogService';
import { log } from '../../../src/utils/logger';

const mockGet = vi.fn().mockImplementation((url: string) => {
  if (url?.includes('shard-types')) return Promise.resolve([]);
  return Promise.resolve({ items: [] });
});

vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn().mockImplementation(function (this: { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> }) {
    this.get = mockGet;
    this.post = vi.fn().mockResolvedValue({});
    this.put = vi.fn().mockResolvedValue({});
    this.delete = vi.fn().mockResolvedValue(undefined);
    return this;
  }),
  generateServiceToken: vi.fn(() => 'mock-token'),
  EventPublisher: vi.fn().mockImplementation(function (this: { publish: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> }) {
    this.publish = vi.fn().mockResolvedValue(undefined);
    this.close = vi.fn();
    return this;
  }),
  authenticateRequest: vi.fn(() => vi.fn()),
  tenantEnforcementMiddleware: vi.fn(() => vi.fn()),
  setupJWT: vi.fn(),
}));

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    services: { shard_manager: { url: 'http://shard-manager:3000' } },
  })),
}));

vi.mock('../../../src/utils/logger', () => ({
  log: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

describe('ActionCatalogService', () => {
  let service: ActionCatalogService;
  const mockApp = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockImplementation((url: string) => {
      if (url?.includes('shard-types')) return Promise.resolve([]);
      return Promise.resolve({ items: [] });
    });
    service = new ActionCatalogService(mockApp);
  });

  describe('getCatalogEntry', () => {
    it('returns null when shard type is not found', async () => {
      const result = await service.getCatalogEntry('entry-1', 'tenant-1');
      expect(result).toBeNull();
    });
  });

  describe('getApplicableCatalogEntries', () => {
    it('returns empty array when shard type is not found', async () => {
      const result = await service.getApplicableCatalogEntries('tenant-1', { type: 'risk' });
      expect(result).toEqual([]);
    });
  });

  describe('renderRecommendation', () => {
    it('replaces {stage}, {industry}, {opportunityId} in actionTemplate', () => {
      const entry = {
        id: 'e1',
        partitionKey: 'system',
        type: 'recommendation' as const,
        category: 'c1',
        name: 'rec',
        displayName: 'Recommendation',
        description: 'Desc',
        applicableIndustries: [],
        applicableStages: [],
        applicableMethodologies: [],
        status: 'active' as const,
        usage: { timesGenerated: 0, avgFeedbackSentiment: 0, avgActionRate: 0 },
        createdAt: '',
        updatedAt: '',
        createdBy: 'system',
        recommendationDetails: {
          recommendationType: 'next_action' as const,
          actionTemplate: {
            title: 'Stage: {stage}',
            description: 'Industry: {industry}',
            actionItemsTemplate: ['Opp: {opportunityId}'],
            reasoningTemplate: '',
            expectedOutcomeTemplate: '',
          },
          mitigatesRisks: [],
          requiredData: [],
        },
      };
      const context = { stage: 'Qualification', industry: 'Tech', opportunityId: 'opp-1' };
      const result = service.renderRecommendation(entry, context);
      expect(result.title).toBe('Stage: Qualification');
      expect(result.description).toBe('Industry: Tech');
      expect(result.actionItems).toEqual(['Opp: opp-1']);
    });

    it('returns displayName and description when entry has no actionTemplate', () => {
      const entry = {
        id: 'e1',
        partitionKey: 'system',
        type: 'recommendation' as const,
        category: 'c1',
        name: 'rec',
        displayName: 'My Recommendation',
        description: 'My description',
        applicableIndustries: [],
        applicableStages: [],
        applicableMethodologies: [],
        status: 'active' as const,
        usage: { timesGenerated: 0, avgFeedbackSentiment: 0, avgActionRate: 0 },
        createdAt: '',
        updatedAt: '',
        createdBy: 'system',
      };
      const result = service.renderRecommendation(entry, {});
      expect(result.title).toBe('My Recommendation');
      expect(result.description).toBe('My description');
      expect(result.actionItems).toEqual([]);
    });
  });

  describe('updateCatalogUsageStats', () => {
    it('calls log.debug', async () => {
      await service.updateCatalogUsageStats('entry-1', {});
      expect(log.debug).toHaveBeenCalledWith('updateCatalogUsageStats placeholder', expect.objectContaining({ entryId: 'entry-1', service: 'risk-catalog' }));
    });
  });

  describe('listEntries', () => {
    it('returns empty array when shard type is not found', async () => {
      const result = await service.listEntries('tenant-1');
      expect(result).toEqual([]);
    });
  });

  describe('listRelationships', () => {
    it('returns empty array when listEntries returns empty', async () => {
      const result = await service.listRelationships('tenant-1');
      expect(result).toEqual([]);
    });
  });
});
