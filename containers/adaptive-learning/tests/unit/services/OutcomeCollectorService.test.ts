/**
 * OutcomeCollectorService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OutcomeCollectorService } from '../../../src/services/OutcomeCollectorService';
import { getContainer } from '@coder/shared/database';

vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(),
}));

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    cosmos_db: { containers: { outcomes: 'adaptive_outcomes' } },
  })),
}));

describe('OutcomeCollectorService', () => {
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate = vi.fn().mockResolvedValue(undefined);
    (getContainer as ReturnType<typeof vi.fn>).mockReturnValue({
      items: { create: mockCreate },
    });
  });

  describe('recordPrediction', () => {
    it('creates prediction doc and returns id', async () => {
      const service = new OutcomeCollectorService();
      const result = await service.recordPrediction('tenant-1', {
        component: 'risk-evaluation',
        predictionId: 'pred-1',
        predictedValue: 0.75,
      });
      expect(result).toHaveProperty('id');
      expect(typeof result.id).toBe('string');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          type: 'prediction',
          component: 'risk-evaluation',
          predictionId: 'pred-1',
          predictedValue: 0.75,
        }),
        expect.any(Object)
      );
    });
  });

  describe('recordOutcome', () => {
    it('creates outcome doc and returns id', async () => {
      const service = new OutcomeCollectorService();
      const result = await service.recordOutcome('tenant-1', {
        predictionId: 'pred-1',
        outcomeValue: 0.8,
        outcomeType: 'success',
      });
      expect(result).toHaveProperty('id');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          type: 'outcome',
          predictionId: 'pred-1',
          outcomeValue: 0.8,
          outcomeType: 'success',
        }),
        expect.any(Object)
      );
    });
  });

  describe('recordFromEvent', () => {
    it('creates outcome doc from event with numeric prediction', async () => {
      const service = new OutcomeCollectorService();
      const result = await service.recordFromEvent('tenant-1', {
        component: 'forecasting',
        prediction: 0.6,
      });
      expect(result).toHaveProperty('id');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          type: 'outcome',
          component: 'forecasting',
          outcomeValue: 0.6,
          outcomeType: 'prediction',
        }),
        expect.any(Object)
      );
    });

    it('extracts value from object prediction', async () => {
      const service = new OutcomeCollectorService();
      await service.recordFromEvent('tenant-1', {
        component: 'risk-evaluation',
        prediction: { value: 0.85 },
      });
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ outcomeValue: 0.85 }),
        expect.any(Object)
      );
    });
  });
});
