/**
 * Embedding Template Service
 * Handles embedding template retrieval, text extraction, preprocessing, and normalization
 */

import { v4 as uuidv4 } from 'uuid';

export interface EmbeddingFieldConfig {
  name: string;
  weight: number; // 0.0 to 1.0
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
  modelId?: string; // For custom strategy
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

// Default template for fallback
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
  /**
   * Get embedding template for a shard type
   * Falls back to default if not defined
   */
  getTemplate(shardType: any): EmbeddingTemplate {
    if (shardType?.embeddingTemplate) {
      return shardType.embeddingTemplate;
    }

    // Return default template
    const now = new Date();
    return {
      id: uuidv4(),
      ...DEFAULT_EMBEDDING_TEMPLATE,
      createdAt: now,
      createdBy: 'system',
      updatedAt: now,
    };
  }

  /**
   * Extract text from shard data using template field configuration
   */
  extractText(shard: any, template: EmbeddingTemplate, options?: ApplyTemplateOptions): string {
    const maxLength = options?.maxTextLength ?? 8000;

    try {
      const textParts: string[] = [];
      const structuredData = shard.structuredData || shard.data || {};

      // Sort fields by weight (descending) so higher weight fields come first
      const sortedFields = [...template.fields].sort((a, b) => b.weight - a.weight);

      for (const fieldConfig of sortedFields) {
        if (!fieldConfig.include) {
          continue;
        }

        let fieldText = this.extractFieldText(structuredData, fieldConfig);

        if (!fieldText) {
          continue;
        }

        // Apply field-specific preprocessing
        if (fieldConfig.preprocess) {
          fieldText = this.preprocessFieldText(fieldText, fieldConfig.preprocess);
        }

        if (fieldText.length > 0) {
          textParts.push(fieldText);
        }
      }

      // Combine all field texts
      const separator = template.preprocessing.fieldSeparator || ' ';
      let combinedText = textParts.join(separator);

      // Truncate to max length
      if (combinedText.length > maxLength) {
        combinedText = combinedText.substring(0, maxLength);
      }

      return combinedText.trim();
    } catch (error: any) {
      throw new Error(`Failed to extract text from shard: ${error.message}`);
    }
  }

  /**
   * Extract text from a specific field in structured data
   */
  private extractFieldText(data: any, fieldConfig: EmbeddingFieldConfig): string {
    if (fieldConfig.name === 'all') {
      // Special case: combine all fields
      const allText = Object.entries(data)
        .map(([_, value]) => this.valueToString(value))
        .filter(Boolean)
        .join(' ');
      return allText;
    }

    const value = data[fieldConfig.name];
    if (!value) {
      return '';
    }

    if (typeof value === 'object' && !Array.isArray(value) && fieldConfig.nestedFields) {
      // Extract nested fields
      const nestedTexts = fieldConfig.nestedFields
        .map((nested) => this.valueToString(value[nested]))
        .filter(Boolean);
      return nestedTexts.join(' ');
    }

    return this.valueToString(value);
  }

  /**
   * Convert any value to string representation
   */
  private valueToString(value: any): string {
    if (!value) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.valueToString(item)).join(' ');
    }
    if (typeof value === 'object') {
      return Object.entries(value)
        .map(([_, v]) => this.valueToString(v))
        .filter(Boolean)
        .join(' ');
    }
    return '';
  }

  /**
   * Apply field-specific preprocessing
   */
  private preprocessFieldText(text: string, preprocess: EmbeddingFieldConfig['preprocess']): string {
    let processed = text;

    if (preprocess?.maxLength && processed.length > preprocess.maxLength) {
      processed = processed.substring(0, preprocess.maxLength);
    }

    if (preprocess?.lowercase) {
      processed = processed.toLowerCase();
    }

    if (preprocess?.stripFormatting) {
      // Remove HTML tags and markdown
      processed = processed.replace(/<[^>]*>/g, '');
      processed = processed.replace(/[#*_`~]/g, '');
    }

    return processed;
  }

  /**
   * Preprocess text before embedding
   */
  preprocessText(
    text: string,
    config: EmbeddingPreprocessingConfig,
    options?: {
      contextPrefix?: string;
      applyPrefixToEachChunk?: boolean;
      separatorOverride?: string;
    }
  ): { text: string; chunks: string[] } {
    let processed = text.trim();

    // Normalize whitespace
    processed = processed.replace(/\s+/g, ' ');

    // Apply chunking if configured
    let chunks: string[] = [];
    if (config.chunking) {
      chunks = this.createChunks(processed, config.chunking);
    } else {
      chunks = [processed];
    }

    // Apply context prefix if provided
    if (options?.contextPrefix) {
      const separator = options.separatorOverride || config.fieldSeparator || ' ';
      if (options.applyPrefixToEachChunk) {
        chunks = chunks.map((chunk) => `${options.contextPrefix}${separator}${chunk}`);
      } else {
        processed = `${options.contextPrefix}${separator}${processed}`;
        chunks[0] = processed;
      }
    }

    return {
      text: processed,
      chunks,
    };
  }

  /**
   * Create chunks from text
   */
  private createChunks(text: string, chunking: EmbeddingPreprocessingConfig['chunking']): string[] {
    if (!chunking) {
      return [text];
    }

    const chunkSize = chunking.chunkSize || 512;
    const overlap = chunking.overlap || 50;
    const minChunkSize = chunking.minChunkSize || chunkSize / 2;
    const maxChunkSize = chunking.maxChunkSize || chunkSize * 2;

    const chunks: string[] = [];

    if (chunking.splitBySentence) {
      // Split by sentences first, then chunk
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
      let currentChunk = '';

      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length <= chunkSize) {
          currentChunk += sentence;
        } else {
          if (currentChunk.length >= minChunkSize) {
            chunks.push(currentChunk.trim());
          }
          // Start new chunk with overlap
          const overlapText = currentChunk.slice(-overlap);
          currentChunk = overlapText + sentence;
        }
      }

      if (currentChunk.trim().length >= minChunkSize) {
        chunks.push(currentChunk.trim());
      }
    } else {
      // Simple character-based chunking
      let start = 0;
      while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        const chunk = text.slice(start, end);
        if (chunk.length >= minChunkSize) {
          chunks.push(chunk);
        }
        start = end - overlap;
      }
    }

    return chunks.filter((chunk) => chunk.length > 0);
  }

  /**
   * Apply L2 normalization to embedding vector
   */
  normalizeVector(embedding: number[]): number[] {
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) {
      return embedding;
    }
    return embedding.map((val) => val / magnitude);
  }

  /**
   * Apply normalization config to embeddings
   */
  normalizeEmbedding(embedding: number[], config: EmbeddingNormalizationConfig): number[] {
    let normalized = [...embedding];

    if (config.l2Normalize) {
      normalized = this.normalizeVector(normalized);
    }

    if (config.minMaxScale) {
      const min = Math.min(...normalized);
      const max = Math.max(...normalized);
      const range = max - min;
      if (range > 0) {
        normalized = normalized.map((val) => (val - min) / range);
      }
    }

    if (config.removeOutliers) {
      // Remove outliers (values beyond 3 standard deviations)
      const mean = normalized.reduce((sum, val) => sum + val, 0) / normalized.length;
      const variance = normalized.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / normalized.length;
      const stdDev = Math.sqrt(variance);
      const threshold = 3 * stdDev;

      normalized = normalized.map((val) => {
        if (Math.abs(val - mean) > threshold) {
          return mean; // Replace outlier with mean
        }
        return val;
      });
    }

    return normalized;
  }

  /**
   * Get model ID based on template configuration and shard type
   */
  getModelId(template: EmbeddingTemplate, shardTypeName?: string): string {
    // Critical shard types use quality model
    const criticalShardTypes = ['c_opportunity', 'c_account', 'c_contact'];
    const isCritical = shardTypeName && criticalShardTypes.includes(shardTypeName);

    switch (template.modelConfig.strategy) {
      case 'quality':
      case 'custom':
        return template.modelConfig.modelId || 'text-embedding-3-large';
      case 'fast':
        return 'text-embedding-3-small';
      case 'default':
      default:
        // Use quality model for critical shard types, default for others
        return isCritical ? 'text-embedding-3-large' : 'text-embedding-3-small';
    }
  }

  /**
   * Create embedding result metadata
   */
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
      processingTimeMs: 0, // Will be set by caller
    };
  }
}
