/**
 * Unit tests for MitigationRankingService (rankMitigationActions)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rankMitigationActions } from '../../../src/services/MitigationRankingService';
import { getContainer } from '@coder/shared';

vi.mock('@coder/shared', async (importOriginal) => {
  const actual = (await importOriginal()) as object;
  return { ...actual, getContainer: vi.fn() };
});

const mockGetContainer = vi.mocked(getContainer);

describe('MitigationRankingService', () => {
  const tenantId = 'tenant-1';
  const opportunityId = 'opp-1';

  beforeEach(() => {
    vi.clearAllMocks();
    const mockItems = {
      query: vi.fn().mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
      }),
    };
    mockGetContainer.mockReturnValue({ items: mockItems } as any);
  });

  describe('rankMitigationActions', () => {
    it('returns stub actions when container returns empty', async () => {
      const result = await rankMitigationActions(opportunityId, tenantId);
      expect(result.opportunityId).toBe(opportunityId);
      expect(result.tenantId).toBe(tenantId);
      expect(result.actions).toBeDefined();
      expect(result.actions.length).toBeGreaterThan(0);
      expect(result.actions[0]).toHaveProperty('actionId');
      expect(result.actions[0]).toHaveProperty('rank');
    });

    it('returns ranked actions from container when resources exist', async () => {
      const resources = [
        { id: 'a1', tenantId, actionId: 'act_1', title: 'T1', description: 'D1', rank: 1 },
        { id: 'a2', tenantId, actionId: 'act_2', title: 'T2', description: 'D2', rank: 2 },
      ];
      const container = mockGetContainer();
      (container.items.query as ReturnType<typeof vi.fn>)()
        .fetchAll = vi.fn().mockResolvedValue({ resources });
      const result = await rankMitigationActions(opportunityId, tenantId);
      expect(result.actions).toHaveLength(2);
      expect(result.actions[0].actionId).toBe('act_1');
      expect(result.actions[0].rank).toBe(1);
    });
  });
});
