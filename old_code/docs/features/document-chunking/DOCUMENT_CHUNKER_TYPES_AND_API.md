# Document Chunking - Type Definitions & API

## Type Definitions

**File: `src/types/document-chunking.types.ts`**

```typescript
/**
 * Document Chunking Service Type Definitions
 */

// ============================================================================
// Service Bus Message Types
// ============================================================================

/**
 * Message received from documents-to-chunk queue
 */
export interface DocumentChunkJobMessage {
  shardId: string;              // Document shard ID (c_document)
  tenantId: string;             // Tenant ID for isolation
  documentFileName: string;     // Original file name
  filePath: string;             // Blob storage path
  enqueuedAt: string;           // ISO 8601 timestamp when enqueued
}

/**
 * Embedding job message to send to shards-to-vectorize queue
 */
export interface EmbeddingJobMessage {
  shardId: string;              // Chunk shard ID (c_documentChunk)
  tenantId: string;
  shardTypeId: 'c_documentChunk';
  revisionNumber: number;       // Always 1 for new chunks
  dedupeKey: string;            // Deduplication key
  enqueuedAt: string;           // ISO 8601 timestamp
}

// ============================================================================
// Text Extraction Types
// ============================================================================

export interface TextExtractionResult {
  text: string;                 // Full extracted text
  metadata: TextExtractionMetadata;
  pages?: TextExtractionPage[];
  images?: TextExtractionImage[];
}

export interface TextExtractionMetadata {
  pageCount: number;            // Total number of pages
  language: string;             // Detected language (ISO 639-1: 'en', 'fr', etc.)
  confidence: number;           // Confidence score (0-1)
  extractorUsed: 'azure-form-recognizer' | 'apache-tika';
  extractionDurationMs: number;
  hasImages: boolean;           // Contains images/OCR content
  hasFormFields: boolean;       // Contains form fields
  characterCount: number;       // Total characters extracted
  encodingDetected: string;     // Detected encoding (UTF-8, etc.)
}

export interface TextExtractionPage {
  pageNumber: number;
  content: string;              // Page text content
  language: string;             // Page-specific language
  confidence: number;           // Page-specific confidence
  wordCount: number;
}

export interface TextExtractionImage {
  pageNumber: number;
  imageIndex: number;           // Index within the page
  extractedText: string;        // OCR text from image
  confidence: number;           // OCR confidence
}

// ============================================================================
// Text Normalization Types
// ============================================================================

export interface TextNormalizationResult {
  text: string;                 // Normalized text
  structure: DocumentStructure;
  metadata: TextNormalizationMetadata;
}

export interface TextNormalizationMetadata {
  originalLength: number;       // Original text length
  normalizedLength: number;     // After normalization
  removedBoilerplateCount: number;
  removedWhitespaceCount: number;
  detectedLanguages: string[];  // Languages detected
}

export interface DocumentStructure {
  title?: string;               // Document title
  sections: DocumentSection[];  // Hierarchical sections
}

export interface DocumentSection {
  level: number;                // Heading level 1-6
  heading: string;              // Section heading text
  content: string;              // Section content
  subsections?: DocumentSection[];
}

// ============================================================================
// Chunking Types
// ============================================================================

export interface ChunkingResult {
  chunks: DocumentChunk[];
  metadata: ChunkingMetadata;
}

export interface DocumentChunk {
  id: string;                   // Hash-based chunk ID
  sequenceNumber: number;       // Position in document (0-indexed)
  text: string;                 // Chunk content
  startOffset: number;          // Character position in original text
  endOffset: number;            // End character position
  startTokenOffset: number;     // Token position start
  endTokenOffset: number;       // Token position end
  tokenCount: number;           // Actual token count
  metadata: ChunkMetadata;
}

export interface ChunkMetadata {
  sectionHeading?: string;      // Parent section heading
  pageNumber?: number;          // Page number where chunk starts
  depth: number;                // Section hierarchy depth
  context: ChunkContext;
}

export interface ChunkContext {
  previousChunkId?: string;     // Previous chunk ID (for overlap)
  nextChunkId?: string;         // Next chunk ID
  documentTitle?: string;
  sectionPath?: string;         // Full section hierarchy path
}

export interface ChunkingMetadata {
  totalTokens: number;
  averageTokensPerChunk: number;
  minTokensPerChunk: number;
  maxTokensPerChunk: number;
  chunkingStrategy: 'FIXED_SIZE' | 'INTELLIGENT_SEMANTIC';
  chunkingDurationMs: number;
}

export interface ChunkingStrategy {
  type: 'FIXED_SIZE' | 'INTELLIGENT_SEMANTIC';
  chunkSizeTokens: number;      // 512 (best practice)
  overlapTokens: number;        // 50
  minChunkSizeTokens: number;   // 50
  maxChunkSizeTokens: number;   // 1024
  splitBoundary: 'SENTENCE' | 'PARAGRAPH' | 'PAGE';
  preserveContext: boolean;
}

// ============================================================================
// Cosmos DB Shard Types
// ============================================================================

/**
 * c_documentChunk Shard - stored in Cosmos DB
 */
export interface DocumentChunkShard {
  // Base fields
  id: string;                   // Chunk ID
  tenantId: string;
  shardTypeId: 'c_documentChunk';
  version: number;
  
  // Structured data (indexed, queryable)
  structuredData: {
    documentId: string;         // Parent document ID
    chunkSequence: number;
    chunkText: string;
    startOffset: number;
    endOffset: number;
    startTokenOffset: number;
    endTokenOffset: number;
    tokenCount: number;
    embeddingStatus: EmbeddingStatus;
    
    metadata: DocumentChunkMetadata;
  };
  
  // Unstructured data (not indexed)
  unstructuredData?: {
    context: ChunkContext;
    processingLog: string;
  };
  
  // Relationships
  relationships?: {
    parentDocument: {
      shardId: string;
      type: 'parent';
      cascadeDelete: boolean;
    };
  };
  
  // AI data (vectors added by embedding processor)
  vectors?: VectorEmbedding[];
  enrichment?: EnrichmentData;
  
  // Metadata
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  status: 'active' | 'archived' | 'deleted';
  
  // Audit
  source: 'document-chunker-function';
  sourceMetadata: {
    functionVersion: string;
    processingDurationMs: number;
    timestamp: string;
  };
  
  // Partition key
  _partitionKey: string;        // tenantId
}

export interface DocumentChunkMetadata {
  pageNumber?: number;
  sectionHeading?: string;
  documentTitle: string;
  documentFileName: string;
  extractorUsed: 'azure-form-recognizer' | 'apache-tika';
  extractionConfidence: number;
  chunkingStrategy: 'FIXED_SIZE' | 'INTELLIGENT_SEMANTIC';
  language: string;             // ISO 639-1
  createdBy: string;
}

export type EmbeddingStatus = 'pending' | 'processing' | 'complete' | 'failed' | 'deprecated';

export interface VectorEmbedding {
  id: string;
  field: 'content';
  model: string;                // 'text-embedding-3-small', etc.
  dimensions: number;
  embedding: number[];
  createdAt: Date;
}

export interface EnrichmentData {
  config: EnrichmentConfig;
  lastEnrichedAt?: Date;
  enrichmentData?: Record<string, any>;
  error?: string;
}

export interface EnrichmentConfig {
  enabled: boolean;
  providers?: string[];
  autoEnrich?: boolean;
  enrichmentTypes?: string[];
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface DocumentChunkingConfig {
  enabled: boolean;
  tenantSettingsEnabled: boolean;
  
  textExtraction: TextExtractionConfig;
  textNormalization: TextNormalizationConfig;
  chunking: ChunkingConfig;
  document: DocumentConfig;
  monitoring: MonitoringConfig;
}

export interface TextExtractionConfig {
  primaryService: 'azure-form-recognizer' | 'apache-tika';
  fallbackService?: 'apache-tika';
  useFallback: boolean;
  ocrEnabled: boolean;
  timeoutMs: number;
  
  formRecognizer: {
    endpoint?: string;
    apiKey?: string;
    apiVersion: string;
  };
  
  tika: {
    endpoint: string;
    timeoutMs: number;
  };
}

export interface TextNormalizationConfig {
  removeBoilerplate: boolean;
  fixWhitespace: boolean;
  removeExtraLinebreaks: boolean;
  fixEncoding: boolean;
  preserveStructure: boolean;
}

export interface ChunkingConfig {
  strategy: 'FIXED_SIZE' | 'INTELLIGENT_SEMANTIC';
  chunkSizeTokens: number;      // 512
  chunkOverlapTokens: number;   // 50
  minChunkSizeTokens: number;   // 50
  maxChunkSizeTokens: number;   // 1024
  preserveHeadings: boolean;
  preservePageNumbers: boolean;
  preserveSectionHierarchy: boolean;
}

export interface DocumentConfig {
  maxSizeMb: number;            // 20
  maxChunksPerDocument: number; // 10000
  processingTimeoutMinutes: number;
}

export interface MonitoringConfig {
  appInsightsEnabled: boolean;
  enableDetailedLogging: boolean;
  trackProcessingMetrics: boolean;
  trackChunkDetails: boolean;
  alertOnFailures: boolean;
}

export interface TenantDocumentChunkingSettings extends DocumentChunkingConfig {
  tenantId: string;
  enabled: boolean;
  customChunkSize?: number;
  customChunkOverlap?: number;
}

// ============================================================================
// Processing Result Types
// ============================================================================

export interface DocumentChunkingResult {
  documentId: string;
  tenantId: string;
  status: 'success' | 'partial' | 'failed';
  
  chunks: DocumentChunk[];
  shardIds: string[];
  
  stats: {
    chunkCount: number;
    totalTokens: number;
    averageTokensPerChunk: number;
    processingDurationMs: number;
  };
  
  errors?: ChunkingError[];
  warnings?: string[];
}

export interface ChunkingError {
  stage: 'extraction' | 'normalization' | 'chunking' | 'persistence' | 'enqueueing';
  message: string;
  chunkNumber?: number;
  retriesAttempted: number;
  fatal: boolean;  // true = stop processing, false = continue
}

export interface DeadLetterMessage {
  originalMessage: DocumentChunkJobMessage;
  error: {
    message: string;
    code: string;
    stage: string;
    timestamp: string;
  };
  attempts: number;
  lastAttemptTime: string;
  metadata: {
    functionVersion: string;
    processingDurationMs: number;
  };
}

// ============================================================================
// Monitoring & Logging Types
// ============================================================================

export interface ChunkingMetricEvent {
  name: string;
  value: number;
  timestamp: Date;
  properties: Record<string, any>;
  severity?: 'info' | 'warning' | 'error';
}

export interface ChunkingLogEntry {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context: {
    documentId: string;
    tenantId: string;
    traceId: string;
    stage?: string;
  };
  metadata?: Record<string, any>;
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
}

// ============================================================================
// Language Detection Types
// ============================================================================

export interface LanguageDetectionResult {
  language: string;             // ISO 639-1 code
  confidence: number;           // 0-1
  alternativeLanguages?: Array<{
    language: string;
    confidence: number;
  }>;
}

// ============================================================================
// Service Interfaces
// ============================================================================

export interface ITextExtractor {
  extract(filePath: string, mimeType: string): Promise<TextExtractionResult>;
}

export interface ITextNormalizer {
  normalize(text: string): Promise<TextNormalizationResult>;
}

export interface IChunkingEngine {
  chunk(text: string, metadata: any): Promise<DocumentChunk[]>;
}

export interface IShardCreator {
  createChunkShards(
    chunks: DocumentChunk[],
    documentId: string,
    tenantId: string,
    metadata: any
  ): Promise<string[]>;
}

export interface IEmbeddingEnqueuer {
  enqueueChunks(shardIds: string[], tenantId: string): Promise<void>;
  close(): Promise<void>;
}
```

## Service Interfaces

### Text Extractor Interface

```typescript
/**
 * Extracts text from documents
 * Supports: PDF, Word, HTML, Images (with OCR)
 */
export interface ITextExtractor {
  /**
   * Extract text from document
   * @param filePath Path to document in blob storage
   * @param mimeType Document MIME type
   * @returns Extraction result with metadata
   * @throws ExtractionError if both primary and fallback fail
   */
  extract(filePath: string, mimeType: string): Promise<TextExtractionResult>;
}
```

### Text Normalizer Interface

```typescript
export interface ITextNormalizer {
  /**
   * Normalize and clean text
   * Removes boilerplate, fixes encoding, preserves structure
   * @param text Raw extracted text
   * @returns Normalized text with structure
   */
  normalize(text: string): Promise<TextNormalizationResult>;
}
```

### Chunking Engine Interface

```typescript
export interface IChunkingEngine {
  /**
   * Split text into optimized chunks
   * Uses intelligent semantic-aware splitting
   * @param text Text to chunk
   * @param metadata Document metadata (sections, pages, etc.)
   * @returns Array of chunks with proper overlap
   */
  chunk(text: string, metadata: any): Promise<DocumentChunk[]>;
}
```

### Shard Creator Interface

```typescript
export interface IShardCreator {
  /**
   * Create c_documentChunk shards in Cosmos DB
   * One shard per chunk
   * @param chunks Document chunks
   * @param documentId Parent document ID
   * @param tenantId Tenant ID
   * @param metadata Document metadata
   * @returns Array of created shard IDs
   */
  createChunkShards(
    chunks: DocumentChunk[],
    documentId: string,
    tenantId: string,
    metadata: any
  ): Promise<string[]>;
}
```

### Embedding Enqueuer Interface

```typescript
export interface IEmbeddingEnqueuer {
  /**
   * Enqueue chunks for embedding/vectorization
   * Sends one message per chunk to shards-to-vectorize queue
   * @param shardIds Chunk shard IDs
   * @param tenantId Tenant ID
   */
  enqueueChunks(shardIds: string[], tenantId: string): Promise<void>;
  
  /**
   * Close Service Bus connection
   */
  close(): Promise<void>;
}
```

## Error Types

```typescript
export class ChunkingError extends Error {
  constructor(
    public message: string,
    public code: string,
    public stage: 'extraction' | 'normalization' | 'chunking' | 'persistence' | 'enqueueing',
    public details?: any
  ) {
    super(message);
    this.name = 'ChunkingError';
  }
}

export class ExtractionError extends ChunkingError {
  constructor(message: string, details?: any) {
    super(message, 'EXTRACTION_ERROR', 'extraction', details);
    this.name = 'ExtractionError';
  }
}

export class NormalizationError extends ChunkingError {
  constructor(message: string, details?: any) {
    super(message, 'NORMALIZATION_ERROR', 'normalization', details);
    this.name = 'NormalizationError';
  }
}

export class ChunkingEngineError extends ChunkingError {
  constructor(message: string, details?: any) {
    super(message, 'CHUNKING_ERROR', 'chunking', details);
    this.name = 'ChunkingEngineError';
  }
}

export class PersistenceError extends ChunkingError {
  constructor(message: string, details?: any) {
    super(message, 'PERSISTENCE_ERROR', 'persistence', details);
    this.name = 'PersistenceError';
  }
}

export class EnqueueingError extends ChunkingError {
  constructor(message: string, details?: any) {
    super(message, 'ENQUEUEING_ERROR', 'enqueueing', details);
    this.name = 'EnqueueingError';
  }
}
```

## REST API Responses

If exposed via HTTP trigger (future):

```typescript
// Success Response
{
  "success": true,
  "documentId": "doc-xyz",
  "chunkCount": 50,
  "totalTokens": 25600,
  "shardIds": ["chunk-001", "chunk-002", ...],
  "processingDurationMs": 5230,
  "enqueuedAt": "2025-01-15T10:05:00Z"
}

// Error Response
{
  "success": false,
  "error": "Text extraction failed",
  "code": "EXTRACTION_ERROR",
  "stage": "extraction",
  "documentId": "doc-xyz",
  "retryable": true,
  "details": {
    "originalError": "Form Recognizer timeout",
    "fallbackAttempted": true,
    "fallbackError": "Tika unreachable"
  }
}

// Partial Success (some chunks failed)
{
  "success": false,
  "status": "partial",
  "documentId": "doc-xyz",
  "chunkCount": 48,
  "failedChunks": 2,
  "shardIds": ["chunk-001", ..., "chunk-048"],
  "errors": [
    {
      "chunkNumber": 10,
      "error": "Database write timeout",
      "stage": "persistence"
    }
  ]
}
```
