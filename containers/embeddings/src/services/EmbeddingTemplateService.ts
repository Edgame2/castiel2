/**
 * Embedding Template Service
 * Handles embedding template retrieval, text extraction, preprocessing, and normalization
 */

import { v4 as uuidv4 } from 'uuid';

export interface EmbeddingFieldConfig {
  name: string;
  weight: number;
  include: boolean;
  preprocess?: {
    maxLength?: number;
    lowercase?: boolean;
    stripFormatting?: boolean;
    extractSections?: string[];
  };
  nestedFields?: string[];
}

export interface EmbeddingPreprocessingConfig {
  combineFields: boolean;
  fieldSeparator?: string;
  chunking?: {
    chunkSize: number;
    overlap: number;
    splitBySentence: boolean;
    minChunkSize?: number;
    maxChunkSize?: number;
  };
  language?: string;
  removeStopWords?: boolean;
  normalize?: boolean;
}

export interface EmbeddingNormalizationConfig {
  l2Normalize: boolean;
  minMaxScale?: boolean;
  removeOutliers?: boolean;
}

export interface EmbeddingModelConfig {
  strategy: 'default' | 'fast' | 'quality' | 'custom';
  modelId?: string;
}

export interface EmbeddingTemplate {
  id: string;
  version: number;
  name: string;
  description?: string;
  isDefault: boolean;
  fields: EmbeddingFieldConfig[];
  preprocessing: EmbeddingPreprocessingConfig;
  normalization: EmbeddingNormalizationConfig;
  modelConfig: EmbeddingModelConfig;
  storeInShard: boolean;
  enableVectorSearch: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
}

export interface ApplyTemplateOptions {
  maxTextLength?: number;
  contextPrefix?: string;
  applyPrefixToEachChunk?: boolean;
}

export interface EmbeddingResult {
  embedding: number[];
  text: string;
  chunks?: string[];
  template: EmbeddingTemplate;
  model: string;
  dimensions: number;
  processingTimeMs: number;
}

const DEFAULT_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> = {
  version: 1,
  name: 'Default Embedding Template',
  description: 'Default template for all shard types',
  isDefault: true,
  fields: [
    { name: 'name', weight: 1.0, include: true },
    { name: 'title', weight: 1.0, include: true },
    { name: 'description', weight: 0.8, include: true },
    { name: 'content', weight: 0.8, include: true },
    { name: 'summary', weight: 0.8, include: true },
    { name: 'tags', weight: 0.5, include: true },
    { name: 'metadata', weight: 0.3, include: true },
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 512,
      overlap: 50,
      splitBySentence: true,
    },
  },
  normalization: {
    l2Normalize: true,
  },
  modelConfig: {
    strategy: 'default',
  },
  storeInShard: true,
  enableVectorSearch: true,
};

export class EmbeddingTemplateService {
  getTemplate(shardType: any): EmbeddingTemplate {
    if (shardType?.embeddingTemplate) {
      return shardType.embeddingTemplate;
    }
    const now = new Date();
    return {
      id: uuidv4(),
      ...DEFAULT_EMBEDDING_TEMPLATE,
      createdAt: now,
      createdBy: 'system',
      updatedAt: now,
    };
  }

  extractText(shard: any, template: EmbeddingTemplate, options?: ApplyTemplateOptions): string {
    const maxLength = options?.maxTextLength ?? 8000;
    try {
      const textParts: string[] = [];
      const structuredData = shard.structuredData || shard.data || {};
      const sortedFields = [...template.fields].sort((a, b) => b.weight - a.weight);
      for (const fieldConfig of sortedFields) {
        if (!fieldConfig.include) continue;
        let fieldText = this.extractFieldText(structuredData, fieldConfig);
        if (!fieldText) continue;
        if (fieldConfig.preprocess) {
          fieldText = this.preprocessFieldText(fieldText, fieldConfig.preprocess);
        }
        if (fieldText.length > 0) textParts.push(fieldText);
      }
      const separator = template.preprocessing.fieldSeparator || ' ';
      let combinedText = textParts.join(separator);
      if (combinedText.length > maxLength) combinedText = combinedText.substring(0, maxLength);
      return combinedText.trim();
    } catch (error: any) {
      throw new Error(`Failed to extract text from shard: ${error.message}`);
    }
  }

  private extractFieldText(data: any, fieldConfig: EmbeddingFieldConfig): string {
    if (fieldConfig.name === 'all') {
      return Object.entries(data)
        .map(([_, value]) => this.valueToString(value))
        .filter(Boolean)
        .join(' ');
    }
    const value = data[fieldConfig.name];
    if (!value) return '';
    if (typeof value === 'object' && !Array.isArray(value) && fieldConfig.nestedFields) {
      return fieldConfig.nestedFields
        .map((nested) => this.valueToString(value[nested]))
        .filter(Boolean)
        .join(' ');
    }
    return this.valueToString(value);
  }

  private valueToString(value: any): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return value.map((item) => this.valueToString(item)).join(' ');
    if (typeof value === 'object') {
      return Object.entries(value)
        .map(([_, v]) => this.valueToString(v))
        .filter(Boolean)
        .join(' ');
    }
    return '';
  }

  private preprocessFieldText(text: string, preprocess: EmbeddingFieldConfig['preprocess']): string {
    let processed = text;
    if (preprocess?.maxLength && processed.length > preprocess.maxLength) {
      processed = processed.substring(0, preprocess.maxLength);
    }
    if (preprocess?.lowercase) processed = processed.toLowerCase();
    if (preprocess?.stripFormatting) {
      processed = processed.replace(/<[^>]*>/g, '').replace(/[#*_`~]/g, '');
    }
    return processed;
  }

  preprocessText(
    text: string,
    config: EmbeddingPreprocessingConfig,
    options?: { contextPrefix?: string; applyPrefixToEachChunk?: boolean; separatorOverride?: string }
  ): { text: string; chunks: string[] } {
    let processed = text.trim().replace(/\s+/g, ' ');
    let chunks: string[] = [];
    if (config.chunking) {
      chunks = this.createChunks(processed, config.chunking);
    } else {
      chunks = [processed];
    }
    if (options?.contextPrefix) {
      const separator = options.separatorOverride || config.fieldSeparator || ' ';
      if (options.applyPrefixToEachChunk) {
        chunks = chunks.map((chunk) => `${options.contextPrefix}${separator}${chunk}`);
      } else {
        processed = `${options.contextPrefix}${separator}${processed}`;
        chunks[0] = processed;
      }
    }
    return { text: processed, chunks };
  }

  private createChunks(text: string, chunking: EmbeddingPreprocessingConfig['chunking']): string[] {
    if (!chunking) return [text];
    const chunkSize = chunking.chunkSize || 512;
    const overlap = chunking.overlap || 50;
    const minChunkSize = chunking.minChunkSize ?? chunkSize / 2;
    const chunks: string[] = [];
    if (chunking.splitBySentence) {
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
      let currentChunk = '';
      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length <= chunkSize) {
          currentChunk += sentence;
        } else {
          if (currentChunk.length >= minChunkSize) chunks.push(currentChunk.trim());
          currentChunk = currentChunk.slice(-overlap) + sentence;
        }
      }
      if (currentChunk.trim().length >= minChunkSize) chunks.push(currentChunk.trim());
    } else {
      let start = 0;
      while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        const chunk = text.slice(start, end);
        if (chunk.length >= minChunkSize) chunks.push(chunk);
        start = end - overlap;
      }
    }
    return chunks.filter((chunk) => chunk.length > 0);
  }

  normalizeVector(embedding: number[]): number[] {
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) return embedding;
    return embedding.map((val) => val / magnitude);
  }

  normalizeEmbedding(embedding: number[], config: EmbeddingNormalizationConfig): number[] {
    let normalized = [...embedding];
    if (config.l2Normalize) normalized = this.normalizeVector(normalized);
    if (config.minMaxScale) {
      const min = Math.min(...normalized);
      const max = Math.max(...normalized);
      const range = max - min;
      if (range > 0) normalized = normalized.map((val) => (val - min) / range);
    }
    if (config.removeOutliers) {
      const mean = normalized.reduce((sum, val) => sum + val, 0) / normalized.length;
      const variance = normalized.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / normalized.length;
      const stdDev = Math.sqrt(variance);
      const threshold = 3 * stdDev;
      normalized = normalized.map((val) => (Math.abs(val - mean) > threshold ? mean : val));
    }
    return normalized;
  }

  getModelId(template: EmbeddingTemplate, shardTypeName?: string): string {
    const criticalShardTypes = ['c_opportunity', 'c_account', 'c_contact'];
    const isCritical = shardTypeName && criticalShardTypes.includes(shardTypeName);
    switch (template.modelConfig.strategy) {
      case 'quality':
      case 'custom':
        return template.modelConfig.modelId || 'text-embedding-3-large';
      case 'fast':
        return 'text-embedding-3-small';
      default:
        return isCritical ? 'text-embedding-3-large' : 'text-embedding-3-small';
    }
  }

  createEmbeddingResult(
    embedding: number[],
    text: string,
    template: EmbeddingTemplate,
    model: string,
    chunks?: string[]
  ): EmbeddingResult {
    return {
      embedding,
      text,
      chunks,
      template,
      model,
      dimensions: embedding.length,
      processingTimeMs: 0,
    };
  }
}
