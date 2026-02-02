/**
 * Unit tests for RecommendationEventConsumer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as RecommendationEventConsumer from '../../../src/events/consumers/RecommendationEventConsumer';

vi.mock('@coder/shared', () => ({
  EventConsumer: vi.fn().mockImplementation(function (this: any) {
    this.on = vi.fn();
  }),
}));

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    rabbitmq: { url: '', exchange: 'events', queue: 'queue', bindings: [] },
  })),
}));

vi.mock('../../../src/utils/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../../src/services/RecommendationsService', () => ({
  RecommendationsService: vi.fn().mockImplementation(function (this: any) {
    this.generateRecommendations = vi.fn().mockResolvedValue(undefined);
  }),
}));

describe('RecommendationEventConsumer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initializeEventConsumer', () => {
    it('returns without creating consumer when rabbitmq.url is empty', async () => {
      await RecommendationEventConsumer.initializeEventConsumer();
      const { EventConsumer } = await import('@coder/shared');
      expect(EventConsumer).not.toHaveBeenCalled();
    });
  });
});
