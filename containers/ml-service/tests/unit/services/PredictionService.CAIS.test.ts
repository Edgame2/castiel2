/**
 * PredictionService CAIS integration unit tests.
 * Asserts getModelSelection/getLearnedWeights are used and defaults are returned on client errors.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServiceClient } from '@coder/shared';
import { PredictionService } from '../../../src/services/PredictionService';
import { MLModelService } from '../../../src/services/MLModelService';
import { FeatureService } from '../../../src/services/FeatureService';
import { AzureMLClient } from '../../../src/clients/AzureMLClient';

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('@coder/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@coder/shared')>();
  return {
    ...actual,
    ServiceClient: vi.fn(function (this: unknown) {
      return { get: mockGet, post: mockPost };
    }),
  };
});

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    services: { adaptive_learning: { url: 'http://adaptive-learning' } },
    cache: { redis: { enabled: false } },
    cosmos_db: { containers: {} },
    feature_flags: {},
  })),
}));

describe('PredictionService CAIS', () => {
  let predictionService: PredictionService;
  let mockModelService: MLModelService;
  let mockFeatureService: FeatureService;
  let mockAzureMlClient: AzureMLClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockRejectedValue(new Error('adaptive-learning unavailable'));
    mockPost.mockResolvedValue(undefined);
    mockModelService = {} as MLModelService;
    mockFeatureService = {
      buildVectorForOpportunity: vi.fn().mockResolvedValue({ probability: 0.6, days_in_stage: 10 }),
    } as unknown as FeatureService;
    mockAzureMlClient = {
      hasEndpoint: vi.fn().mockReturnValue(false),
    } as unknown as AzureMLClient;
    predictionService = new PredictionService(
      mockModelService,
      mockFeatureService,
      mockAzureMlClient
    );
  });

  it('predictRiskScore calls adaptive-learning model-selection and returns result on client error', async () => {
    const result = await predictionService.predictRiskScore('tenant-1', {
      opportunityId: 'opp-1',
    });
    expect(result).toHaveProperty('riskScore');
    expect(typeof result.riskScore).toBe('number');
    expect(mockGet).toHaveBeenCalled();
    const getUrl = mockGet.mock.calls.find((c: unknown[]) => typeof c[0] === 'string' && c[0].includes('model-selection'))?.[0];
    expect(getUrl).toBeDefined();
    expect(getUrl).toContain('/api/v1/adaptive-learning/model-selection/tenant-1');
  });

  it('predictRiskScore uses model selection when client returns modelId', async () => {
    mockGet.mockResolvedValue({ modelId: 'risk-scoring-model', confidence: 0.9 });
    const mockPredict = vi.fn().mockResolvedValue(0.35);
    mockAzureMlClient = {
      hasEndpoint: vi.fn((name: string) => name === 'risk-scoring-model'),
      predict: mockPredict,
    } as unknown as AzureMLClient;
    predictionService = new PredictionService(mockModelService, mockFeatureService, mockAzureMlClient);
    const result = await predictionService.predictRiskScore('tenant-1', {
      opportunityId: 'opp-1',
    });
    expect(result).toHaveProperty('riskScore', 0.35);
    expect(result.modelId).toBe('risk-scoring-model');
  });
});
