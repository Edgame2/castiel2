/**
 * SignalIntelligenceService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SignalIntelligenceService } from '../../../src/services/SignalIntelligenceService';
import { getContainer } from '@coder/shared/database';
import * as config from '../../../src/config';

vi.mock('../../../src/config', () => ({ loadConfig: vi.fn() }));

describe('SignalIntelligenceService', () => {
  let service: SignalIntelligenceService;
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate = vi.fn().mockImplementation((doc: any) => Promise.resolve({ resource: { ...doc, id: doc?.id || 'sig1' } }));
    (config.loadConfig as ReturnType<typeof vi.fn>).mockReturnValue({
      services: { ai_service: { url: '' }, integration_manager: { url: '' } },
    } as any);
    vi.mocked(getContainer).mockReturnValue({
      items: {
        create: mockCreate,
        query: vi.fn(() => ({ fetchNext: vi.fn().mockResolvedValue({ resources: [] }), fetchAll: vi.fn() })),
      },
      item: vi.fn(() => ({ read: vi.fn(), replace: vi.fn(), delete: vi.fn() })),
    } as unknown as ReturnType<typeof getContainer>);
    service = new SignalIntelligenceService();
  });

  describe('analyzeSignal', () => {
    it('stores and returns signal with analysis for communication type', async () => {
      const result = await service.analyzeSignal('t1', {
        signalType: 'communication',
        source: 'email',
        data: { frequency: 'high', sentiment: 'positive' },
        analyzed: false,
      });
      expect(result.tenantId).toBe('t1');
      expect(result.signalType).toBe('communication');
      expect(result.analyzed).toBe(true);
      expect(result.analysis).toBeDefined();
      expect(result.analysis!.confidence).toBe(0.8);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 't1', signalType: 'communication', analyzed: true }),
        { partitionKey: 't1' }
      );
    });
    it('stores and returns signal for calendar type', async () => {
      const result = await service.analyzeSignal('t1', {
        signalType: 'calendar',
        source: 'outlook',
        data: {},
        analyzed: false,
      });
      expect(result.signalType).toBe('calendar');
      expect(result.analysis!.patterns).toBeDefined();
      expect(mockCreate).toHaveBeenCalled();
    });
    it('throws on create failure', async () => {
      mockCreate.mockRejectedValue(new Error('DB error'));
      await expect(
        service.analyzeSignal('t1', {
          signalType: 'communication',
          source: 'x',
          data: {},
          analyzed: false,
        })
      ).rejects.toThrow(/Failed to analyze signal/);
    });
  });
});
