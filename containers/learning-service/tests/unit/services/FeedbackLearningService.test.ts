/**
 * Unit tests for FeedbackLearningService (Plan W6 Layer 7).
 * Tests linkFeedbackToPrediction with mocked Cosmos.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FeedbackLearningService } from '../../../src/services/FeedbackLearningService';

const mockRead = vi.fn();
const mockUpsert = vi.fn().mockResolvedValue(undefined);

vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(() => ({
    item: vi.fn(() => ({ read: mockRead })),
    items: { upsert: mockUpsert },
  })),
}));

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    cosmos_db: {
      containers: { user_feedback: 'learning_user_feedback', outcome: 'learning_outcome' },
    },
  })),
}));

describe('FeedbackLearningService', () => {
  let service: FeedbackLearningService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FeedbackLearningService();
  });

  describe('linkFeedbackToPrediction', () => {
    it('returns updated feedback when document exists', async () => {
      const existing = {
        id: 'fb-1',
        tenantId: 'tenant-123',
        modelId: 'm1',
        feedbackType: 'action',
        recordedAt: new Date().toISOString(),
      };
      mockRead.mockResolvedValue({ resource: existing });

      const result = await service.linkFeedbackToPrediction(
        'tenant-123',
        'fb-1',
        'pred-1'
      );

      expect(result).not.toBeNull();
      expect(result!.id).toBe('fb-1');
      expect(result!.predictionId).toBe('pred-1');
      expect(result!.linkedAt).toBeDefined();
      expect(mockUpsert).toHaveBeenCalledTimes(1);
    });

    it('returns null when feedback document does not exist', async () => {
      mockRead.mockResolvedValue({ resource: null });

      const result = await service.linkFeedbackToPrediction(
        'tenant-123',
        'nonexistent',
        'pred-1'
      );

      expect(result).toBeNull();
      expect(mockUpsert).not.toHaveBeenCalled();
    });
  });
});
