/**
 * Embedding Template Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmbeddingTemplateService } from '../../../src/services/EmbeddingTemplateService';
import type { EmbeddingTemplate, EmbeddingPreprocessingConfig, EmbeddingNormalizationConfig } from '../../../src/services/EmbeddingTemplateService';

vi.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

describe('EmbeddingTemplateService', () => {
  let service: EmbeddingTemplateService;

  beforeEach(() => {
    service = new EmbeddingTemplateService();
  });

  describe('getTemplate', () => {
    it('should return shardType.embeddingTemplate when present', () => {
      const custom = { id: 't1', name: 'Custom', fields: [], preprocessing: {} as any, normalization: {} as any, modelConfig: {} as any, isDefault: false, storeInShard: true, enableVectorSearch: true, version: 1, createdAt: new Date(), createdBy: 'u', updatedAt: new Date() };
      const shardType = { embeddingTemplate: custom };
      expect(service.getTemplate(shardType)).toBe(custom);
    });

    it('should return default template when shardType has no embeddingTemplate', () => {
      const t = service.getTemplate({});
      expect(t.id).toBe('mock-uuid');
      expect(t.name).toBe('Default Embedding Template');
      expect(t.isDefault).toBe(true);
      expect(t.fields.length).toBeGreaterThan(0);
    });
  });

  describe('extractText', () => {
    it('should extract and combine fields by weight', () => {
      const template: EmbeddingTemplate = {
        id: '1',
        version: 1,
        name: 'Test',
        isDefault: false,
        fields: [
          { name: 'name', weight: 1.0, include: true },
          { name: 'description', weight: 0.8, include: true },
        ],
        preprocessing: { combineFields: true, fieldSeparator: ' ' },
        normalization: { l2Normalize: true },
        modelConfig: { strategy: 'default' },
        storeInShard: true,
        enableVectorSearch: true,
        createdAt: new Date(),
        createdBy: 'system',
        updatedAt: new Date(),
      };
      const shard = { structuredData: { name: 'A', description: 'B' } };
      expect(service.extractText(shard, template)).toBe('A B');
    });

    it('should skip fields with include: false', () => {
      const template: EmbeddingTemplate = {
        id: '1',
        version: 1,
        name: 'Test',
        isDefault: false,
        fields: [
          { name: 'name', weight: 1.0, include: true },
          { name: 'skip', weight: 0.5, include: false },
        ],
        preprocessing: { combineFields: true, fieldSeparator: ' ' },
        normalization: { l2Normalize: true },
        modelConfig: { strategy: 'default' },
        storeInShard: true,
        enableVectorSearch: true,
        createdAt: new Date(),
        createdBy: 'system',
        updatedAt: new Date(),
      };
      const shard = { structuredData: { name: 'X', skip: 'Y' } };
      expect(service.extractText(shard, template)).toBe('X');
    });

    it('should truncate to maxTextLength when provided', () => {
      const template: EmbeddingTemplate = {
        id: '1',
        version: 1,
        name: 'Test',
        isDefault: false,
        fields: [{ name: 'x', weight: 1.0, include: true }],
        preprocessing: { combineFields: true },
        normalization: { l2Normalize: true },
        modelConfig: { strategy: 'default' },
        storeInShard: true,
        enableVectorSearch: true,
        createdAt: new Date(),
        createdBy: 'system',
        updatedAt: new Date(),
      };
      const shard = { structuredData: { x: 'a'.repeat(100) } };
      expect(service.extractText(shard, template, { maxTextLength: 10 })).toBe('a'.repeat(10));
    });
  });

  describe('preprocessText', () => {
    it('should normalize whitespace and return single chunk when no chunking', () => {
      const config: EmbeddingPreprocessingConfig = { combineFields: true };
      const { text, chunks } = service.preprocessText('  a   b   c  ', config);
      expect(text).toBe('a b c');
      expect(chunks).toEqual(['a b c']);
    });

    it('should create chunks when chunking configured', () => {
      const config: EmbeddingPreprocessingConfig = {
        combineFields: true,
        chunking: { chunkSize: 5, overlap: 1, splitBySentence: false },
      };
      const { chunks } = service.preprocessText('abcd efgh ij', config);
      expect(chunks.length).toBeGreaterThan(1);
    });
  });

  describe('normalizeVector', () => {
    it('should L2-normalize a vector', () => {
      const v = [3, 4];
      const n = service.normalizeVector(v);
      const mag = Math.sqrt(n[0] * n[0] + n[1] * n[1]);
      expect(Math.abs(mag - 1)).toBeLessThan(1e-10);
    });

    it('should return zeros unchanged when magnitude is 0', () => {
      expect(service.normalizeVector([0, 0])).toEqual([0, 0]);
    });
  });

  describe('normalizeEmbedding', () => {
    it('should apply l2Normalize', () => {
      const cfg: EmbeddingNormalizationConfig = { l2Normalize: true };
      const v = [3, 4];
      const n = service.normalizeEmbedding(v, cfg);
      const mag = Math.sqrt(n[0] * n[0] + n[1] * n[1]);
      expect(Math.abs(mag - 1)).toBeLessThan(1e-10);
    });

    it('should apply minMaxScale when set', () => {
      const cfg: EmbeddingNormalizationConfig = { l2Normalize: false, minMaxScale: true };
      const v = [1, 2, 3];
      const n = service.normalizeEmbedding(v, cfg);
      expect(Math.min(...n)).toBe(0);
      expect(Math.max(...n)).toBe(1);
    });
  });

  describe('getModelId', () => {
    const baseTemplate = (strategy: 'default' | 'fast' | 'quality' | 'custom', modelId?: string): EmbeddingTemplate => ({
      id: '1',
      version: 1,
      name: 'T',
      isDefault: false,
      fields: [],
      preprocessing: { combineFields: true },
      normalization: { l2Normalize: true },
      modelConfig: { strategy, modelId },
      storeInShard: true,
      enableVectorSearch: true,
      createdAt: new Date(),
      createdBy: 's',
      updatedAt: new Date(),
    });

    it('should return text-embedding-3-large for quality', () => {
      expect(service.getModelId(baseTemplate('quality'))).toBe('text-embedding-3-large');
    });

    it('should return text-embedding-3-small for fast', () => {
      expect(service.getModelId(baseTemplate('fast'))).toBe('text-embedding-3-small');
    });

    it('should return text-embedding-3-large for critical shard types with default', () => {
      expect(service.getModelId(baseTemplate('default'), 'c_opportunity')).toBe('text-embedding-3-large');
      expect(service.getModelId(baseTemplate('default'), 'c_account')).toBe('text-embedding-3-large');
    });

    it('should return text-embedding-3-small for non-critical with default', () => {
      expect(service.getModelId(baseTemplate('default'), 'c_custom')).toBe('text-embedding-3-small');
    });

    it('should return modelId for custom when set', () => {
      expect(service.getModelId(baseTemplate('custom', 'custom-model'))).toBe('custom-model');
    });
  });

  describe('createEmbeddingResult', () => {
    it('should build result with dimensions from embedding length', () => {
      const t = service.getTemplate({});
      const r = service.createEmbeddingResult([0.1, 0.2, 0.3], 'hi', t, 'model-x');
      expect(r.embedding).toEqual([0.1, 0.2, 0.3]);
      expect(r.text).toBe('hi');
      expect(r.model).toBe('model-x');
      expect(r.dimensions).toBe(3);
      expect(r.chunks).toBeUndefined();
    });
  });
});
