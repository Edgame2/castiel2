# Embedding System Quality Assurance

## Overview
Complete embedding system implementation with visual editor, prompt-based generation, and quality verification tools.

## System Components

### 1. Template Management
- **Visual Editor**: 5-tab interface (Basic, Fields, Preprocessing, Model, Raw JSON)
  - Field auto-detection from schema
  - Weight slider (0-100%, normalized to 0-1 on save)
  - Chunking and preprocessing config
  - Model strategy selection
- **Prompt-Based Generation**: AI-powered template recommendations via prompt system
- **API**: Full CRUD + generation endpoints

### 2. Embedding Generation
- **Service Architecture**:
  - `ShardEmbeddingService`: Orchestrates template → text extraction → embedding → storage
  - `EmbeddingTemplateService`: Field weighting, preprocessing, normalization
  - `EmbeddingService`: Azure OpenAI integration (OpenAI SDK)
- **Features**:
  - Field-level weighting and preprocessing
  - Smart chunking (sentence-aware, configurable overlap)
  - Parent context injection
  - L2 normalization for cosine similarity
  - Batch processing support

### 3. Quality Assurance

#### Weight Normalization
- **UI**: 0-100% slider for intuitive editing
- **Backend**: Accepts 0-1 or 0-100, validates both ranges
- **Save**: Auto-converts 0-100% → 0-1 before API call

#### Test Harness
Run quality checks on generated embeddings:

```bash
# Get admin token first
bash scripts/get-admin-token.sh

# Test embedding quality for a shard
pnpm tsx scripts/test-embedding-quality.ts <shardId> <tenantId>
```

**Metrics Reported**:
- ✅ Vector dimensions (e.g., 1536 for ada-002, 3072 for 3-large)
- ✅ L2 normalization verification (magnitude ≈ 1.0)
- ✅ Magnitude statistics (avg, min, max)
- ✅ Sample vectors (first 5 dims for inspection)
- ✅ Cosine similarity between chunks (diversity check)
- ✅ Processing time and template used

## API Endpoints

### Template Management
```bash
# Generate template from prompt
POST /api/v1/embedding-templates/generate
{
  "shardTypeId": "uuid",
  "shardTypeName": "Company",
  "schema": ["name", "description", "website"],
  "promptTag": "embeddingTemplate"
}

# Get template for shard type
GET /api/v1/shard-types/:id/embedding-template

# Update template
PUT /api/v1/shard-types/:id/embedding-template
{
  "name": "Company Embedding",
  "fields": [
    { "name": "name", "weight": 100, "include": true },
    { "name": "description", "weight": 80, "include": true }
  ],
  ...
}
```

### Embedding Generation
```bash
# Generate for single shard
POST /api/v1/shards/:shardId/embeddings/generate
{ "force": true }

# Regenerate for all shards of a type
POST /api/v1/shard-types/:shardTypeId/embeddings/regenerate
{ "force": true }

# Batch generate
POST /api/v1/shards/embeddings/batch
{ "shardIds": ["id1", "id2"], "force": true }
```

## Configuration

### Azure OpenAI Setup
Required environment variables:
```bash
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_DEPLOYMENT_NAME=text-embedding-3-small
```

### Model Strategy Mapping
- `fast` → `text-embedding-3-small`
- `quality` → `text-embedding-3-large`
- `default` → `text-embedding-3-small`
- `custom` → Use `modelId` from template

**Important**: Ensure your Azure deployment name matches the strategy or set explicit `modelId` in template.

## Quality Checklist

- [ ] Azure OpenAI configured with valid endpoint and key
- [ ] Deployment name matches model strategy
- [ ] Test harness confirms:
  - [ ] Non-empty vectors generated
  - [ ] Correct dimensions for model
  - [ ] L2 normalized (magnitude ≈ 1.0)
  - [ ] Reasonable cosine similarity (0.3-0.8 for chunks)
- [ ] UI schema fields display correctly
- [ ] Template generation via prompt works
- [ ] Sonner toasts show for save/generate actions
- [ ] Weights save as 0-1 (converted from 0-100%)

## Troubleshooting

### No vectors generated
- Check `AZURE_OPENAI_ENDPOINT` and `AZURE_OPENAI_API_KEY` set
- Verify deployment exists in Azure
- Check shard has text fields matching template

### Empty embeddings (all zeros)
- `EmbeddingService` disabled (missing config)
- Returns `[]` when not configured
- Check logs: "⚠️ Azure OpenAI endpoint and API key not configured"

### Magnitude not 1.0
- L2 normalization disabled in template
- Set `template.normalization.l2Normalize = true`

### Low-quality embeddings
- Check field weights (important fields should have higher %)
- Verify text extraction includes relevant fields
- Review preprocessing (chunking may split semantics poorly)
- Compare cosine similarity of related shards (should be > 0.5)

## Monitoring

Track these metrics in Application Insights:
- `embedding.manual_generation`: Manual trigger events
- `shard-embedding.generated`: Success with vector count, model, time
- `shard-embedding.skipped`: Skipped due to recent vectors
- `shard-embedding.no-text`: Failed extraction (empty text)
- `embedding-template.extractText`: Text extraction operations
- `embedding-template.preprocessText`: Preprocessing pipeline

## Next Steps

1. **Create prompts**: Add prompts tagged `embeddingTemplate` for AI generation
2. **Test quality**: Run harness on representative shards
3. **Tune templates**: Adjust weights and preprocessing based on metrics
4. **Monitor**: Track dimensions, magnitudes, and similarity in production
5. **Optimize**: Profile token usage and consider caching strategies
