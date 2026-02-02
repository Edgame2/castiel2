/**
 * Unit tests for ChainOfThoughtService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChainOfThoughtService } from '../../../src/services/ChainOfThoughtService';
import { getContainer } from '@coder/shared/database';
import { log } from '../../../src/utils/logger';

const mockUpsert = vi.fn().mockResolvedValue(undefined);

vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(),
}));

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    cosmos_db: { containers: { llm_outputs: 'llm_outputs' } },
    llm: { provider: 'mock', model: 'stub', timeout_ms: 10000 },
  })),
}));

vi.mock('../../../src/utils/logger', () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

const mockGetContainer = vi.mocked(getContainer);

describe('ChainOfThoughtService', () => {
  let service: ChainOfThoughtService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetContainer.mockReturnValue({
      items: { upsert: mockUpsert },
    } as any);
    service = new ChainOfThoughtService();
  });

  describe('explain', () => {
    it('returns stub explanation and persists via saveOutput', async () => {
      const context = {
        opportunityId: 'opp-1',
        predictionId: 'pred-1',
        explanationId: 'exp-1',
        context: {},
      };

      const result = await service.explain(context, 'tenant-1');

      expect(result).toEqual({ text: expect.stringContaining('Stub explanation for opportunity opp-1') });
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          outputType: 'explanation',
          opportunityId: 'opp-1',
          output: { text: expect.any(String) },
          llmProvider: 'mock',
          model: 'stub',
        })
      );
    });
  });

  describe('generateRecommendations', () => {
    it('returns stub recommendations and persists', async () => {
      const context = {
        opportunityId: 'opp-1',
        predictionId: 'pred-1',
        explanationId: 'exp-1',
        context: {},
      };

      const result = await service.generateRecommendations(context, 'tenant-1');

      expect(result.recommendations).toHaveLength(2);
      expect(result.recommendations![0]).toMatchObject({ action: expect.any(String), priority: 'high' });
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          outputType: 'recommendations',
          opportunityId: 'opp-1',
          output: { recommendations: expect.any(Array) },
        })
      );
    });
  });

  describe('analyzeScenarios', () => {
    it('returns stub scenarios and persists', async () => {
      const context = {
        opportunityId: 'opp-1',
        predictionId: 'pred-1',
        explanationId: 'exp-1',
        context: {},
      };

      const result = await service.analyzeScenarios(context, 'tenant-1');

      expect(result.scenarios).toHaveLength(3);
      expect(result.scenarios!.map((s) => s.type)).toEqual(['best', 'base', 'worst']);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          outputType: 'scenarios',
          opportunityId: 'opp-1',
        })
      );
    });
  });

  describe('generateSummary', () => {
    it('returns stub summary and persists', async () => {
      const context = {
        opportunityId: 'opp-1',
        predictionId: 'pred-1',
        explanationId: 'exp-1',
        context: {},
      };

      const result = await service.generateSummary(context, 'tenant-1');

      expect(result.text).toContain('Stub summary for opportunity opp-1');
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          outputType: 'summary',
          opportunityId: 'opp-1',
        })
      );
    });
  });

  describe('generatePlaybook', () => {
    it('returns stub playbook and persists', async () => {
      const context = {
        opportunityId: 'opp-1',
        predictionId: 'pred-1',
        explanationId: 'exp-1',
        context: {},
      };

      const result = await service.generatePlaybook(context, 'tenant-1');

      expect(result.text).toContain('Stub playbook for opportunity opp-1');
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          outputType: 'playbook',
          opportunityId: 'opp-1',
        })
      );
    });
  });

  describe('generateReactivationStrategy', () => {
    it('returns reactivation strategy and persists', async () => {
      const request = {
        opportunityId: 'opp-1',
        dormantFeatures: [],
        reactivationPrediction: { reactivationProbability: 0.7, recommendedApproach: { channel: 'email', tone: 'consultative' } },
      };

      const result = await service.generateReactivationStrategy(request, 'tenant-1');

      expect(result.reactivationStrategy).toBeDefined();
      expect(result.reactivationStrategy!.priority).toBe('high');
      expect(result.reactivationStrategy!.immediateActions).toHaveLength(3);
      expect(result.reactivationStrategy!.outreachPlan.initialContact.channel).toBe('email');
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          outputType: 'reactivation_strategy',
          opportunityId: 'opp-1',
        })
      );
    });

    it('uses low priority when reactivation probability is low', async () => {
      const request = {
        opportunityId: 'opp-1',
        dormantFeatures: [],
        reactivationPrediction: { reactivationProbability: 0.2 },
      };

      const result = await service.generateReactivationStrategy(request, 'tenant-1');

      expect(result.reactivationStrategy!.priority).toBe('low');
    });
  });

  describe('saveOutput', () => {
    it('logs error and rethrows when container.items.upsert throws', async () => {
      mockUpsert.mockRejectedValueOnce(new Error('Cosmos error'));

      const context = { opportunityId: 'opp-1', predictionId: 'pred-1', explanationId: 'exp-1', context: {} };

      await expect(service.explain(context, 'tenant-1')).rejects.toThrow('Cosmos error');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to persist LLMOutput',
        expect.any(Error),
        expect.objectContaining({ service: 'llm-service', tenantId: 'tenant-1' })
      );
    });
  });
});
