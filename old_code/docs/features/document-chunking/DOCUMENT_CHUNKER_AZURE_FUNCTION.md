# Document Chunker Azure Function - Complete Implementation Guide

## Overview

The **Document Chunker Azure Function** is a serverless processor that consumes messages from the `documents-to-chunk` Service Bus queue and orchestrates the complete document processing pipeline:

1. **Text Extraction** - Converts various document formats to plain text (PDF, Word, HTML, Images)
2. **Normalization** - Cleans and sanitizes text, removes boilerplate
3. **Intelligent Chunking** - Splits documents into optimized overlapping chunks
4. **Persistence** - Saves chunks as `c_documentChunk` shards in Cosmos DB
5. **Embedding Queue** - Enqueues each chunk for vectorization

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Service Bus: documents-to-chunk                                 │
│ (Message: shardId, tenantId, documentFileName, filePath)        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │ Document Chunker Azure Function   │
        │ (Timer/Service Bus Trigger)       │
        └──────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌─────────────────┐ ┌────────────────┐ ┌───────────────┐
│ Blob Storage    │ │ Text Extractor │ │ Normalizer    │
│ (Read Document) │ │ (AF/Tika)      │ │ (Sanitize)    │
└────────┬────────┘ └────────┬───────┘ └───────┬───────┘
         │                   │                 │
         └───────────────────┴─────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │ Intelligent Chunking Engine      │
        │ • Smart splitting (512 tokens)   │
        │ • Preserve context               │
        │ • Track positions                │
        └──────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
    ┌────────┐        ┌─────────┐       ┌──────────┐
    │ Cosmos │        │ Service │       │Monitoring│
    │   DB   │        │  Bus    │       │  (AI)    │
    │c_document       │shards-  │       │          │
    │Chunk   │        │to-      │       │          │
    │        │        │vectorize        │          │
    └────────┘        └─────────┘       └──────────┘
```

## Technology Stack

### Text Extraction (Primary & Fallback)
- **Primary:** Azure Form Recognizer (native Azure, best for documents with layout)
- **Fallback:** Apache Tika (open source, handles any format)
- **OCR Support:** Both extract text from images

### Text Normalization
- **Boilerplate Removal:** Headers, footers, page numbers
- **Whitespace Normalization:** Remove extra spaces, line breaks
- **Encoding Fix:** Handle UTF-8 encoding issues
- **Format Preservation:** Plain text only (no styling preserved)

### Chunking Strategy
- **Algorithm:** Semantic-aware sentence/paragraph splitting
- **Size:** 512 tokens (best practice for embedding models)
- **Overlap:** 50 tokens overlap between chunks (25% overlap)
- **Context Preservation:** Maintain section hierarchy and document structure

### Storage & Messaging
- **Chunks Database:** Cosmos DB (c_documentChunk shards)
- **Embedding Queue:** Service Bus (shards-to-vectorize)
- **Monitoring:** Application Insights

## Function Implementation Details

### Function Trigger

**Type:** Azure Service Bus Queue Trigger  
**Queue:** `documents-to-chunk`  
**Batch Processing:** 1 message at a time (sequential processing)  
**Max Retries:** 3 with exponential backoff

```typescript
// Incoming Message Structure
interface DocumentChunkJobMessage {
  shardId: string;              // Document shard ID
  tenantId: string;             // Tenant ID
  documentFileName: string;     // File name (e.g., "proposal.pdf")
  filePath: string;             // Storage path (e.g., "tenant-xyz/doc-001/proposal.pdf")
  enqueuedAt: string;           // ISO 8601 timestamp
}
```

### Function Execution Flow

```
1. Receive Message
   ↓
2. Retrieve Document from Blob Storage
   ↓
3. Extract Text (Form Recognizer → Tika fallback)
   ↓
4. Normalize Text
   ├─ Remove boilerplate
   ├─ Fix whitespace
   ├─ Detect language
   └─ Extract metadata (page numbers, headings)
   ↓
5. Intelligent Chunking
   ├─ Split on sentence/paragraph boundaries
   ├─ Respect chunk size (512 tokens)
   ├─ Maintain 50-token overlap
   └─ Preserve context (page #, section, etc.)
   ↓
6. Create c_documentChunk Shards
   ├─ Hash-based chunk ID generation
   ├─ Store extraction metadata
   ├─ Create parent relationship to document
   └─ Set embeddingStatus = 'pending'
   ↓
7. Enqueue Embedding Jobs
   ├─ One message per chunk
   ├─ Message contains chunk ID only
   └─ Send to shards-to-vectorize queue
   ↓
8. Update Document Status
   ├─ Set processingStatus = 'completed'
   ├─ Store chunk count
   └─ Store extraction metadata
   ↓
9. Monitor & Log
   ├─ Track duration
   ├─ Log metrics
   └─ Alert on failures
```

### Error Handling Strategy

| Scenario | Behavior | Retry | Dead-Letter |
|----------|----------|-------|-------------|
| Blob not found | Skip chunk, continue | No | No |
| Extraction fails | Skip chunk, continue | Yes (3x) | After 3 retries |
| Normalization fails | Skip chunk, continue | No | No |
| Chunking fails | Fail document | Yes (3x) | Yes |
| DB write fails | Fail document | Yes (3x) | Yes |
| Queue send fails | Fail document | Yes (3x) | Yes |

**Dead-Letter Queue:** `documents-to-chunk-deadletter` for permanent failures

## Environment Configuration

### Application Settings (.env / Key Vault)

```env
# Document Chunking Configuration
DOCUMENT_CHUNKING_ENABLED=true
DOCUMENT_CHUNKING_TENANT_SETTINGS_ENABLED=true

# Chunk Size & Overlap (from existing vectorization config)
VECTORIZATION_DEFAULT_CHUNK_SIZE=512           # tokens
VECTORIZATION_DEFAULT_CHUNK_OVERLAP=50         # tokens
VECTORIZATION_DEFAULT_CHUNKING_STRATEGY=INTELLIGENT_SEMANTIC  # FIXED_SIZE | INTELLIGENT_SEMANTIC

# Text Extraction Configuration
TEXT_EXTRACTION_PRIMARY_SERVICE=azure-form-recognizer  # or 'apache-tika'
TEXT_EXTRACTION_FALLBACK_SERVICE=apache-tika         # Fallback service
TEXT_EXTRACTION_USE_FALLBACK=true                    # Enable fallback pattern
TEXT_EXTRACTION_TIMEOUT_MS=60000                     # 60 seconds per document
TEXT_EXTRACTION_OCR_ENABLED=true                     # Enable OCR for images

# Azure Form Recognizer Configuration
AZURE_FORM_RECOGNIZER_ENDPOINT=https://{region}.api.cognitive.microsoft.com/
AZURE_FORM_RECOGNIZER_API_KEY={key}                 # From Key Vault
AZURE_FORM_RECOGNIZER_API_VERSION=2024-02-29-preview

# Apache Tika Configuration (if used)
TIKA_SERVER_ENDPOINT=http://localhost:9998          # Local or containerized Tika
TIKA_TIMEOUT_MS=30000                               # 30 seconds per extraction

# Text Normalization Configuration
TEXT_NORMALIZATION_REMOVE_BOILERPLATE=true
TEXT_NORMALIZATION_FIX_WHITESPACE=true
TEXT_NORMALIZATION_REMOVE_EXTRA_LINEBREAKS=true

# Chunking Strategy Configuration
CHUNKING_PRESERVE_HEADINGS=true
CHUNKING_PRESERVE_PAGE_NUMBERS=true
CHUNKING_PRESERVE_SECTION_HIERARCHY=true
CHUNKING_MIN_CHUNK_SIZE=50                          # Minimum tokens per chunk
CHUNKING_MAX_CHUNK_SIZE=1024                        # Maximum tokens per chunk

# Language Detection
LANGUAGE_DETECTION_ENABLED=true
SUPPORTED_LANGUAGES=en,fr,es,de,it,pt,nl,ja,zh,ko,ar,ru  # ISO 639-1 codes

# Monitoring & Performance
DOCUMENT_CHUNKING_MAX_SIZE_MB=20                    # Maximum document size
DOCUMENT_CHUNKING_MAX_CHUNKS_PER_DOCUMENT=10000     # Maximum chunks per document
PROCESSING_TIMEOUT_MINUTES=30                       # Overall processing timeout
TRACK_PROCESSING_METRICS=true
TRACK_CHUNK_DETAILS=true

# Service Bus Configuration (for embedding queue)
AZURE_SERVICE_BUS_CONNECTION_STRING={from-env}
AZURE_SERVICE_BUS_EMBEDDING_QUEUE=shards-to-vectorize

# Cosmos DB Configuration
COSMOS_DB_ENDPOINT={from-env}
COSMOS_DB_KEY={from-env}
COSMOS_DB_DATABASE=castiel
COSMOS_DB_SHARDS_CONTAINER=shards

# Azure Storage Configuration
AZURE_STORAGE_CONNECTION_STRING={from-env}
AZURE_STORAGE_DOCUMENTS_CONTAINER=documents

# Application Insights Monitoring
APPINSIGHTS_INSTRUMENTATIONKEY={from-env}
ENABLE_PERFORMANCE_TRACKING=true
ENABLE_DETAILED_LOGGING=true
```

### Tenant-Specific Settings (Optional)

Configuration can be extended in `TenantDocumentSettings`:

```typescript
interface TenantDocumentChunkingSettings {
  enabled: boolean;
  chunkSize?: number;                    // Override default
  chunkOverlap?: number;                 // Override default
  chunking_strategy?: 'FIXED_SIZE' | 'INTELLIGENT_SEMANTIC';
  preserveHeadings?: boolean;
  preservePageNumbers?: boolean;
  maxChunksPerDocument?: number;
  maxDocumentSizeMb?: number;
}
```

## Core Functionality

### 1. Text Extraction Service

**Interface:**
```typescript
interface TextExtractorResult {
  text: string;                          // Extracted plain text
  metadata: {
    pageCount: number;                  // Total pages
    language: string;                   // Detected language (ISO 639-1)
    confidence: number;                 // Extraction confidence (0-1)
    extractorUsed: 'azure-form-recognizer' | 'apache-tika';
    extractionDurationMs: number;
    hasImages: boolean;                 // Contains images/OCR content
    hasFormFields: boolean;             // Contains form fields
    characterCount: number;
  };
  pages?: Array<{                        // Page-by-page data
    pageNumber: number;
    content: string;
    language: string;
    confidence: number;
  }>;
  images?: Array<{                       // Image extraction results
    pageNumber: number;
    imageIndex: number;
    extractedText: string;
    confidence: number;
  }>;
}

interface ITextExtractor {
  extract(filePath: string, mimeType: string): Promise<TextExtractorResult>;
}
```

**Implementation Strategy:**

```typescript
class DocumentTextExtractor {
  async extract(filePath: string, mimeType: string): Promise<TextExtractorResult> {
    // Step 1: Route to primary extractor (Form Recognizer)
    try {
      return await formRecognizerExtractor.extract(filePath, mimeType);
    } catch (primaryError) {
      // Step 2: Fallback to Apache Tika if primary fails
      if (config.textExtraction.useFallback) {
        console.warn(`Primary extraction failed, falling back to Tika: ${primaryError.message}`);
        try {
          return await tikaExtractor.extract(filePath, mimeType);
        } catch (fallbackError) {
          throw new ExtractionError('Both extractors failed', { primaryError, fallbackError });
        }
      }
      throw primaryError;
    }
  }
}
```

**Supported MIME Types:**
- PDF: `application/pdf`
- Word: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/msword`
- HTML: `text/html`
- Plain Text: `text/plain`
- Images: `image/jpeg`, `image/png`, `image/tiff`, `image/webp`
- JSON: `application/json`

### 2. Text Normalization Service

**Interface:**
```typescript
interface TextNormalizationOptions {
  removeBoilerplate: boolean;           // Remove headers, footers, page numbers
  fixWhitespace: boolean;               // Normalize spaces and line breaks
  removeExtraLinebreaks: boolean;       // Collapse multiple line breaks
  fixEncoding: boolean;                 // Handle UTF-8 encoding issues
  preserveStructure: boolean;           // Keep section hierarchy
}

interface NormalizedText {
  text: string;                         // Cleaned text
  structure: DocumentStructure;         // Preserved structure
  metadata: {
    originalLength: number;
    normalizedLength: number;
    headingsExtracted: string[];        // Section headings found
    removedBoilerplateCount: number;
  };
}

interface DocumentStructure {
  title?: string;
  sections: Array<{
    level: number;                      // 1-6 for h1-h6
    heading: string;
    content: string;
  }>;
}
```

**Normalization Pipeline:**

```typescript
class TextNormalizer {
  async normalize(text: string, options: TextNormalizationOptions): Promise<NormalizedText> {
    // 1. Extract structure before cleaning
    const structure = this.extractStructure(text);
    
    // 2. Remove boilerplate
    if (options.removeBoilerplate) {
      text = this.removeHeaders(text);
      text = this.removeFooters(text);
      text = this.removePageNumbers(text);
    }
    
    // 3. Fix whitespace
    if (options.fixWhitespace) {
      text = text.replace(/\s+/g, ' ');  // Collapse multiple spaces
    }
    
    // 4. Fix encoding issues
    if (options.fixEncoding) {
      text = this.fixEncoding(text);
    }
    
    // 5. Preserve structure by adding markers
    if (options.preserveStructure) {
      text = this.insertStructureMarkers(text, structure);
    }
    
    return {
      text,
      structure,
      metadata: {
        originalLength: text.length,
        normalizedLength: text.length,
        headingsExtracted: structure.sections.map(s => s.heading),
        removedBoilerplateCount: this.boilerplateRemovalCount,
      }
    };
  }
}
```

### 3. Intelligent Chunking Engine

**Algorithm: Semantic-Aware Overlapping Chunks**

```typescript
interface ChunkingStrategy {
  type: 'FIXED_SIZE' | 'INTELLIGENT_SEMANTIC';
  chunkSizeTokens: number;              // 512 (best practice)
  overlapTokens: number;                // 50 (25% overlap)
  minChunkSizeTokens: number;           // 50
  maxChunkSizeTokens: number;           // 1024
  splitBoundary: 'SENTENCE' | 'PARAGRAPH' | 'PAGE';  // Respect boundaries
  preserveContext: boolean;
}

interface DocumentChunk {
  chunkId: string;                      // Hash-based ID
  sequenceNumber: number;               // Position in document
  text: string;                         // Chunk content
  startOffset: number;                  // Character position in original
  endOffset: number;
  startTokenOffset: number;             // Token position
  endTokenOffset: number;
  tokenCount: number;                   // Actual token count
  metadata: {
    pageNumber?: number;                // Page chunk started on
    sectionHeading?: string;            // Parent section
    depth: number;                      // Hierarchy depth
    context: {
      previousChunkId?: string;
      nextChunkId?: string;
      documentTitle?: string;
    };
  };
}
```

**Chunking Process:**

```typescript
class IntelligentChunkingEngine {
  async chunk(text: string, structure: DocumentStructure): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    const tokenizer = new BertTokenizer();
    let currentOffset = 0;
    let sequenceNumber = 0;
    
    // 1. Split on boundaries (sentences/paragraphs)
    const boundaries = this.findSplitBoundaries(text);
    
    // 2. Group text into chunks respecting size limits
    let currentChunk = '';
    let currentTokenCount = 0;
    let currentSectionHeading = '';
    
    for (const boundary of boundaries) {
      const segment = text.substring(boundary.start, boundary.end);
      const segmentTokens = tokenizer.tokenize(segment).length;
      
      // Check if adding segment would exceed max size
      if (currentTokenCount + segmentTokens > config.chunking.maxChunkSize) {
        // Save current chunk and start new one
        if (currentChunk.trim().length > 0) {
          chunks.push(this.createChunk(
            currentChunk,
            sequenceNumber,
            currentOffset,
            currentSectionHeading
          ));
          sequenceNumber++;
          
          // Start overlap with last tokens from previous chunk
          const overlapContent = this.getLastNTokens(currentChunk, config.chunking.overlapTokens);
          currentChunk = overlapContent;
          currentTokenCount = config.chunking.overlapTokens;
        }
      }
      
      currentChunk += segment;
      currentTokenCount += segmentTokens;
    }
    
    // 3. Save final chunk
    if (currentChunk.trim().length > 0) {
      chunks.push(this.createChunk(
        currentChunk,
        sequenceNumber,
        currentOffset,
        currentSectionHeading
      ));
    }
    
    return chunks;
  }
  
  private createChunk(text: string, sequence: number, offset: number, section: string): DocumentChunk {
    const chunkId = this.generateChunkId(text, sequence);
    const tokenizer = new BertTokenizer();
    const tokens = tokenizer.tokenize(text);
    
    return {
      chunkId,
      sequenceNumber: sequence,
      text,
      startOffset: offset,
      endOffset: offset + text.length,
      startTokenOffset: 0,
      endTokenOffset: tokens.length,
      tokenCount: tokens.length,
      metadata: {
        sectionHeading: section,
        depth: this.calculateDepth(section),
        context: {}
      }
    };
  }
  
  private generateChunkId(text: string, sequence: number): string {
    // Hash-based ID for deduplication
    const hash = crypto.createHash('sha256')
      .update(text)
      .digest('hex');
    return `chunk-${hash.substring(0, 16)}-${sequence}`;
  }
}
```

### 4. Cosmos DB Shard Creation

**c_documentChunk Shard Schema:**

```typescript
interface DocumentChunkShard {
  // Base Shard Fields
  id: string;                           // Chunk ID (hash-based)
  tenantId: string;                     // Tenant isolation
  shardTypeId: 'c_documentChunk';
  version: number;
  
  // Structured Data
  structuredData: {
    documentId: string;                 // Parent document ID
    chunkSequence: number;              // Position in document
    chunkText: string;                  // Chunk content
    startOffset: number;                // Character position
    endOffset: number;
    startTokenOffset: number;           // Token position
    endTokenOffset: number;
    tokenCount: number;                 // Token count
    embeddingStatus: 'pending' | 'processing' | 'complete' | 'failed';
    
    metadata: {
      pageNumber?: number;
      sectionHeading?: string;
      documentTitle: string;
      documentFileName: string;
      extractorUsed: 'azure-form-recognizer' | 'apache-tika';
      extractionConfidence: number;
      chunkingStrategy: 'FIXED_SIZE' | 'INTELLIGENT_SEMANTIC';
      language: string;                 // ISO 639-1
    };
  };
  
  // Unstructured Data
  unstructuredData: {
    context: {
      previousChunkId?: string;
      nextChunkId?: string;
      sectionHierarchy?: string[];
    };
    processingLog: string;
  };
  
  // Vector Embeddings (populated later by embedding processor)
  vectors?: Array<{
    id: string;
    field: 'content';
    model: string;
    dimensions: number;
    embedding: number[];
    createdAt: Date;
  }>;
  
  // Relationships
  relationships: {
    parentDocument: {
      shardId: string;
      type: 'parent';
      cascadeDelete: true;             // Delete chunks when document deleted
    };
  };
  
  // Metadata
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  status: 'active' | 'archived' | 'deleted';
  
  // Source tracking
  source: 'document-chunker-function';
  sourceMetadata: {
    functionVersion: string;
    processingDurationMs: number;
    timestamp: string;
  };
}
```

### 5. Embedding Queue Message

**Message per Chunk:**

```typescript
interface EmbeddingJobMessage {
  shardId: string;                      // Chunk shard ID
  tenantId: string;
  shardTypeId: 'c_documentChunk';
  revisionNumber: number;               // Always 1 for new chunks
  dedupeKey: string;                    // For deduplication
  enqueuedAt: string;                   // ISO 8601 timestamp
}

// Send to: shards-to-vectorize queue
// One message per chunk
// Message body contains full message object
```

## Performance Considerations

### Optimization Strategies

| Factor | Optimization | Details |
|--------|-------------|---------|
| **Extraction** | Form Recognizer for structured, Tika for fallback | ~2-5 sec per document |
| **Chunking** | Intelligent semantic splitting | ~100ms for 512-token chunks |
| **Database** | Batch writes where possible | ~10-50ms per chunk |
| **Queue** | Asynchronous sends with batching | ~5-20ms per chunk |
| **Monitoring** | Sampled metrics, not every chunk | Reduce overhead to ~1% |

### Scaling Recommendations

- **Consumption Plan:** For variable workloads, auto-scales to 200+ concurrent instances
- **Premium Plan:** For consistent high-volume (1000+ docs/day)
- **Batch Processing:** Process multiple chunks per transaction
- **Queue Batching:** Send embedding messages in batches (10-50 chunks)

### Resource Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| **Document Size** | 20 MB | Max file size from env config |
| **Processing Time** | 30 minutes | Function timeout |
| **Chunks per Document** | 10,000 | Max chunks to prevent runaway processing |
| **Memory** | 1.5 GB | Standard consumption plan |
| **Concurrent Executions** | 200 | Default Azure Functions scale |

## Monitoring & Observability

### Application Insights Metrics

```typescript
interface DocumentChunkingMetrics {
  // Document Processing
  document_chunking_started: {
    documentId: string;
    tenantId: string;
    documentSizeMb: number;
    extractorUsed: string;
  };
  
  document_extraction_completed: {
    documentId: string;
    extractionDurationMs: number;
    pageCount: number;
    language: string;
    extractorUsed: string;
  };
  
  document_chunking_completed: {
    documentId: string;
    chunkCount: number;
    chunkingDurationMs: number;
    avgTokensPerChunk: number;
    totalTokens: number;
  };
  
  chunk_created: {
    chunkId: string;
    documentId: string;
    sequenceNumber: number;
    tokenCount: number;
    pageNumber?: number;
  };
  
  embedding_job_enqueued: {
    chunkId: string;
    tenantId: string;
  };
  
  // Errors
  document_processing_failed: {
    documentId: string;
    error: string;
    stage: 'extraction' | 'normalization' | 'chunking' | 'persistence' | 'enqueueing';
    retriesAttempted: number;
  };
  
  chunk_processing_failed: {
    chunkId: string;
    error: string;
    stage: string;
  };
}
```

### Key Performance Indicators (KPIs)

- **Average Processing Time:** Target < 5 seconds for 1MB document
- **Chunk Success Rate:** Target > 99.5%
- **Queue Latency:** Target < 1 second message processing
- **Error Rate:** Target < 0.5% dead-letter messages

### Alerting

```
Alert: document_chunking_failed
Condition: Error rate > 5% over 5 minutes
Severity: High
Action: Page on-call engineer

Alert: queue_depth_high
Condition: Queue > 1000 messages
Severity: Medium
Action: Check processing performance, increase parallelism

Alert: extraction_timeout
Condition: Processing > 300 seconds per document
Severity: Medium
Action: Investigate document, may need size limit increase
```

## Security Considerations

### Data Protection

1. **Document Access Control:**
   - Verify tenant ownership before processing
   - Use managed identity for Blob Storage access
   - Use SAS tokens with expiry for document retrieval

2. **Chunk Storage:**
   - Chunks inherit parent document permissions
   - Encrypted at rest in Cosmos DB
   - Encrypted in transit (HTTPS/TLS)

3. **Text Extraction:**
   - Form Recognizer processes documents server-side
   - Tika runs in containerized, isolated environment
   - No local file storage (stream processing)

### Compliance

- **GDPR:** Support document deletion (cascading to chunks)
- **Audit:** Log all processing with audit trail
- **PII:** Currently not redacted (future enhancement)

## Deployment

### Azure Infrastructure

```yaml
Resources:
  - Azure Service Bus Queue: documents-to-chunk
  - Azure Function: DocumentChunkerFunction
  - Storage Account: Blob container for documents
  - Cosmos DB: Shards container (c_documentChunk)
  - Application Insights: Monitoring and logging
  - Azure Form Recognizer: Optional (if using)
  - Apache Tika Container: Optional (if using)
```

### Function Configuration

**Runtime:** Node.js 20 or Python 3.11+  
**Trigger:** Service Bus Queue  
**Bindings:**
- Input: Service Bus Message
- Output: Cosmos DB (write chunks)
- Output: Service Bus Queue (embedding jobs)
- Input: Azure Storage Blob (read documents)

### Environment Setup

```bash
# Install dependencies
npm install @azure/service-bus @azure/cosmos @azure/storage-blob \
            @azure/form-recognizer axios dotenv

# Key Vault secrets required:
# - azure-form-recognizer-key
# - cosmos-db-key
# - storage-account-key
# - service-bus-connection-string

# Deploy function
func azure functionapp publish <functionAppName> --build remote
```

## Error Handling & Retry Strategy

### Retry Policy

| Error Type | Retries | Backoff | Outcome |
|------------|---------|---------|---------|
| **Transient (timeout, network)** | 3 | Exponential (1s, 2s, 4s) | Automatic retry by Service Bus |
| **Extraction failure** | 3 | Exponential | Fallback to Tika |
| **DB write failure** | 3 | Exponential | Dead-letter queue |
| **Queue send failure** | 3 | Exponential | Dead-letter queue |
| **Permanent (invalid document)** | 0 | N/A | Dead-letter queue after 3 attempts |

### Dead-Letter Queue Handling

```typescript
interface DeadLetterMessage {
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

// Process dead-letter messages:
// 1. Manual review by operations team
// 2. Log to Application Insights with alert
// 3. Archive for future analysis
// 4. Option to retry after fix
```

## Testing Strategy

### Unit Tests

- Text extraction (mock various document types)
- Text normalization (verify boilerplate removal)
- Chunking algorithm (verify overlap, size limits)
- Chunk ID generation (consistency, uniqueness)

### Integration Tests

- End-to-end document processing
- Service Bus message consumption
- Cosmos DB shard creation
- Embedding message enqueueing

### Load Tests

- 100 concurrent documents
- Various document sizes (500KB - 20MB)
- Different document types
- Monitor queue latency, error rates

## Deployment Checklist

- [ ] Azure Form Recognizer endpoint configured
- [ ] Apache Tika container deployed (optional)
- [ ] Cosmos DB collection created with proper indexes
- [ ] Service Bus queues created (documents-to-chunk, shards-to-vectorize)
- [ ] Application Insights configured
- [ ] Function app created with managed identity
- [ ] Key Vault secrets configured
- [ ] Environment variables set in function app
- [ ] Monitoring and alerts configured
- [ ] Load testing completed
- [ ] Documentation deployed
- [ ] Team trained on operations

## Future Enhancements

1. **PII Detection & Redaction:** Auto-detect and redact sensitive data
2. **Table Extraction:** Extract and preserve table structure
3. **Metadata Enrichment:** Add document classification, topic modeling
4. **Multi-language Optimization:** Language-specific tokenization
5. **Incremental Chunking:** Re-chunk only changed sections
6. **Quality Scoring:** Rate chunk quality and relevance
7. **Chunk Deduplication:** Detect and merge duplicate chunks

## API References

### Azure Form Recognizer
- [Layout Analysis API](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/concept-layout)
- [Read API](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/concept-read)

### Apache Tika
- [REST API Documentation](https://tika.apache.org/1.28.3/gettingstarted.html)
- [Supported Formats](https://tika.apache.org/1.28.3/formats.html)

### Related Services
- [Cosmos DB .NET SDK](https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/sdk-dotnet)
- [Service Bus SDK](https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-nodejs-how-to-use-queues)

## References & Resources

- [Document Intelligence Capabilities](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/overview)
- [Chunking Best Practices](https://research.trychroma.com/blog/chunking-state-of-the-art)
- [Token Count Estimation](https://github.com/openai/js-tiktoken)
