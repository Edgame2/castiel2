# Embeddings Service Module - Architecture

## Overview

The Embeddings Service module provides vector embeddings service for Castiel, storing and searching code embeddings using vector similarity.

## Database Architecture

### Cosmos DB NoSQL Structure

The module uses the following Cosmos DB containers in the shared database:

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `embedding_embeddings` | `/tenantId` | Vector embeddings |
| `embedding_documents` | `/tenantId` | Document metadata |

### Partition Key Strategy

All containers are partitioned by `/tenantId` to ensure tenant isolation.

## Service Architecture

### Core Services

1. **Embedding Service** - Store, update, and search embeddings
2. **Batch Operations** - Batch embedding operations
3. **Similarity Search** - Semantic similarity search

## Data Flow

```
User Request
    ↓
Embeddings Service
    ↓
AI Service (generate embeddings)
    ↓
Cosmos DB (store embeddings)
    ↓
Redis (cache embeddings)
    ↓
Similarity Search
    ↓
Return Results
```

## External Dependencies

- **AI Service**: For embedding generation
- **Logging Service**: For audit logging
- **Redis**: For caching

## Configuration

All configuration is managed via `config/default.yaml` with environment variable overrides. Service URLs are config-driven, not hardcoded.
