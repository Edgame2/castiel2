/**
 * Embedding Template Service
 *
 * Responsible for:
 * - Retrieving embedding templates for shard types
 * - Preprocessing shard data before embedding generation
 * - Applying field weighting and text extraction
 * - Normalizing embeddings post-generation
 * - Providing fallback to default template
 */

import { v4 as uuidv4 } from 'uuid';
import type { Shard, StructuredData } from '../types/shard.types.js';
import type { ShardType } from '../types/shard-type.types.js';
import type {
  EmbeddingTemplate,
  EmbeddingFieldConfig,
  EmbeddingPreprocessingConfig,
  EmbeddingNormalizationConfig,
  EmbeddingResult,
  ApplyTemplateOptions,
} from '../types/embedding-template.types.js';
import { DEFAULT_EMBEDDING_TEMPLATE as DEFAULT_TEMPLATE } from '../types/embedding-template.types.js';
import type { IMonitoringProvider } from '@castiel/monitoring';

export class EmbeddingTemplateService {
  constructor(private monitoring: IMonitoringProvider) {}

  /**
   * Get embedding template for a shard type
   * Falls back to default if not defined
   */
  getTemplate(shardType: ShardType): EmbeddingTemplate {
    if (shardType.embeddingTemplate) {
      return shardType.embeddingTemplate;
    }

    // Return default template
    const now = new Date();
    return {
      id: uuidv4(),
      version: DEFAULT_TEMPLATE.version,
      name: DEFAULT_TEMPLATE.name,
      description: DEFAULT_TEMPLATE.description,
      isDefault: DEFAULT_TEMPLATE.isDefault,
      fields: DEFAULT_TEMPLATE.fields,
      preprocessing: DEFAULT_TEMPLATE.preprocessing,
      normalization: DEFAULT_TEMPLATE.normalization,
      modelConfig: DEFAULT_TEMPLATE.modelConfig,
      storeInShard: DEFAULT_TEMPLATE.storeInShard,
      enableVectorSearch: DEFAULT_TEMPLATE.enableVectorSearch,
      createdAt: now,
      createdBy: 'system',
      updatedAt: now,
    };
  }

  /**
   * Extract text from shard data using template field configuration
   */
  extractText(shard: Shard, template: EmbeddingTemplate, options?: ApplyTemplateOptions): string {
    const maxLength = options?.maxTextLength ?? 8000;

    try {
      const textParts: string[] = [];

      for (const fieldConfig of template.fields) {
        if (!fieldConfig.include) {continue;}

        let fieldText = this.extractFieldText(shard.structuredData, fieldConfig);

        if (!fieldText) {continue;}

        // Apply field-specific preprocessing
        if (fieldConfig.preprocess) {
          fieldText = this.preprocessFieldText(fieldText, fieldConfig.preprocess);
        }

        // Apply weight (represented by field importance in ordering/selection)
        // Higher weight means field comes earlier and is less likely to be truncated
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
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'embedding-template.extractText',
        shardId: shard.id,
        shardTypeId: shard.shardTypeId,
      });
      throw error;
    }
  }

  /**
   * Extract text from a specific field in structured data
   * Handles nested fields
   */
  private extractFieldText(data: StructuredData, fieldConfig: EmbeddingFieldConfig): string {
    if (fieldConfig.name === 'all') {
      // Special case: combine all fields
      const allText = Object.entries(data)
        .map(([_, value]) => this.valueToString(value))
        .filter(Boolean)
        .join(' ');
      return allText;
    }

    const value = data[fieldConfig.name];
    if (!value) {return '';}

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
    if (!value) {return '';}
    if (typeof value === 'string') {return value;}
    if (typeof value === 'number' || typeof value === 'boolean') {return String(value);}
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
  private preprocessFieldText(
    text: string,
    preprocess: EmbeddingFieldConfig['preprocess']
  ): string {
    if (!preprocess) {return text;}

    let result = text;

    if (preprocess.maxLength) {
      result = result.substring(0, preprocess.maxLength);
    }

    if (preprocess.lowercase) {
      result = result.toLowerCase();
    }

    if (preprocess.stripFormatting) {
      // Remove markdown/HTML tags
      result = result.replace(/<[^>]*>/g, '').replace(/[*_`#\[\]()]/g, '');
    }

    return result.trim();
  }

  /**
   * Apply preprocessing to text before embedding
   * This includes chunking, normalization, etc.
   */
  preprocessText(
    text: string,
    config: EmbeddingPreprocessingConfig,
    options?: { contextPrefix?: string; applyPrefixToEachChunk?: boolean; separatorOverride?: string }
  ): {
    text: string;
    chunks: string[];
  } {
    try {
      let result = text;

      // Remove extra whitespace
      result = result.replace(/\s+/g, ' ').trim();

      // Apply language-specific preprocessing if needed
      if (config.language === 'en') {
        // Could add English-specific rules here
      }

      // If a context prefix is provided and not applying to each chunk, prepend before chunking
      if (options?.contextPrefix && !options?.applyPrefixToEachChunk) {
        const sep = options?.separatorOverride || config.contextPrefixSeparator || ' — ';
        // Keep prefix compact
        result = `${options.contextPrefix}${sep}${result}`.trim();
      }

      // Create chunks if needed
      let chunks = this.createChunks(result, config.chunking);

      // Optionally prepend the context prefix to every chunk
      if (options?.contextPrefix && options?.applyPrefixToEachChunk) {
        const sep = options?.separatorOverride || config.contextPrefixSeparator || ' — ';
        chunks = chunks.map((c) => `${options.contextPrefix}${sep}${c}`.trim());
      }

      return {
        text: result,
        chunks,
      };
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'embedding-template.preprocessText',
      });
      throw error;
    }
  }

  /**
   * Create chunks from text for embedding
   */
  private createChunks(
    text: string,
    chunking?: EmbeddingPreprocessingConfig['chunking']
  ): string[] {
    if (!chunking || !chunking.chunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    const chunkSize = chunking.chunkSize;
    const overlap = chunking.overlap ?? 0;
    const minChunkSize = chunking.minChunkSize ?? 0;
    // const maxChunkSize = chunking.maxChunkSize ?? chunkSize * 2; // reserved for future clamping logic

    if (text.length <= chunkSize) {
      return [text];
    }

    if (chunking.splitBySentence) {
      // Split by sentences first
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
      let currentChunk = '';

      for (const sentence of sentences) {
        const testChunk = currentChunk + ' ' + sentence;

        if (testChunk.length <= chunkSize) {
          currentChunk = testChunk.trim();
        } else {
          if (currentChunk.length >= minChunkSize) {
            chunks.push(currentChunk);
          }
          currentChunk = sentence.trim();
        }
      }

      if (currentChunk.length >= minChunkSize) {
        chunks.push(currentChunk);
      }
    } else {
      // Simple character-based chunking
      let pos = 0;
      while (pos < text.length) {
        const chunk = text.substring(pos, pos + chunkSize);
        if (chunk.length >= minChunkSize) {
          chunks.push(chunk);
        }
        pos += chunkSize - overlap;
      }
    }

    return chunks.filter((c) => c.length > 0);
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
    let result = [...embedding];

    if (config.l2Normalize) {
      result = this.normalizeVector(result);
    }

    if (config.minMaxScale) {
      const min = Math.min(...result);
      const max = Math.max(...result);
      const range = max - min || 1;
      result = result.map((val) => (val - min) / range);
    }

    if (config.removeOutliers) {
      const mean = result.reduce((a, b) => a + b, 0) / result.length;
      const stdDev = Math.sqrt(
        result.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / result.length
      );

      result = result.map((val) => {
        const zScore = (val - mean) / (stdDev || 1);
        return Math.abs(zScore) > 3 ? mean : val;
      });
    }

    return result;
  }

  /**
   * Create embedding result metadata
   */
  createEmbeddingResult(
    embedding: number[],
    template: EmbeddingTemplate,
    embeddedText: string,
    metadata: {
      model: string;
      tokenCount: number;
      processingTime?: number;
    },
    chunks?: string[]
  ): EmbeddingResult {
    return {
      embedding,
      templateVersion: template.version,
      embeddedText,
      chunks,
      metadata: {
        ...metadata,
        dimensions: embedding.length,
      },
    };
  }

  /**
   * Validate template configuration
   */
  validateTemplate(template: EmbeddingTemplate): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!template.id) {errors.push('Template must have an id');}
    if (!template.fields || template.fields.length === 0) {errors.push('Template must have at least one field');}
    if (!template.preprocessing) {errors.push('Template must have preprocessing config');}
    if (!template.normalization) {errors.push('Template must have normalization config');}
    if (!template.modelConfig) {errors.push('Template must have model config');}

    // Validate field weights (accept both 0-1 and 0-100 range)
    for (const field of template.fields || []) {
      if (field.weight < 0 || field.weight > 100) {
        errors.push(`Field '${field.name}' weight must be between 0 and 100`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get effective model ID for template
   */
  getModelId(template: EmbeddingTemplate, options?: ApplyTemplateOptions): string {
    if (options?.modelId) {
      return options.modelId;
    }

    if (template.modelConfig.modelId) {
      return template.modelConfig.modelId;
    }

    // Fallback based on strategy
    switch (template.modelConfig.strategy) {
      case 'fast':
        return 'text-embedding-3-small';
      case 'quality':
        return 'text-embedding-3-large';
      case 'default':
      default:
        return 'text-embedding-3-small';
    }
  }
}
