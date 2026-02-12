/**
 * DecisionEngineService Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DecisionEngineService } from '../../../src/services/DecisionEngineService';
import { getContainer } from '@coder/shared/database';

vi.mock('@coder/shared/database', () => ({ getContainer: vi.fn() }));
vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    cosmos_db: {
      containers: {
        decisions: 'risk_decisions',
        rules: 'risk_rules',
      },
    },
  })),
}));
vi.mock('../../../src/utils/logger', () => ({
  log: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

describe('DecisionEngineService', () => {
  let service: DecisionEngineService;
  let mockContainer: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContainer = {
      items: {
        upsert: vi.fn().mockResolvedValue(undefined),
        query: vi.fn().mockReturnValue({ fetchAll: vi.fn().mockResolvedValue({ resources: [] }) }),
      },
    };
    vi.mocked(getContainer).mockReturnValue(mockContainer);
  });

  describe('makeMethodologyDecisions', () => {
    it('returns null when getMethodologyFeatures is not set', async () => {
      service = new DecisionEngineService(null, null, null);
      const result = await service.makeMethodologyDecisions('tenant-1', 'opp-1');
      expect(result).toBeNull();
    });

    it('returns null when features are null', async () => {
      const getMethodologyFeatures = vi.fn().mockResolvedValue(null);
      service = new DecisionEngineService(null, null, getMethodologyFeatures);
      const result = await service.makeMethodologyDecisions('tenant-1', 'opp-1');
      expect(result).toBeNull();
      expect(getMethodologyFeatures).toHaveBeenCalledWith('tenant-1', 'opp-1');
    });

    it('returns null when no actions (all thresholds met)', async () => {
      const getMethodologyFeatures = vi.fn().mockResolvedValue({
        stageRequirementsMet: 0.9,
        stageRequirementsMissing: [],
        stageDurationAnomaly: false,
        methodologyFieldsComplete: 0.8,
        methodologyFieldsMissing: [],
        meddic: null,
      });
      service = new DecisionEngineService(null, null, getMethodologyFeatures);
      const result = await service.makeMethodologyDecisions('tenant-1', 'opp-1');
      expect(result).toBeNull();
    });

    it('returns decision with actions when stage requirements below 80%', async () => {
      const getMethodologyFeatures = vi.fn().mockResolvedValue({
        stageRequirementsMet: 0.5,
        stageRequirementsMissing: ['req1', 'req2'],
        stageDurationAnomaly: false,
        methodologyFieldsComplete: 0.9,
        methodologyFieldsMissing: [],
        meddic: null,
      });
      service = new DecisionEngineService(null, null, getMethodologyFeatures);
      const result = await service.makeMethodologyDecisions('tenant-1', 'opp-1');
      expect(result).not.toBeNull();
      expect(result!.tenantId).toBe('tenant-1');
      expect(result!.opportunityId).toBe('opp-1');
      expect(result!.decisionType).toBe('methodology');
      expect(result!.source).toBe('methodology');
      expect(result!.actions.length).toBeGreaterThan(0);
      expect(result!.actions[0].details).toMatchObject({
        recommendationType: 'stage_requirements_missing',
        missing: ['req1', 'req2'],
      });
      expect(mockContainer.items.upsert).toHaveBeenCalled();
    });

    it('returns decision with MEDDIC action when score below 0.6', async () => {
      const getMethodologyFeatures = vi.fn().mockResolvedValue({
        stageRequirementsMet: 0.9,
        stageRequirementsMissing: [],
        stageDurationAnomaly: false,
        methodologyFieldsComplete: 0.9,
        methodologyFieldsMissing: [],
        meddic: {
          meddicScore: 0.4,
          economicBuyerIdentified: false,
          championIdentified: false,
          metricsIdentified: false,
          decisionCriteriaKnown: false,
        },
      });
      service = new DecisionEngineService(null, null, getMethodologyFeatures);
      const result = await service.makeMethodologyDecisions('tenant-1', 'opp-1');
      expect(result).not.toBeNull();
      expect(result!.actions.some((a) => a.details?.recommendationType === 'meddic_score_low')).toBe(true);
      expect(mockContainer.items.upsert).toHaveBeenCalled();
    });
  });
});
