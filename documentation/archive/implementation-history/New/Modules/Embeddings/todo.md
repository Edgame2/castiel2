# Embeddings Module Todo List

## Architecture

- **Type**: Container (Docker)
- **Database**: Shared PostgreSQL (`coder_ide`) with `emb_` table prefix + **pgvector extension**
- **Communication**: REST API + RabbitMQ (publisher)

## Dependencies

- AI Service (for OpenAI embeddings via provider)
- Secret Management (API keys)
- Usage Tracking (sends usage events)

---

## Specification

- [x] Create Embeddings Module specification

## Implementation

### Phase 1: Core Infrastructure (Week 1)
- [ ] Database schema with pgvector (`emb_*` tables)
- [ ] Enable pgvector extension
- [ ] OpenAI embedding provider
- [ ] Basic embedding generation endpoint

### Phase 2: Search & Collections (Week 2)
- [ ] Semantic search implementation (cosine similarity)
- [ ] Collection CRUD
- [ ] Text chunking service
- [ ] Document management
- [ ] HNSW index creation

### Phase 3: Batch Processing (Week 3)
- [ ] Batch processor
- [ ] Job tracking
- [ ] Progress updates (RabbitMQ events)
- [ ] Error handling

### Phase 4: Integration & UI (Week 4)
- [ ] Knowledge Base integration
- [ ] Admin UI for collections
- [ ] Job monitoring UI
- [ ] Search testing

## Providers

- [ ] OpenAI Embeddings (text-embedding-3-small, text-embedding-3-large)
- [ ] Ollama Embeddings (nomic-embed-text, mxbai-embed-large)

## Integration

- [ ] Integrate with AI Service for embedding generation
- [ ] Integrate with Secret Management for API keys
- [ ] Publish usage events to Usage Tracking
- [ ] Integrate with Knowledge Base for document search

## Testing

- [ ] Unit tests for chunking service
- [ ] Unit tests for vector store
- [ ] Integration tests for search
- [ ] Performance tests for HNSW index

