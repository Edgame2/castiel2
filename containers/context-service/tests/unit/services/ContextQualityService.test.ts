/**
 * Unit tests for ContextQualityService
 */

import { describe, it, expect } from 'vitest';
import { ContextQualityService } from '../../../src/services/ContextQualityService';
import type { AssembledContext } from '../../../src/types/context-quality.types';

describe('ContextQualityService', () => {
  let service: ContextQualityService;

  beforeEach(() => {
    service = new ContextQualityService();
  });

  describe('getMinimumRequirements', () => {
    it('returns requirements for summary insight type', () => {
      const req = service.getMinimumRequirements('summary');
      expect(req.minSourceCount).toBe(1);
      expect(req.minRelevanceScore).toBe(0.3);
      expect(req.allowEmpty).toBe(false);
    });

    it('returns requirements for analysis insight type', () => {
      const req = service.getMinimumRequirements('analysis');
      expect(req.minSourceCount).toBe(3);
      expect(req.minRelevanceScore).toBe(0.5);
      expect(req.minTokens).toBe(500);
    });

    it('returns requirements for search insight type', () => {
      const req = service.getMinimumRequirements('search');
      expect(req.allowEmpty).toBe(true);
      expect(req.minSourceCount).toBe(0);
    });
  });

  describe('assessContextQuality', () => {
    it('returns quality with zero sources for empty context', () => {
      const context: AssembledContext = {};
      const result = service.assessContextQuality(context);
      expect(result.sourceCount).toBe(0);
      expect(result.totalTokens).toBeLessThanOrEqual(1); // empty object JSON counts as 1 token
      expect(result.warnings.some((w) => w.type === 'empty_context')).toBe(true);
    });

    it('calculates totalTokens from primary and related', () => {
      const context: AssembledContext = {
        primary: { shardId: 'p1', shardName: 'p', shardTypeId: 't', content: 'x'.repeat(400) },
        related: [{ shardId: 'r1', shardName: 'r', shardTypeId: 't', content: 'y'.repeat(200) }],
      };
      const result = service.assessContextQuality(context);
      expect(result.totalTokens).toBeGreaterThan(0);
      // sourceCount counts related + ragChunks + sources only (not primary)
      expect(result.sourceCount).toBe(1);
    });

    it('includes relevance distribution', () => {
      const context: AssembledContext = {
        ragChunks: [
          { id: 'c1', shardId: 's1', shardName: 's', shardTypeId: 't', content: 'a', score: 0.8 },
          { id: 'c2', shardId: 's2', shardName: 's', shardTypeId: 't', content: 'b', score: 0.6 },
        ],
      };
      const result = service.assessContextQuality(context);
      expect(result.relevanceDistribution).toHaveLength(4);
      expect(result.averageRelevance).toBeGreaterThan(0);
    });

    it('respects insightType for minimum requirements', () => {
      const context: AssembledContext = {
        related: [{ shardId: 'r1', shardName: 'r', shardTypeId: 't', content: 'x' }],
      };
      const result = service.assessContextQuality(context, undefined, undefined, 'analysis');
      expect(result.minimumRequirements?.minSourceCount).toBe(3);
      expect(result.meetsMinimumRequirements).toBe(false);
    });
  });

  describe('checkMinimumRequirements', () => {
    it('returns meets true when context has enough sources', () => {
      const context: AssembledContext = {
        related: [
          { shardId: 'r1', shardName: 'r', shardTypeId: 't', content: 'a' },
          { shardId: 'r2', shardName: 'r', shardTypeId: 't', content: 'b' },
          { shardId: 'r3', shardName: 'r', shardTypeId: 't', content: 'c' },
        ],
      };
      const result = service.checkMinimumRequirements(context, 'summary');
      expect(result.meets).toBe(true);
      expect(result.failures).toHaveLength(0);
    });

    it('returns meets false and failures for empty context when not allowed', () => {
      const context: AssembledContext = {};
      const result = service.checkMinimumRequirements(context, 'analysis');
      expect(result.meets).toBe(false);
      expect(result.failures.length).toBeGreaterThan(0);
    });

    it('returns meets true for search with empty context', () => {
      const context: AssembledContext = {};
      const result = service.checkMinimumRequirements(context, 'search');
      expect(result.meets).toBe(true);
    });
  });
});
