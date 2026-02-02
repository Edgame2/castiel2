/**
 * Unit tests for FeedbackService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FeedbackService } from '../../../src/services/FeedbackService';
import { getContainer } from '@coder/shared';

vi.mock('@coder/shared', async (importOriginal) => {
  const actual = (await importOriginal()) as object;
  return { ...actual, getContainer: vi.fn() };
});

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    cosmos_db: {
      containers: {
        feedback: 'recommendation_feedback',
        feedback_aggregation: 'recommendation_feedback_aggregation',
        recommendation_config: 'recommendation_config',
      },
    },
  })),
}));

vi.mock('../../../src/events/publishers/RecommendationEventPublisher', () => ({
  publishRecommendationEvent: vi.fn().mockResolvedValue(undefined),
}));

const mockGetContainer = vi.mocked(getContainer);

describe('FeedbackService', () => {
  let service: FeedbackService;

  beforeEach(() => {
    vi.clearAllMocks();
    const mockItem = {
      read: vi.fn().mockResolvedValue({ resource: null }),
    };
    const mockItems = {
      create: vi.fn(),
      query: vi.fn().mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
      }),
    };
    mockGetContainer.mockReturnValue({
      items: mockItems,
      item: vi.fn(() => mockItem),
    } as any);
    service = new FeedbackService();
  });

  describe('getFeedbackTypeById', () => {
    it('returns null when id does not start with feedback_type_', async () => {
      const result = await service.getFeedbackTypeById('other_id');
      expect(result).toBeNull();
      expect(mockGetContainer().item).not.toHaveBeenCalled();
    });

    it('returns resource when found', async () => {
      const doc = { id: 'feedback_type_1', name: 'type1' };
      const container = mockGetContainer();
      (container.item as ReturnType<typeof vi.fn>)()
        .read = vi.fn().mockResolvedValue({ resource: doc });
      const result = await service.getFeedbackTypeById('feedback_type_1');
      expect(result).toEqual(doc);
    });
  });

  describe('getFeedbackTypes', () => {
    it('returns types from query when resources exist', async () => {
      const types = [{ id: 'feedback_type_1', name: 'type1' }];
      const container = mockGetContainer();
      (container.items.query as ReturnType<typeof vi.fn>)()
        .fetchAll = vi.fn().mockResolvedValue({ resources: types });
      const result = await service.getFeedbackTypes();
      expect(result).toEqual(types);
    });
  });
});
