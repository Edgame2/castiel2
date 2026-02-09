/**
 * Policy Resolver unit tests (dataflow plan §1.3)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getContainer } from '../../../src/database/index';
import { PolicyResolver } from '../../../src/services/PolicyResolver';

vi.mock('../../../src/database/index', () => ({
  getContainer: vi.fn(),
}));

describe('PolicyResolver', () => {
  let resolver: PolicyResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new PolicyResolver();
  });

  describe('getActivationFlags', () => {
    it('returns flags for emailProcessing when shardTypeId is Email', async () => {
      const doc = {
        tenantId: 't1',
        emailProcessing: {
          enabled: true,
          sentimentAnalysis: true,
          actionItemExtraction: false,
        },
      };
      vi.mocked(getContainer).mockReturnValue({
        items: {
          query: vi.fn(() => ({
            fetchNext: vi.fn().mockResolvedValue({ resources: [doc] }),
          })),
        },
      });

      const flags = await resolver.getActivationFlags('t1', 'Email');
      expect(flags.enabled).toBe(true);
      expect(flags.sentimentAnalysis).toBe(true);
      expect(flags.actionItemExtraction).toBe(false);
      expect(vi.mocked(getContainer)).toHaveBeenCalledWith('integration_processing_settings');
    });

    it('returns flags for documentProcessing when shardTypeId is Document', async () => {
      const doc = {
        tenantId: 't1',
        documentProcessing: {
          enabled: true,
          textExtraction: true,
          entityExtraction: false,
        },
      };
      vi.mocked(getContainer).mockReturnValue({
        items: {
          query: vi.fn(() => ({
            fetchNext: vi.fn().mockResolvedValue({ resources: [doc] }),
          })),
        },
      });

      const flags = await resolver.getActivationFlags('t1', 'Document');
      expect(flags.enabled).toBe(true);
      expect(flags.textExtraction).toBe(true);
      expect(flags.entityExtraction).toBe(false);
    });

    it('returns empty object when no document exists', async () => {
      vi.mocked(getContainer).mockReturnValue({
        items: {
          query: vi.fn(() => ({
            fetchNext: vi.fn().mockResolvedValue({ resources: [] }),
          })),
        },
      });

      const flags = await resolver.getActivationFlags('t1', 'Email');
      expect(flags).toEqual({});
    });

    it('returns empty object on error', async () => {
      vi.mocked(getContainer).mockReturnValue({
        items: {
          query: vi.fn(() => ({
            fetchNext: vi.fn().mockRejectedValue(new Error('Cosmos error')),
          })),
        },
      });

      const flags = await resolver.getActivationFlags('t1', 'Email');
      expect(flags).toEqual({});
    });
  });

  describe('getShardTypeAnalysisPolicy', () => {
    it('returns shardTypeAnalysisPolicy for tenant', async () => {
      const doc = {
        id: 't1',
        tenantId: 't1',
        shardTypeAnalysisPolicy: {
          Email: { useForRiskAnalysis: true, useForRecommendationGeneration: true },
          c_search: { useForRiskAnalysis: true, useForRecommendationGeneration: false },
        },
      };
      vi.mocked(getContainer).mockReturnValue({
        item: vi.fn((id: string, pk: string) => ({
          read: vi.fn().mockResolvedValue({ resource: doc }),
        })),
      });

      const policy = await resolver.getShardTypeAnalysisPolicy('t1');
      expect(policy.Email).toEqual({ useForRiskAnalysis: true, useForRecommendationGeneration: true });
      expect(policy.c_search).toEqual({ useForRiskAnalysis: true, useForRecommendationGeneration: false });
      expect(vi.mocked(getContainer)).toHaveBeenCalledWith('risk_tenant_ml_config');
    });

    it('returns empty object when document has no shardTypeAnalysisPolicy', async () => {
      vi.mocked(getContainer).mockReturnValue({
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: { id: 't1', tenantId: 't1' } }),
        })),
      });

      const policy = await resolver.getShardTypeAnalysisPolicy('t1');
      expect(policy).toEqual({});
    });

    it('returns empty object on read error', async () => {
      vi.mocked(getContainer).mockReturnValue({
        item: vi.fn(() => ({
          read: vi.fn().mockRejectedValue(new Error('Not found')),
        })),
      });

      const policy = await resolver.getShardTypeAnalysisPolicy('t1');
      expect(policy).toEqual({});
    });

    it('uses custom container names when provided in options', async () => {
      const customResolver = new PolicyResolver({
        integrationProcessingSettingsContainer: 'custom_settings',
        riskTenantMlConfigContainer: 'custom_ml_config',
      });
      vi.mocked(getContainer).mockReturnValue({
        items: { query: vi.fn(() => ({ fetchNext: vi.fn().mockResolvedValue({ resources: [] }) })) },
      });
      await customResolver.getActivationFlags('t1', 'Email');
      expect(vi.mocked(getContainer)).toHaveBeenCalledWith('custom_settings');
      vi.mocked(getContainer).mockClear();
      vi.mocked(getContainer).mockReturnValue({
        item: vi.fn(() => ({ read: vi.fn().mockResolvedValue({ resource: {} }) })),
      });
      await customResolver.getShardTypeAnalysisPolicy('t1');
      expect(vi.mocked(getContainer)).toHaveBeenCalledWith('custom_ml_config');
    });
  });
});
