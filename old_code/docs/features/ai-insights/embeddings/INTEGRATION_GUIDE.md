# Embedding Template System - Integration Guide

## Overview

This guide shows how to integrate the Embedding Template System into existing embedding generation pipelines.

## Integration Points

### 1. Azure OpenAI Service Integration

**File**: `apps/api/src/services/azure-openai.service.ts`

Current flow:
```
generateEmbedding(text) → Azure API → embedding vector
```

Recommended flow:
```
Shard + ShardType
    ↓
EmbeddingTemplateService.extractText()
    ↓
Preprocessed text
    ↓
generateEmbedding() → Azure API
    ↓
EmbeddingTemplateService.normalizeEmbedding()
    ↓
Normalized vector → Store in shard.vectors[]
```

**Implementation Steps**:

1. Inject EmbeddingTemplateService:
```typescript
constructor(
  config: AzureOpenAIConfig,
  monitoring: IMonitoringProvider,
  private templateService: EmbeddingTemplateService  // NEW
) { }
```

2. Create new method for template-guided embedding:
```typescript
async generateEmbeddingWithTemplate(
  shard: Shard,
  shardType: ShardType,
  options?: ApplyTemplateOptions
): Promise<EmbeddingResult> {
  const template = this.templateService.getTemplate(shardType);
  const text = this.templateService.extractText(shard, template, options);
  const { text: processed } = this.templateService.preprocessText(
    text,
    template.preprocessing
  );
  
  const response = await this.generateEmbedding({
    text: processed,
    model: this.templateService.getModelId(template, options)
  });
  
  const normalized = this.templateService.normalizeEmbedding(
    response.embedding,
    template.normalization
  );
  
  return this.templateService.createEmbeddingResult(
    normalized,
    template,
    processed,
    {
      model: response.model,
      tokenCount: response.tokenCount
    }
  );
}
```

### 2. Shard Repository Integration

**File**: `apps/api/src/repositories/shard.repository.ts`

During shard creation/update, automatically generate embeddings:

```typescript
async create(input: CreateShardInput): Promise<Shard> {
  // ... existing create logic ...
  
  const shard: Shard = {
    // ... populate shard ...
  };
  
  const { resource } = await this.container.items.create(shard);
  
  // NEW: Generate embeddings using template
  try {
    if (input.generateEmbeddings !== false) {
      const shardType = await this.shardTypeRepository.findById(
        input.shardTypeId,
        input.tenantId
      );
      
      if (shardType) {
        const embeddingResult = 
          await this.embeddingService.generateEmbeddingWithTemplate(
            resource,
            shardType
          );
        
        if (embeddingResult) {
          resource.vectors = resource.vectors || [];
          resource.vectors.push({
            id: uuidv4(),
            field: 'combined',
            model: embeddingResult.metadata.model,
            dimensions: embeddingResult.metadata.dimensions,
            embedding: embeddingResult.embedding,
            createdAt: new Date()
          });
          
          // Update shard with embeddings
          await this.container.item(resource.id, resource.tenantId)
            .replace(resource);
        }
      }
    }
  } catch (error) {
    this.monitoring.trackException(error as Error, {
      operation: 'shard.repository.create.embeddings',
      shardId: resource.id
    });
    // Don't fail shard creation if embedding fails
  }
  
  return resource;
}
```

### 3. Web Search Service Integration

**File**: `apps/api/src/services/web-search/embedding.service.ts`

Current implementation already embeds chunks. Enhance to use templates:

```typescript
async embedChunks(chunks: SemanticChunk[]): Promise<SemanticChunk[]> {
  // For web pages, apply template-like preprocessing
  // since there's no explicit ShardType
  
  // Could apply a default "document" template:
  const documentTemplate = getDefaultDocumentTemplate();
  
  return Promise.all(
    chunks.map(async (chunk) => {
      // Apply template preprocessing to each chunk
      const processed = this.templateService.preprocessText(
        chunk.text,
        documentTemplate.preprocessing
      );
      
      const embedding = await this.generateEmbeddingForChunk(
        processed.text,
        this.templateService.getModelId(documentTemplate)
      );
      
      const normalized = this.templateService.normalizeEmbedding(
        embedding,
        documentTemplate.normalization
      );
      
      return {
        ...chunk,
        embedding: normalized
      };
    })
  );
}
```

### 4. Vector Search Integration

**File**: `apps/api/src/services/vector-search.service.ts` (new or existing)

Use template information to guide search:

```typescript
async semanticSearch(
  query: string,
  shardTypeId: string,
  tenantId: string,
  limit: number = 10
): Promise<SearchResult[]> {
  // 1. Get shard type and template
  const shardType = await this.shardTypeRepository.findById(
    shardTypeId,
    tenantId
  );
  const template = this.templateService.getTemplate(shardType);
  
  // Check if vector search is enabled
  if (!template.enableVectorSearch) {
    throw new Error(`Vector search not enabled for ${shardType.name}`);
  }
  
  // 2. Embed query using same template
  const queryEmbedding = await this.embeddingService
    .generateEmbeddingWithTemplate(
      { structuredData: { query } } as Shard,
      shardType
    );
  
  // 3. Search in Cosmos DB or AI Search
  const results = await this.searchVectors(
    queryEmbedding.embedding,
    shardTypeId,
    tenantId,
    {
      limit,
      minSimilarity: 0.65,
      model: template.modelConfig.modelId
    }
  );
  
  return results;
}
```

### 5. Enrichment Pipeline Integration

**File**: `apps/api/src/services/enrichment.service.ts`

Include template-based embeddings in enrichment:

```typescript
async enrichShard(
  shard: Shard,
  shardType: ShardType,
  enrichmentConfig: EnrichmentConfig
): Promise<Shard> {
  const enrichmentResults = await this.runEnrichment(shard, enrichmentConfig);
  
  // NEW: Generate embeddings as part of enrichment
  const template = this.templateService.getTemplate(shardType);
  const embeddingResult = await this.embeddingService
    .generateEmbeddingWithTemplate(shard, shardType);
  
  return {
    ...shard,
    enrichment: {
      config: enrichmentConfig,
      enrichmentData: enrichmentResults,
      lastEnrichedAt: new Date(),
      lastEmbeddedAt: new Date()
    },
    vectors: [
      ...(shard.vectors || []),
      {
        id: uuidv4(),
        field: 'enriched',  // Mark as enrichment-generated
        model: embeddingResult.metadata.model,
        dimensions: embeddingResult.metadata.dimensions,
        embedding: embeddingResult.embedding,
        createdAt: new Date()
      }
    ]
  };
}
```

## Service Dependencies

### Dependency Injection Setup

```typescript
// In your DI container/bootstrap

// 1. Create template service
const templateService = new EmbeddingTemplateService(monitoring);

// 2. Inject into embedding services
const azureOpenAiService = new AzureOpenAIService(
  config,
  monitoring,
  templateService  // NEW
);

const shardRepository = new ShardRepository(
  monitoring,
  cacheService,
  serviceBusService,
  templateService  // NEW
);

// 3. Make available to consumers
container.register('EmbeddingTemplateService', templateService);
container.register('AzureOpenAIService', azureOpenAiService);
```

## API Route Integration

If exposing template management via REST:

```typescript
// Register routes for template management
fastify.post('/api/v1/shard-types/:id/embedding-template', 
  async (request, reply) => {
    const { id } = request.params;
    const template = request.body;
    
    const updated = await shardTypeRepository.updateEmbeddingTemplate(
      id,
      request.user.tenantId,
      template
    );
    
    return reply.send(updated);
  }
);

fastify.get('/api/v1/shard-types/:id/embedding-template',
  async (request, reply) => {
    const { id } = request.params;
    
    const template = await shardTypeRepository.getEmbeddingTemplate(
      id,
      request.user.tenantId
    );
    
    return reply.send(template);
  }
);
```

## Configuration via Environment

```env
# Embedding defaults
EMBEDDING_DEFAULT_MODEL=text-embedding-3-small
EMBEDDING_FALLBACK_MODEL=text-embedding-ada-002
EMBEDDING_DEFAULT_CHUNK_SIZE=512
EMBEDDING_DEFAULT_OVERLAP=50
EMBEDDING_ENABLE_L2_NORMALIZATION=true
EMBEDDING_REMOVE_OUTLIERS=false
```

## Database Migration

When adding embedding templates to existing ShardTypes:

```typescript
async function migrateEmbeddingTemplates() {
  const shardTypes = await shardTypeRepository.list();
  
  for (const shardType of shardTypes) {
    if (!shardType.embeddingTemplate) {
      // Assign default template
      const template = createDefaultTemplateForType(shardType);
      
      await shardTypeRepository.updateEmbeddingTemplate(
        shardType.id,
        shardType.tenantId,
        template
      );
    }
  }
}
```

## Testing Integration

```typescript
describe('Embedding Template Integration', () => {
  it('should generate embeddings using shard template', async () => {
    const shard = createTestShard();
    const shardType = createTestShardType();
    
    const result = await embeddingService
      .generateEmbeddingWithTemplate(shard, shardType);
    
    expect(result).toBeDefined();
    expect(result.embedding).toHaveLength(1536);
    expect(result.templateVersion).toBe(1);
  });

  it('should store embeddings in shard vectors', async () => {
    const created = await shardRepository.create(testInput);
    
    expect(created.vectors).toBeDefined();
    expect(created.vectors?.length).toBeGreaterThan(0);
    expect(created.vectors?.[0].model).toBe('text-embedding-3-small');
  });

  it('should enable vector search only if template allows', async () => {
    const template = { ...testTemplate, enableVectorSearch: false };
    const shardType = { ...testShardType, embeddingTemplate: template };
    
    await expect(
      vectorSearchService.search('query', shardType.id, 'tenant-1')
    ).rejects.toThrow('Vector search not enabled');
  });
});
```

## Rollout Strategy

### Phase 1: Setup (Week 1)
- [ ] Integrate EmbeddingTemplateService into embedding pipelines
- [ ] Add template support to ShardRepository
- [ ] Create seeding script for default templates
- [ ] Write unit tests

### Phase 2: Gradual Rollout (Week 2)
- [ ] Enable template-based embedding for new shards
- [ ] Feature flag for automatic embedding
- [ ] Monitor performance and quality metrics
- [ ] Gather feedback

### Phase 3: Migration (Week 3)
- [ ] Run background job to reprocess existing embeddings
- [ ] Update search to use template-aware queries
- [ ] Full rollout to production
- [ ] Deprecate non-template embeddings

### Phase 4: Optimization (Week 4+)
- [ ] Auto-tune templates based on search metrics
- [ ] Add advanced template management UI
- [ ] Implement multi-model embedding
- [ ] Performance optimization

## Monitoring & Observability

Track these metrics:
```typescript
// Embedding generation
monitoring.trackEvent('embedding.generated', {
  shardTypeId,
  template_version: template.version,
  model: effectiveModel,
  duration_ms: endTime - startTime,
  embedding_dimensions: embedding.length,
  chunks_created: chunks?.length || 0
});

// Template usage
monitoring.trackEvent('template.used', {
  shardTypeId,
  is_custom: !!shardType.embeddingTemplate,
  strategy: template.modelConfig.strategy
});

// Normalization
monitoring.trackEvent('embedding.normalized', {
  l2_normalized: template.normalization.l2Normalize,
  outliers_removed: template.normalization.removeOutliers
});
```

## Troubleshooting

### Issue: Templates not being applied
**Solution**: Ensure EmbeddingTemplateService is injected in the embedding pipeline

### Issue: Embeddings not stored
**Solution**: Check `storeInShard` flag in template

### Issue: Vector search not working
**Solution**: Verify `enableVectorSearch: true` in template

### Issue: Different embeddings for same shard
**Solution**: Ensure template version is consistent, regenerate all

---

See main documentation (`embeddings.md`) for comprehensive reference.
