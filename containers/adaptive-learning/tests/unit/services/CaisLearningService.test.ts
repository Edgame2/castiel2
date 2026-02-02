/**
 * CaisLearningService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CaisLearningService } from '../../../src/services/CaisLearningService';
import { getContainer } from '@coder/shared/database';
import { AdaptiveWeightsService } from '../../../src/services/AdaptiveWeightsService';

vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(),
}));

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    cosmos_db: { containers: { outcomes: 'adaptive_outcomes' } },
  })),
}));

vi.mock('../../../src/services/AdaptiveWeightsService', () => ({
  AdaptiveWeightsService: vi.fn(),
}));

describe('CaisLearningService', () => {
  let mockListTenantIds: ReturnType<typeof vi.fn>;
  let mockGetWeights: ReturnType<typeof vi.fn>;
  let mockUpsertWeights: ReturnType<typeof vi.fn>;
  let mockGetModelSelection: ReturnType<typeof vi.fn>;
  let mockUpsertModelSelection: ReturnType<typeof vi.fn>;
  let mockOutcomesFetchAll: ReturnType<typeof vi.fn>;
  let mockPredictionsFetchAll: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockListTenantIds = vi.fn().mockResolvedValue([]);
    mockGetWeights = vi.fn().mockResolvedValue({ ruleBased: 0.9, ml: 0.9, ai: 0.9, historical: 0.9 });
    mockUpsertWeights = vi.fn().mockResolvedValue({});
    mockGetModelSelection = vi.fn().mockResolvedValue({ modelId: 'default', confidence: 0.9 });
    mockUpsertModelSelection = vi.fn().mockResolvedValue({});
    mockOutcomesFetchAll = vi.fn().mockResolvedValue({ resources: [] });
    mockPredictionsFetchAll = vi.fn().mockResolvedValue({ resources: [] });

    (AdaptiveWeightsService as unknown as ReturnType<typeof vi.fn>).mockImplementation(function (this: Record<string, unknown>) {
      return {
        listTenantIdsWithAutomaticLearning: mockListTenantIds,
        getWeights: mockGetWeights,
        upsertWeights: mockUpsertWeights,
        getModelSelection: mockGetModelSelection,
        upsertModelSelection: mockUpsertModelSelection,
      };
    });

    (getContainer as ReturnType<typeof vi.fn>).mockReturnValue({
      items: {
        query: vi.fn(() => ({
          fetchAll: () => mockOutcomesFetchAll(),
        })),
      },
    });
  });

  describe('runLearningJob', () => {
    it('returns zeros when no tenants have automatic learning', async () => {
      const service = new CaisLearningService();
      const result = await service.runLearningJob();
      expect(result).toEqual({ tenantsProcessed: 0, weightsUpdated: 0 });
      expect(mockListTenantIds).toHaveBeenCalled();
    });

    it('processes tenants and sums weightsUpdated', async () => {
      mockListTenantIds.mockResolvedValue(['tenant-1']);
      mockOutcomesFetchAll
        .mockResolvedValueOnce({
          resources: [
            { id: 'o1', tenantId: 'tenant-1', type: 'outcome', predictionId: 'pred-1', outcomeValue: 0.8 },
          ],
        })
        .mockResolvedValueOnce({ resources: [] });
      (getContainer as ReturnType<typeof vi.fn>).mockImplementation((_name: string) => {
        let callCount = 0;
        return {
          items: {
            query: vi.fn(() => ({
              fetchAll: () => {
                callCount++;
                if (callCount === 1) return mockOutcomesFetchAll();
                return mockPredictionsFetchAll();
              },
            })),
          },
        };
      });
      mockPredictionsFetchAll.mockResolvedValueOnce({
        resources: [
          { id: 'p1', tenantId: 'tenant-1', type: 'prediction', component: 'risk-evaluation', predictionId: 'pred-1', predictedValue: 0.7 },
        ],
      });
      const service = new CaisLearningService();
      const result = await service.runLearningJob();
      expect(result.tenantsProcessed).toBe(1);
      expect(result.weightsUpdated).toBeGreaterThanOrEqual(0);
    });
  });
});
