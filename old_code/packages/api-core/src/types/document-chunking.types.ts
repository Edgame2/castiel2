/**
 * Document Chunking Type Definitions
 */

export interface DocumentChunkJobMessage {
  shardId: string;
  tenantId: string;
  userId?: string;
  projectId?: string;
  containerName: string;
  documentFileName: string;
  filePath: string;
  enqueuedAt: string;
}

export interface EmbeddingJobMessage {
  shardId: string;
  tenantId: string;
  shardTypeId: string;
  revisionNumber: number;
  changedFields?: string[];
  dedupeKey: string;
  enqueuedAt: string;
}

export interface TextExtractionResult {
  text: string;
  metadata: TextExtractionMetadata;
  pages?: TextExtractionPage[];
  tables?: TextExtractionTable[];
}

export interface TextExtractionMetadata {
  pageCount: number;
  language: string;
  confidence: number;
  extractorUsed: 'azure-form-recognizer' | 'fallback';
  extractionDurationMs: number;
  hasImages: boolean;
  hasFormFields: boolean;
  hasTableContent: boolean;
  characterCount: number;
}

export interface TextExtractionPage {
  pageNumber: number;
  content: string;
  language: string;
  confidence: number;
  wordCount: number;
}

export interface TextExtractionTable {
  pageNumber: number;
  tableIndex: number;
  content: string;
  rows: number;
  columns: number;
}

export interface DocumentChunk {
  id: string;
  sequenceNumber: number;
  text: string;
  startOffset: number;
  endOffset: number;
  tokenCount: number;
  metadata: ChunkMetadata;
}

export interface ChunkMetadata {
  sectionHeading?: string;
  pageNumber?: number;
  depth: number;
}

export interface ChunkingResult {
  chunks: DocumentChunk[];
  metadata: ChunkingMetadata;
}

export interface ChunkingMetadata {
  totalTokens: number;
  averageTokensPerChunk: number;
  chunkingDurationMs: number;
}

export interface InternalRelationship {
  shardId: string;
  shardTypeId: string;
  shardTypeName: string;
  shardName: string;
  createdAt: string;
}

export interface DocumentChunkShard {
  id: string;
  tenantId: string;
  shardTypeId: string;
  documentShardId: string;
  structuredData: {
    name: string;
    sequenceNumber: number;
    text: string;
    startOffset: number;
    endOffset: number;
    tokenCount: number;
  };
  metadata: {
    sectionHeading?: string;
    pageNumber?: number;
    depth: number;
    extractionMetadata: TextExtractionMetadata;
    documentFileName: string;
  };
  embeddingStatus: 'pending' | 'completed' | 'failed';
  revisionId: string;
  revisionNumber: number;
  createdAt: string;
  updatedAt: string;
  vectors?: any[];
  internal_relationships: InternalRelationship[];
}

export interface ProcessingResult {
  documentShardId: string;
  chunkCount: number;
  totalTokens: number;
  durationMs: number;
  status: 'success' | 'partial' | 'failed';
  failedChunks: string[];
}



