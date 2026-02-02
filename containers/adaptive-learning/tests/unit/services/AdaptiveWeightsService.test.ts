/**
 * AdaptiveWeightsService unit tests – default weights and model selection when Cosmos returns nothing or fails.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdaptiveWeightsService } from '../../../src/services/AdaptiveWeightsService';
import { getContainer } from '@coder/shared/database';
import { DEFAULT_WEIGHTS, DEFAULT_MODEL_SELECTION } from '../../../src/types/cais.types';

vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(),
}));

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    cosmos_db: {
      containers: {
        adaptive_weights: 'adaptive_weights',
        adaptive_model_selections: 'adaptive_model_selections',
      },
    },
  })),
}));

describe('AdaptiveWeightsService', () => {
  let service: AdaptiveWeightsService;
  let mockWeightsRead: ReturnType<typeof vi.fn>;
  let mockModelSelectionRead: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockWeightsRead = vi.fn().mockResolvedValue({ resource: null });
    mockModelSelectionRead = vi.fn().mockResolvedValue({ resource: null });
    (getContainer as ReturnType<typeof vi.fn>).mockImplementation((name: string) => ({
      item: (_id: string, _pk: string) => ({
        read: name === 'adaptive_weights' ? mockWeightsRead : mockModelSelectionRead,
      }),
    }));
    service = new AdaptiveWeightsService();
  });

  describe('getWeights', () => {
    it('returns default weights when Cosmos returns no resource', async () => {
      const result = await service.getWeights('tenant-1', 'risk-evaluation');
      expect(result).toMatchObject({
        ruleBased: DEFAULT_WEIGHTS.ruleBased,
        ml: DEFAULT_WEIGHTS.ml,
        ai: DEFAULT_WEIGHTS.ai,
        historical: DEFAULT_WEIGHTS.historical,
      });
    });

    it('returns stored weights when Cosmos returns a document', async () => {
      mockWeightsRead.mockResolvedValue({
        resource: { ruleBased: 0.7, ml: 0.8, ai: 0.75, historical: 0.9 },
      });
      const result = await service.getWeights('tenant-1', 'risk-evaluation');
      expect(result).toEqual({ ruleBased: 0.7, ml: 0.8, ai: 0.75, historical: 0.9 });
    });

    it('returns default weights when Cosmos throws 404', async () => {
      mockWeightsRead.mockRejectedValue({ code: 404 });
      const result = await service.getWeights('tenant-1', 'risk-evaluation');
      expect(result).toMatchObject(DEFAULT_WEIGHTS);
    });

    it('returns default weights when Cosmos throws non-404 error', async () => {
      mockWeightsRead.mockRejectedValue(new Error('Cosmos unavailable'));
      const result = await service.getWeights('tenant-1', 'risk-evaluation');
      expect(result).toMatchObject(DEFAULT_WEIGHTS);
    });
  });

  describe('getModelSelection', () => {
    it('returns default model selection when Cosmos returns no resource', async () => {
      const result = await service.getModelSelection('tenant-1', 'risk-scoring');
      expect(result).toEqual({
        modelId: DEFAULT_MODEL_SELECTION.modelId,
        confidence: DEFAULT_MODEL_SELECTION.confidence,
      });
    });

    it('returns stored model selection when Cosmos returns a document', async () => {
      mockModelSelectionRead.mockResolvedValue({
        resource: { modelId: 'custom-model', confidence: 0.95, version: 'v2' },
      });
      const result = await service.getModelSelection('tenant-1', 'risk-scoring');
      expect(result).toEqual({ modelId: 'custom-model', confidence: 0.95, version: 'v2' });
    });

    it('returns default when Cosmos throws 404', async () => {
      mockModelSelectionRead.mockRejectedValue({ code: 404 });
      const result = await service.getModelSelection('tenant-1', 'forecasting');
      expect(result.modelId).toBe(DEFAULT_MODEL_SELECTION.modelId);
      expect(result.confidence).toBe(DEFAULT_MODEL_SELECTION.confidence);
    });

    it('returns default when Cosmos throws non-404 error', async () => {
      mockModelSelectionRead.mockRejectedValue(new Error('Cosmos unavailable'));
      const result = await service.getModelSelection('tenant-1', 'forecasting');
      expect(result).toMatchObject(DEFAULT_MODEL_SELECTION);
    });
  });
});
