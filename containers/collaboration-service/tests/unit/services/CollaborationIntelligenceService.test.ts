/**
 * CollaborationIntelligenceService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CollaborationIntelligenceService } from '../../../src/services/CollaborationIntelligenceService';
import { getContainer } from '@coder/shared/database';
import * as config from '../../../src/config';

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(),
}));

describe('CollaborationIntelligenceService', () => {
  let service: CollaborationIntelligenceService;
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate = vi.fn().mockResolvedValue(undefined);
    (config.loadConfig as ReturnType<typeof vi.fn>).mockReturnValue({
      services: { ai_insights: { url: 'http://ai-insights' } },
    });
    vi.mocked(getContainer).mockReturnValue({
      items: { create: mockCreate, query: vi.fn(() => ({ fetchNext: vi.fn() })) },
      item: vi.fn(() => ({ read: vi.fn(), replace: vi.fn(), delete: vi.fn() })),
    } as unknown as ReturnType<typeof getContainer>);
    service = new CollaborationIntelligenceService();
  });

  it('generateInsight returns fallback insight when no ai_insights response', async () => {
    const result = await service.generateInsight('t1', { participants: ['u1'], text: 'context' });
    expect(result.tenantId).toBe('t1');
    expect(result.insightType).toBe('collaborative');
    expect(result.content).toContain('Collaborative insight');
    expect(result.participants).toEqual(['u1']);
    expect(result.relevanceScore).toBeGreaterThanOrEqual(0);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 't1',
        insightType: 'collaborative',
        participants: ['u1'],
      }),
      { partitionKey: 't1' }
    );
  });

  it('generateInsight uses participants from context.userIds when participants missing', async () => {
    const result = await service.generateInsight('t1', { userIds: ['u1', 'u2'] });
    expect(result.participants).toEqual(['u1', 'u2']);
  });

  it('generateInsight throws on create failure', async () => {
    mockCreate.mockRejectedValue(new Error('DB error'));
    await expect(service.generateInsight('t1', {})).rejects.toThrow(/Failed to generate/);
  });
});
