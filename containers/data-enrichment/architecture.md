# Data Enrichment Module - Architecture

## Overview

The Data Enrichment module provides AI-powered enrichment and vectorization pipeline for shards in the Castiel system. It processes shard content to extract entities, classify content, generate summaries, analyze sentiment, and create embeddings for semantic search.

## Database Architecture

### Cosmos DB NoSQL Structure

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `enrichment_jobs` | `/tenantId` | Enrichment job queue |
| `enrichment_results` | `/tenantId` | Enrichment results |
| `enrichment_configurations` | `/tenantId` | Enrichment configurations |
| `enrichment_history` | `/tenantId` | Enrichment history |
| `vectorization_jobs` | `/tenantId` | Vectorization job queue |
| `shard_relationships` | `/tenantId` | Shard relationship data |
| `shard_acls` | `/tenantId` | Shard ACL data |

## Service Architecture

### Core Services

1. **EnrichmentService** - Main enrichment orchestration
   - Job management
   - Processor registration and execution
   - Batch processing

2. **VectorizationService** - Vectorization processing
   - Convert content to embeddings
   - Batch vectorization

3. **ShardEmbeddingService** - Embedding management
   - Store and retrieve embeddings
   - Similarity search

### Enrichment Processors

- **EntityExtractionProcessor**: Extract entities from content
- **ClassificationProcessor**: Classify content
- **SummarizationProcessor**: Generate summaries
- **SentimentAnalysisProcessor**: Analyze sentiment
- **KeyPhrasesProcessor**: Extract key phrases

## Integration Points

- **shard-manager**: Shard access
- **embeddings**: Embedding storage and similarity search
- **ai-service**: AI-powered enrichment processing
