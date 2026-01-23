/**
 * Embedding Template Types
 * Defines how shards should be embedded using AI models for vector search
 *
 * Templates are stored in ShardType and specify:
 * - Which fields to include and their weights
 * - How to preprocess data before embedding
 * - Which embedding model to use
 * - How to normalize and store embeddings
 */

/**
 * Field configuration for embedding
 * Determines how a field contributes to the embedding
 */
export interface EmbeddingFieldConfig {
  /** Field name from the shard's structured data */
  name: string;

  /** Weight/importance of this field (0.0 to 1.0, default 1.0) */
  weight: number;

  /** Whether to include this field in embedding generation */
  include: boolean;

  /** Optional field-specific preprocessing */
  preprocess?: {
    /** Truncate field to max characters */
    maxLength?: number;
    /** Whether to lowercase the text */
    lowercase?: boolean;
    /** Strip HTML/markdown */
    stripFormatting?: boolean;
    /** Extract key sections only */
    extractSections?: string[];
  };

  /** For nested objects, which sub-fields to include */
  nestedFields?: string[];

  /** If true, prepend this field as a lightweight context prefix to chunks */
  asContextPrefix?: boolean;
  /** Optional hard cap for this field when used as context (characters) */
  maxLength?: number;
}

/**
 * Preprocessing configuration for embedding
 * Defines how to transform shard data before embedding
 */
export interface EmbeddingPreprocessingConfig {
  /** Whether to combine all fields into single text */
  combineFields: boolean;

  /** Separator when combining fields */
  fieldSeparator?: string;

  /** Chunk the text into smaller pieces */
  chunking?: {
    /** Characters per chunk (default 512) */
    chunkSize: number;

    /** Overlap between chunks (default 50 characters) */
    overlap: number;

    /** Split at sentence boundaries when possible */
    splitBySentence: boolean;

    /** Min/max chunk sizes */
    minChunkSize?: number;
    maxChunkSize?: number;
  };

  /** Language-specific preprocessing */
  language?: string;

  /** Remove common stop words */
  removeStopWords?: boolean;

  /** Apply stemming/lemmatization */
  normalize?: boolean;

  /** Separator between an optional context prefix and content */
  contextPrefixSeparator?: string;
}

/**
 * Parent (e.g., c_project) lightweight context configuration
 */
export interface ParentContextConfig {
  /** Inclusion mode */
  mode: 'whenScoped' | 'always' | 'never';
  /** Expected parent shard type identifier (e.g., 'c_project'); purely informational unless enforced at caller */
  sourceShardType?: string;
  /** Relative importance; used when concatenating or reweighting */
  weight?: number; // 0.0 - 1.0
  /** Fields to include from the parent structured data (e.g., ['name','tags','summary']) */
  fields?: string[];
  /** Prepend as a prefix to each chunk (recommended) */
  asContextPrefix?: boolean;
  /** Separator between context and content */
  separator?: string;
  /** Max characters to include from parent context */
  maxLength?: number;
}

/**
 * Normalization configuration for embeddings
 * Defines how to process the raw embedding vectors
 */
export interface EmbeddingNormalizationConfig {
  /** L2 normalize vectors (recommended for cosine similarity) */
  l2Normalize: boolean;

  /** Min-max scaling */
  minMaxScale?: boolean;

  /** Remove outliers (z-score > 3) */
  removeOutliers?: boolean;

  /** Dimensionality reduction (e.g., PCA) */
  reduction?: {
    enabled: boolean;
    targetDimensions?: number;
  };
}

/**
 * Model selection strategy
 */
export type ModelSelectionStrategy = 'default' | 'fast' | 'quality' | 'custom';

/**
 * Embedding model configuration
 * Specifies which AI model to use for embedding generation
 */
export interface EmbeddingModelConfig {
  /** Strategy for model selection */
  strategy: ModelSelectionStrategy;

  /** Specific model ID (e.g., 'text-embedding-3-small') */
  modelId?: string;

  /** Fallback model if primary fails */
  fallbackModelId?: string;

  /** Model-specific parameters */
  parameters?: {
    dimensions?: number;
    encodingFormat?: 'float' | 'base64';
    // Add more as needed
  };
}

/**
 * Embedding template configuration
 * Defines how to generate embeddings for a specific shard type
 *
 * Usage:
 * - Stored in ShardType.embeddingTemplate
 * - Used by EmbeddingTemplateService to guide embedding generation
 * - Applied during shard creation/update
 */
export interface EmbeddingTemplate {
  /** Template ID (UUID) */
  id: string;

  /** Template version for evolution tracking */
  version: number;

  /** Descriptive name */
  name: string;

  /** Template description */
  description?: string;

  /** Whether this is the default template for the shard type */
  isDefault: boolean;

  /**
   * Field configuration and weighting
   *
   * Recommendation:
   * - Priority fields (title, description): weight 1.0
   * - Content fields (body, summary): weight 0.8
   * - Metadata fields (tags, category): weight 0.5
   * - Optional fields: weight 0.3
   */
  fields: EmbeddingFieldConfig[];

  /**
   * Preprocessing rules before embedding
   *
   * Recommendation:
   * - combineFields: true (merge all fields into cohesive text)
   * - chunking: enabled for documents > 2000 chars
   * - chunkSize: 512 tokens (balances context and cost)
   * - splitBySentence: true (preserve semantic boundaries)
   * - removeStopWords: false (preserve semantics for embeddings)
   */
  preprocessing: EmbeddingPreprocessingConfig;

  /**
   * Post-processing of embeddings
   *
   * Recommendation:
   * - l2Normalize: true (for cosine similarity in vector search)
   * - removeOutliers: false (preserve all information)
   * - dimensionality reduction: only if vectors are > 3000 dims
   */
  normalization: EmbeddingNormalizationConfig;

  /**
   * Model selection strategy
   *
   * Recommendation:
   * - 'default': Use system default (text-embedding-3-small)
   * - 'fast': Cost-optimized (text-embedding-3-small)
   * - 'quality': Higher accuracy (text-embedding-3-large)
   * - 'custom': Specific modelId
   *
   * Default to 'default' for consistency
   */
  modelConfig: EmbeddingModelConfig;

  /** Lightweight parent context (e.g., c_project) settings */
  parentContext?: ParentContextConfig;

  /**
   * Whether to store embeddings in Cosmos DB
   * (alongside other enrichment data)
   */
  storeInShard: boolean;

  /**
   * Whether to use this for vector search queries
   * If false, embeddings are generated but not indexed
   */
  enableVectorSearch: boolean;

  /**
   * Metadata about when template was created/updated
   */
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy?: string;
}

/**
 * Default embedding template
 * Used for all shard types that don't have a custom template
 *
 * Characteristics:
 * - Combines all fields with equal weighting
 * - Basic preprocessing (combining, chunking)
 * - L2 normalization for cosine similarity
 * - Uses default embedding model
 */
export const DEFAULT_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> = {
  version: 1,
  name: 'Default Embedding Template',
  description: 'Default template for all shard types. Combines all fields with equal weighting.',
  isDefault: true,
  fields: [
    {
      name: 'all',
      weight: 1.0,
      include: true,
      preprocess: {
        maxLength: 8000,
      },
    },
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 512,
      overlap: 50,
      splitBySentence: true,
      minChunkSize: 100,
      maxChunkSize: 1000,
    },
    removeStopWords: false,
    normalize: false,
  },
  normalization: {
    l2Normalize: true,
    minMaxScale: false,
    removeOutliers: false,
    reduction: {
      enabled: false,
    },
  },
  modelConfig: {
    strategy: 'default',
    modelId: 'text-embedding-3-small',
    fallbackModelId: 'text-embedding-ada-002',
  },
  parentContext: {
    mode: 'whenScoped',
    sourceShardType: 'c_project',
    weight: 0.25,
    fields: ['name', 'tags', 'summary'],
    asContextPrefix: true,
    separator: ' — ',
    maxLength: 120,
  },
  storeInShard: true,
  enableVectorSearch: true,
};

/**
 * Embedding result after applying template
 */
export interface EmbeddingResult {
  /** Embedding vector */
  embedding: number[];

  /** Template version used */
  templateVersion: number;

  /** Field values that were embedded */
  embeddedText: string;

  /** Chunks created during preprocessing */
  chunks?: string[];

  /** Individual field embeddings if generated */
  fieldEmbeddings?: Record<string, number[]>;

  /** Metadata about the embedding */
  metadata: {
    model: string;
    dimensions: number;
    tokenCount: number;
    processingTime?: number;
  };
}

/**
 * Options for applying embedding template
 */
export interface ApplyTemplateOptions {
  /** Override template-specified model */
  modelId?: string;

  /** Skip specific preprocessing steps */
  skipPreprocessing?: boolean;

  /** Skip normalization */
  skipNormalization?: boolean;

  /** Generate field-level embeddings */
  generateFieldEmbeddings?: boolean;

  /** Max text length to process */
  maxTextLength?: number;
}
