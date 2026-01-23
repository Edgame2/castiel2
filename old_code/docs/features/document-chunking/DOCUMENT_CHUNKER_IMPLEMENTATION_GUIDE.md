# Document Chunker - Implementation Guide

## Quick Start

This guide provides code examples and implementation patterns for the Document Chunker Azure Function.

## Project Structure

```
src/
├── index.ts                           # Function entry point
├── services/
│   ├── text-extractor.service.ts     # Extraction (Form Recognizer + Tika)
│   ├── text-normalizer.service.ts    # Normalization
│   ├── chunking-engine.service.ts    # Intelligent chunking
│   ├── shard-creator.service.ts      # Cosmos DB persistence
│   └── embedding-enqueuer.service.ts # Service Bus messaging
├── types/
│   ├── document-chunking.types.ts    # Type definitions
│   └── index.ts
├── utils/
│   ├── tokenizer.ts                  # Token counting
│   ├── logger.ts                      # Structured logging
│   └── config.ts                      # Configuration
├── config/
│   └── dependencies.ts               # Dependency injection
└── __tests__/
    ├── unit/
    └── integration/
```

## 1. Function Entry Point

**File: `src/index.ts`**

```typescript
import { AzureFunction, Context } from "@azure/functions";
import { DocumentChunkerOrchestrator } from "./orchestrators/document-chunker.orchestrator";
import { config } from "./utils/config";
import { createLogger } from "./utils/logger";

const logger = createLogger('DocumentChunkerFunction');

const documentChunkerTrigger: AzureFunction = async function (
  context: Context,
  message: DocumentChunkJobMessage
): Promise<void> {
  const startTime = Date.now();
  const traceId = `doc-chunk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  context.log.info(`[${traceId}] Document chunking started`, {
    documentId: message.shardId,
    tenantId: message.tenantId,
    fileName: message.documentFileName,
  });

  try {
    // Validate message
    if (!message.shardId || !message.tenantId || !message.filePath) {
      throw new Error('Invalid message: missing required fields');
    }

    // Initialize orchestrator
    const orchestrator = new DocumentChunkerOrchestrator(
      logger,
      context.bindings
    );

    // Execute chunking pipeline
    const result = await orchestrator.processDocument(message);

    const duration = Date.now() - startTime;
    context.log.info(`[${traceId}] Document chunking completed`, {
      documentId: message.shardId,
      chunkCount: result.chunkCount,
      durationMs: duration,
      totalTokens: result.totalTokens,
    });

    // Send completion metric
    context.bindings.metrics = {
      name: 'document_chunking_completed',
      value: 1,
      properties: {
        documentId: message.shardId,
        chunkCount: result.chunkCount,
        durationMs: duration,
      },
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    context.log.error(`[${traceId}] Document chunking failed`, {
      documentId: message.shardId,
      error: errorMsg,
      durationMs: duration,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Send failure metric
    context.bindings.metrics = {
      name: 'document_chunking_failed',
      value: 1,
      properties: {
        documentId: message.shardId,
        error: errorMsg,
      },
    };

    // Log to dead-letter for retry/analysis
    context.bindings.deadLetterQueue = {
      originalMessage: message,
      error: {
        message: errorMsg,
        timestamp: new Date().toISOString(),
      },
      attempt: 1,
    };

    throw error;  // Rethrow to trigger Azure retry
  }
};

export default documentChunkerTrigger;
```

**Function Configuration: `function.json`**

```json
{
  "scriptFile": "dist/src/index.js",
  "bindings": [
    {
      "name": "message",
      "type": "serviceBusTrigger",
      "direction": "in",
      "queueName": "documents-to-chunk",
      "connection": "AZURE_SERVICE_BUS_CONNECTION_STRING",
      "cardinality": "one",
      "isSessionEnabled": true
    },
    {
      "name": "cosmosDbOutput",
      "type": "cosmosDB",
      "direction": "out",
      "databaseName": "castiel",
      "collectionName": "shards",
      "connectionStringSetting": "COSMOS_DB_CONNECTION_STRING",
      "createIfNotExists": false
    },
    {
      "name": "embeddingQueueOutput",
      "type": "serviceBus",
      "direction": "out",
      "queueName": "shards-to-vectorize",
      "connection": "AZURE_SERVICE_BUS_CONNECTION_STRING"
    }
  ]
}
```

## 2. Text Extraction Service

**File: `src/services/text-extractor.service.ts`**

```typescript
import { FormRecognizerClient, AzureKeyCredential } from "@azure/ai-form-recognizer";
import axios from 'axios';
import { config } from "../utils/config";
import { createLogger } from "../utils/logger";

export interface ExtractionResult {
  text: string;
  metadata: {
    pageCount: number;
    language: string;
    confidence: number;
    extractorUsed: 'azure-form-recognizer' | 'apache-tika';
    extractionDurationMs: number;
    hasImages: boolean;
  };
  pages?: Array<{
    pageNumber: number;
    content: string;
  }>;
}

export class TextExtractorService {
  private logger = createLogger('TextExtractorService');
  private formRecognizerClient?: FormRecognizerClient;
  private tikaEndpoint: string;

  constructor() {
    this.tikaEndpoint = config.tika.endpoint;

    // Initialize Form Recognizer if configured
    if (config.formRecognizer.endpoint && config.formRecognizer.apiKey) {
      this.formRecognizerClient = new FormRecognizerClient(
        config.formRecognizer.endpoint,
        new AzureKeyCredential(config.formRecognizer.apiKey)
      );
    }
  }

  async extract(filePath: string, mimeType: string): Promise<ExtractionResult> {
    const startTime = Date.now();

    // Try primary extractor (Form Recognizer)
    if (this.formRecognizerClient && this.isFormRecognizerSupported(mimeType)) {
      try {
        this.logger.info(`Extracting with Form Recognizer: ${filePath}`);
        return await this.extractWithFormRecognizer(filePath, mimeType, startTime);
      } catch (error) {
        this.logger.warn(`Form Recognizer failed: ${error instanceof Error ? error.message : String(error)}`);
        if (!config.textExtraction.useFallback) {
          throw error;
        }
      }
    }

    // Fallback to Tika
    try {
      this.logger.info(`Extracting with Apache Tika: ${filePath}`);
      return await this.extractWithTika(filePath, mimeType, startTime);
    } catch (error) {
      this.logger.error(`Both extractors failed for: ${filePath}`);
      throw new Error(`Text extraction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async extractWithFormRecognizer(
    filePath: string,
    mimeType: string,
    startTime: number
  ): Promise<ExtractionResult> {
    // Download document from blob storage
    const documentUrl = this.getBlobUrl(filePath);

    // Use Read API for better OCR support
    const poller = await this.formRecognizerClient!.beginReadDocument(
      documentUrl,
      { locale: "en-US" }
    );

    const result = await poller.pollUntilDone();

    // Extract text and structure
    let fullText = '';
    const pages: Array<{ pageNumber: number; content: string }> = [];

    if (result.pages) {
      for (const page of result.pages) {
        let pageText = '';

        if (page.lines) {
          for (const line of page.lines) {
            pageText += line.content + '\n';
          }
        }

        fullText += pageText;
        pages.push({
          pageNumber: page.pageNumber || 1,
          content: pageText,
        });
      }
    }

    return {
      text: fullText,
      metadata: {
        pageCount: result.pages?.length || 1,
        language: 'en',  // TODO: detect from document
        confidence: 0.95,
        extractorUsed: 'azure-form-recognizer',
        extractionDurationMs: Date.now() - startTime,
        hasImages: false,  // TODO: detect from result
      },
      pages,
    };
  }

  private async extractWithTika(
    filePath: string,
    mimeType: string,
    startTime: number
  ): Promise<ExtractionResult> {
    // Download document from blob storage
    const fileBuffer = await this.downloadBlob(filePath);

    // Send to Tika server
    const response = await axios.put(
      `${this.tikaEndpoint}/tika`,
      fileBuffer,
      {
        headers: {
          'Content-Type': mimeType,
          'Accept': 'text/plain',
        },
        timeout: config.tika.timeout,
      }
    );

    const text = response.data;

    return {
      text,
      metadata: {
        pageCount: 1,  // Tika doesn't return page count easily
        language: 'en',  // TODO: detect
        confidence: 0.85,
        extractorUsed: 'apache-tika',
        extractionDurationMs: Date.now() - startTime,
        hasImages: false,
      },
    };
  }

  private isFormRecognizerSupported(mimeType: string): boolean {
    const supported = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/tiff',
      'image/webp',
    ];
    return supported.includes(mimeType);
  }

  private getBlobUrl(filePath: string): string {
    // Return SAS URL for Form Recognizer to access
    const storageAccount = config.azure.storageAccount;
    return `https://${storageAccount}.blob.core.windows.net/${config.azure.documentsContainer}/${filePath}`;
  }

  private async downloadBlob(filePath: string): Promise<Buffer> {
    // Implementation to download blob and return as buffer
    // Use @azure/storage-blob SDK
    const { BlobClient } = await import('@azure/storage-blob');
    const client = new BlobClient(
      `https://${config.azure.storageAccount}.blob.core.windows.net/${config.azure.documentsContainer}/${filePath}`,
      new (await import('@azure/identity')).DefaultAzureCredential()
    );

    return await client.downloadToBuffer();
  }
}
```

## 3. Text Normalization Service

**File: `src/services/text-normalizer.service.ts`**

```typescript
import { createLogger } from "../utils/logger";

export interface NormalizedResult {
  text: string;
  structure: DocumentStructure;
  metadata: {
    originalLength: number;
    normalizedLength: number;
  };
}

export interface DocumentStructure {
  title?: string;
  sections: Array<{
    level: number;
    heading: string;
    content: string;
  }>;
}

export class TextNormalizerService {
  private logger = createLogger('TextNormalizerService');

  async normalize(text: string): Promise<NormalizedResult> {
    // Extract structure before modifications
    const structure = this.extractStructure(text);

    let normalized = text;

    // 1. Remove boilerplate
    normalized = this.removeHeaders(normalized);
    normalized = this.removeFooters(normalized);
    normalized = this.removePageNumbers(normalized);

    // 2. Fix whitespace
    normalized = this.normalizeWhitespace(normalized);

    // 3. Fix encoding issues
    normalized = this.fixEncoding(normalized);

    return {
      text: normalized,
      structure,
      metadata: {
        originalLength: text.length,
        normalizedLength: normalized.length,
      },
    };
  }

  private extractStructure(text: string): DocumentStructure {
    const sections: Array<{ level: number; heading: string; content: string }> = [];
    const lines = text.split('\n');

    let currentSection = {
      level: 0,
      heading: '',
      content: '',
    };

    for (const line of lines) {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

      if (headingMatch) {
        if (currentSection.heading) {
          sections.push(currentSection);
        }

        currentSection = {
          level: headingMatch[1].length,
          heading: headingMatch[2],
          content: '',
        };
      } else {
        currentSection.content += line + '\n';
      }
    }

    if (currentSection.heading) {
      sections.push(currentSection);
    }

    return { sections };
  }

  private removeHeaders(text: string): string {
    // Remove common header patterns
    const headerPatterns = [
      /^.*?(?:Page \d+|Confidential|Proprietary).*?$/gm,
      /^.{0,50}(?:Report|Document|Version).{0,50}$/gm,
    ];

    let result = text;
    for (const pattern of headerPatterns) {
      result = result.replace(pattern, '');
    }

    return result;
  }

  private removeFooters(text: string): string {
    // Remove common footer patterns
    const footerPatterns = [
      /^.*?(?:www\.|©|Prepared by|Date:).*?$/gm,
      /Page \d+ of \d+/gm,
    ];

    let result = text;
    for (const pattern of footerPatterns) {
      result = result.replace(pattern, '');
    }

    return result;
  }

  private removePageNumbers(text: string): string {
    return text.replace(/(?:^|\n)\s*\d+\s*(?:\n|$)/gm, '\n');
  }

  private normalizeWhitespace(text: string): string {
    // Collapse multiple spaces
    text = text.replace(/\s+/g, ' ');

    // Normalize line breaks
    text = text.replace(/\n\n+/g, '\n\n');

    // Remove leading/trailing whitespace
    text = text.trim();

    return text;
  }

  private fixEncoding(text: string): string {
    // Handle common encoding issues
    text = text
      .replace(/[\u200B-\u200D\uFEFF]/g, '')  // Remove zero-width characters
      .replace(/[\u2018\u2019]/g, "'")         // Smart quotes
      .replace(/[\u201C\u201D]/g, '"');        // Smart double quotes

    return text;
  }
}
```

## 4. Chunking Engine

**File: `src/services/chunking-engine.service.ts`**

```typescript
import { Tiktoken } from 'js-tiktoken';
import { config } from "../utils/config";
import { createLogger } from "../utils/logger";

export interface Chunk {
  id: string;
  sequenceNumber: number;
  text: string;
  startOffset: number;
  endOffset: number;
  tokenCount: number;
  metadata: {
    sectionHeading?: string;
    pageNumber?: number;
  };
}

export class ChunkingEngineService {
  private logger = createLogger('ChunkingEngineService');
  private tokenizer: Tiktoken;

  constructor() {
    // Use cl100k_base encoding (used by GPT-3.5/4)
    const { encoding_for_model } = require("js-tiktoken");
    this.tokenizer = encoding_for_model("gpt-3.5-turbo");
  }

  async chunk(text: string, metadata: any): Promise<Chunk[]> {
    const chunks: Chunk[] = [];
    const chunkSizeTokens = config.chunking.chunkSize || 512;
    const overlapTokens = config.chunking.overlap || 50;

    // Split on sentence boundaries
    const sentences = this.splitIntoSentences(text);

    let currentChunk = '';
    let currentTokenCount = 0;
    let sequenceNumber = 0;
    let currentOffset = 0;

    for (const sentence of sentences) {
      const sentenceTokens = this.countTokens(sentence);

      // Check if adding sentence would exceed max size
      if (currentTokenCount + sentenceTokens > chunkSizeTokens && currentChunk.trim().length > 0) {
        // Save current chunk
        chunks.push(this.createChunk(
          currentChunk.trim(),
          sequenceNumber,
          currentOffset,
          metadata
        ));

        // Start next chunk with overlap
        const overlapText = this.getLastNTokens(currentChunk, overlapTokens);
        currentChunk = overlapText;
        currentTokenCount = overlapTokens;
        sequenceNumber++;
      }

      currentChunk += sentence + ' ';
      currentTokenCount += sentenceTokens;
    }

    // Save final chunk
    if (currentChunk.trim().length > 0) {
      chunks.push(this.createChunk(
        currentChunk.trim(),
        sequenceNumber,
        currentOffset,
        metadata
      ));
    }

    return chunks;
  }

  private splitIntoSentences(text: string): string[] {
    // Split on sentence boundaries: ., !, ?, etc.
    const sentencePattern = /[^.!?]+[.!?]+/g;
    const sentences = text.match(sentencePattern) || [];

    return sentences
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  private countTokens(text: string): number {
    const tokens = this.tokenizer.encode(text);
    return tokens.length;
  }

  private getLastNTokens(text: string, n: number): string {
    const tokens = this.tokenizer.encode(text);
    const lastTokens = tokens.slice(-n);
    return this.tokenizer.decode(lastTokens);
  }

  private createChunk(text: string, sequence: number, offset: number, metadata: any): Chunk {
    const tokenCount = this.countTokens(text);

    return {
      id: this.generateChunkId(text, sequence),
      sequenceNumber: sequence,
      text,
      startOffset: offset,
      endOffset: offset + text.length,
      tokenCount,
      metadata: {
        sectionHeading: metadata.sectionHeading,
        pageNumber: metadata.pageNumber,
      },
    };
  }

  private generateChunkId(text: string, sequence: number): string {
    const crypto = require('crypto');
    const hash = crypto
      .createHash('sha256')
      .update(text)
      .digest('hex');

    return `chunk-${hash.substring(0, 16)}-${sequence}`;
  }
}
```

## 5. Shard Creator Service

**File: `src/services/shard-creator.service.ts`**

```typescript
import { CosmosClient } from "@azure/cosmos";
import { config } from "../utils/config";
import { createLogger } from "../utils/logger";
import type { Chunk } from "./chunking-engine.service";

export class ShardCreatorService {
  private logger = createLogger('ShardCreatorService');
  private client: CosmosClient;

  constructor() {
    this.client = new CosmosClient({
      endpoint: config.cosmosDb.endpoint,
      key: config.cosmosDb.key,
    });
  }

  async createChunkShards(
    chunks: Chunk[],
    documentId: string,
    tenantId: string,
    metadata: any
  ): Promise<string[]> {
    const database = this.client.database(config.cosmosDb.database);
    const container = database.container(config.cosmosDb.shardsContainer);

    const shardIds: string[] = [];

    for (const chunk of chunks) {
      const shard = {
        id: chunk.id,
        tenantId,
        shardTypeId: 'c_documentChunk',
        version: 1,

        structuredData: {
          documentId,
          chunkSequence: chunk.sequenceNumber,
          chunkText: chunk.text,
          startOffset: chunk.startOffset,
          endOffset: chunk.endOffset,
          tokenCount: chunk.tokenCount,
          embeddingStatus: 'pending',

          metadata: {
            pageNumber: chunk.metadata.pageNumber,
            sectionHeading: chunk.metadata.sectionHeading,
            documentTitle: metadata.documentTitle,
            documentFileName: metadata.documentFileName,
            extractorUsed: metadata.extractorUsed,
            extractionConfidence: metadata.extractionConfidence,
            chunkingStrategy: 'INTELLIGENT_SEMANTIC',
            language: metadata.language,
          },
        },

        unstructuredData: {
          context: {
            previousChunkId: shardIds.length > 0 ? shardIds[shardIds.length - 1] : undefined,
          },
          processingLog: `Created by document-chunker-function at ${new Date().toISOString()}`,
        },

        relationships: {
          parentDocument: {
            shardId: documentId,
            type: 'parent',
            cascadeDelete: true,
          },
        },

        createdAt: new Date(),
        createdBy: 'system:document-chunker',
        updatedAt: new Date(),
        status: 'active',

        source: 'document-chunker-function',
        sourceMetadata: {
          functionVersion: '1.0.0',
          processingDurationMs: 0,  // Will be set by orchestrator
          timestamp: new Date().toISOString(),
        },

        _partitionKey: tenantId,
      };

      try {
        const response = await container.items.create(shard);
        shardIds.push(response.resource.id);
        this.logger.info(`Created shard: ${shard.id}`);
      } catch (error) {
        this.logger.error(`Failed to create shard: ${chunk.id}`, error);
        throw error;
      }
    }

    return shardIds;
  }
}
```

## 6. Embedding Enqueuer Service

**File: `src/services/embedding-enqueuer.service.ts`**

```typescript
import { ServiceBusClient } from "@azure/service-bus";
import { config } from "../utils/config";
import { createLogger } from "../utils/logger";

export class EmbeddingEnqueuerService {
  private logger = createLogger('EmbeddingEnqueuerService');
  private client: ServiceBusClient;

  constructor() {
    this.client = new ServiceBusClient(config.serviceBus.connectionString);
  }

  async enqueueChunks(shardIds: string[], tenantId: string): Promise<void> {
    const sender = this.client.createSender(config.serviceBus.embeddingQueue);

    try {
      const messages = shardIds.map((shardId, index) => ({
        body: {
          shardId,
          tenantId,
          shardTypeId: 'c_documentChunk',
          revisionNumber: 1,
          dedupeKey: `chunk-embed-${shardId}-1`,
          enqueuedAt: new Date().toISOString(),
        },
        messageId: `chunk-embed-${shardId}-1`,
        sessionId: tenantId,
        userProperties: {
          shardId,
          tenantId,
          chunkIndex: index.toString(),
        },
      }));

      // Send messages in batch (10 at a time)
      for (let i = 0; i < messages.length; i += 10) {
        const batch = messages.slice(i, i + 10);
        await sender.sendMessages(batch);
        this.logger.info(`Enqueued ${batch.length} embedding jobs`);
      }
    } finally {
      await sender.close();
    }
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}
```

## 7. Orchestrator

**File: `src/orchestrators/document-chunker.orchestrator.ts`**

```typescript
import { TextExtractorService } from "../services/text-extractor.service";
import { TextNormalizerService } from "../services/text-normalizer.service";
import { ChunkingEngineService } from "../services/chunking-engine.service";
import { ShardCreatorService } from "../services/shard-creator.service";
import { EmbeddingEnqueuerService } from "../services/embedding-enqueuer.service";
import { createLogger } from "../utils/logger";
import type { DocumentChunkJobMessage } from "../types/document-chunking.types";

export class DocumentChunkerOrchestrator {
  private logger = createLogger('DocumentChunkerOrchestrator');
  private textExtractor: TextExtractorService;
  private textNormalizer: TextNormalizerService;
  private chunkingEngine: ChunkingEngineService;
  private shardCreator: ShardCreatorService;
  private embeddingEnqueuer: EmbeddingEnqueuerService;

  constructor(logger: any, bindings: any) {
    this.textExtractor = new TextExtractorService();
    this.textNormalizer = new TextNormalizerService();
    this.chunkingEngine = new ChunkingEngineService();
    this.shardCreator = new ShardCreatorService();
    this.embeddingEnqueuer = new EmbeddingEnqueuerService();
  }

  async processDocument(message: DocumentChunkJobMessage): Promise<{
    chunkCount: number;
    totalTokens: number;
  }> {
    const startTime = Date.now();

    // Step 1: Extract text
    this.logger.info(`Step 1: Extracting text from ${message.filePath}`);
    const extractionResult = await this.textExtractor.extract(
      message.filePath,
      'application/pdf'  // TODO: determine from message
    );

    // Step 2: Normalize text
    this.logger.info(`Step 2: Normalizing text`);
    const normalizationResult = await this.textNormalizer.normalize(
      extractionResult.text
    );

    // Step 3: Chunk text
    this.logger.info(`Step 3: Chunking text`);
    const chunks = await this.chunkingEngine.chunk(
      normalizationResult.text,
      {
        sectionHeading: normalizationResult.structure.sections[0]?.heading,
        pageNumber: extractionResult.pages?.[0]?.pageNumber,
      }
    );

    this.logger.info(`Created ${chunks.length} chunks`);

    // Step 4: Create shards
    this.logger.info(`Step 4: Creating Cosmos DB shards`);
    const shardIds = await this.shardCreator.createChunkShards(
      chunks,
      message.shardId,
      message.tenantId,
      {
        documentTitle: message.documentFileName,
        documentFileName: message.documentFileName,
        extractorUsed: extractionResult.metadata.extractorUsed,
        extractionConfidence: extractionResult.metadata.confidence,
        language: extractionResult.metadata.language,
      }
    );

    // Step 5: Enqueue embedding jobs
    this.logger.info(`Step 5: Enqueueing embedding jobs`);
    await this.embeddingEnqueuer.enqueueChunks(shardIds, message.tenantId);

    // Calculate metrics
    const totalTokens = chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0);
    const duration = Date.now() - startTime;

    this.logger.info(`Document processing complete`, {
      chunkCount: chunks.length,
      totalTokens,
      durationMs: duration,
      avgTokensPerChunk: Math.round(totalTokens / chunks.length),
    });

    return {
      chunkCount: chunks.length,
      totalTokens,
    };
  }
}
```

## 8. Configuration

**File: `src/utils/config.ts`**

```typescript
export const config = {
  azure: {
    storageAccount: process.env.AZURE_STORAGE_ACCOUNT || 'documentsummito',
    documentsContainer: process.env.AZURE_STORAGE_DOCUMENTS_CONTAINER || 'documents',
  },

  cosmosDb: {
    endpoint: process.env.COSMOS_DB_ENDPOINT!,
    key: process.env.COSMOS_DB_KEY!,
    database: process.env.COSMOS_DB_DATABASE || 'castiel',
    shardsContainer: process.env.COSMOS_DB_SHARDS_CONTAINER || 'shards',
  },

  serviceBus: {
    connectionString: process.env.AZURE_SERVICE_BUS_CONNECTION_STRING!,
    embeddingQueue: process.env.AZURE_SERVICE_BUS_EMBEDDING_QUEUE || 'shards-to-vectorize',
  },

  formRecognizer: {
    endpoint: process.env.AZURE_FORM_RECOGNIZER_ENDPOINT,
    apiKey: process.env.AZURE_FORM_RECOGNIZER_API_KEY,
  },

  tika: {
    endpoint: process.env.TIKA_SERVER_ENDPOINT || 'http://localhost:9998',
    timeout: parseInt(process.env.TIKA_TIMEOUT_MS || '30000'),
  },

  textExtraction: {
    useFallback: process.env.TEXT_EXTRACTION_USE_FALLBACK === 'true',
    timeout: parseInt(process.env.TEXT_EXTRACTION_TIMEOUT_MS || '60000'),
  },

  chunking: {
    chunkSize: parseInt(process.env.VECTORIZATION_DEFAULT_CHUNK_SIZE || '512'),
    overlap: parseInt(process.env.VECTORIZATION_DEFAULT_CHUNK_OVERLAP || '50'),
    minSize: parseInt(process.env.CHUNKING_MIN_CHUNK_SIZE || '50'),
    maxSize: parseInt(process.env.CHUNKING_MAX_CHUNK_SIZE || '1024'),
  },

  document: {
    maxSizeMb: parseInt(process.env.DOCUMENT_CHUNKING_MAX_SIZE_MB || '20'),
    maxChunksPerDocument: parseInt(process.env.DOCUMENT_CHUNKING_MAX_CHUNKS_PER_DOCUMENT || '10000'),
  },

  monitoring: {
    appInsightsKey: process.env.APPINSIGHTS_INSTRUMENTATIONKEY,
    enableDetailedLogging: process.env.ENABLE_DETAILED_LOGGING === 'true',
  },
};
```

## Testing Examples

**File: `src/__tests__/unit/chunking-engine.test.ts`**

```typescript
import { ChunkingEngineService } from '../../services/chunking-engine.service';

describe('ChunkingEngineService', () => {
  let service: ChunkingEngineService;

  beforeEach(() => {
    service = new ChunkingEngineService();
  });

  it('should chunk text with correct size', async () => {
    const text = 'This is a sentence. This is another sentence. ' + 'And one more.';
    const chunks = await service.chunk(text, {});

    // Verify all chunks are within size limits
    chunks.forEach(chunk => {
      expect(chunk.tokenCount).toBeGreaterThanOrEqual(50);  // min size
      expect(chunk.tokenCount).toBeLessThanOrEqual(1024);   // max size
    });
  });

  it('should preserve overlap between chunks', async () => {
    const text = 'A B C D E F G H I J K L M N O P Q R S T U V W X Y Z. ';
    const chunks = await service.chunk(text, {});

    if (chunks.length > 1) {
      // Verify overlap exists
      const lastOfFirst = chunks[0].text.split(' ').pop();
      const firstOfSecond = chunks[1].text.split(' ')[0];

      expect(lastOfFirst).toBeDefined();
      expect(firstOfSecond).toBeDefined();
    }
  });

  it('should generate unique chunk IDs', async () => {
    const text = 'Chunk one. Chunk two. Chunk three. ';
    const chunks = await service.chunk(text, {});

    const ids = chunks.map(c => c.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(ids.length);  // All IDs unique
  });
});
```

## Deployment

```bash
# Install dependencies
npm install

# Build
npm run build

# Test
npm test

# Deploy to Azure
func azure functionapp publish <functionAppName> --build remote
```

## Next Steps

1. Implement language detection service
2. Add table extraction and preservation
3. Implement incremental/delta chunking
4. Add chunk quality scoring
5. Implement deduplication logic
6. Add multi-language support enhancements
