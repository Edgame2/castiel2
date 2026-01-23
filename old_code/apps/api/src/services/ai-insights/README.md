# AI Insights Services

This directory contains the core services for the AI Insights system.

## Services

### AIInsightsCosmosService (`cosmos.service.ts`)
**Purpose:** Unified data access layer for all AI Insights containers

**Responsibilities:**
- Manage 10 Cosmos DB containers with Hierarchical Partition Keys
- Provide CRUD operations with automatic timestamps
- Handle queries with pagination and continuation tokens
- Batch operations for bulk inserts/updates
- Health checks and monitoring

**Key Methods:**
```typescript
// Container accessors
getFeedbackContainer(): Container
getLearningContainer(): Container
getExperimentsContainer(): Container
// ... 7 more

// CRUD operations
create<T>(container, document): Promise<T>
read<T>(container, id, partitionKey): Promise<T | null>
update<T>(container, id, partitionKey, updates): Promise<T>
delete(container, id, partitionKey): Promise<void>

// Query operations
query<T>(container, querySpec, options): Promise<QueryResult<T>>
queryAll<T>(container, querySpec, maxItems): Promise<T[]>
batchUpsert<T>(container, documents): Promise<T[]>

// Utilities
buildPartitionKey(...parts): string[]
healthCheck(): Promise<boolean>
```

**Usage Example:**
```typescript
const cosmosService = new AIInsightsCosmosService(monitoring);

// Create an insight
const container = cosmosService.getFeedbackContainer();
const insight = await cosmosService.create(container, {
  id: uuidv4(),
  tenantId: 'tenant-123',
  partitionKey: cosmosService.buildPartitionKey('tenant-123', insightId, 'user-456'),
  type: 'insight',
  query: 'What are the key risks?',
  status: 'completed',
  result: 'The key risks are...',
});

// Query insights
const results = await cosmosService.query(container, {
  query: 'SELECT * FROM c WHERE c.tenantId = @tenantId ORDER BY c.createdAt DESC',
  parameters: [{ name: '@tenantId', value: 'tenant-123' }],
}, { maxItems: 20 });

// Read single insight
const insight = await cosmosService.read(
  container,
  'insight-id',
  cosmosService.buildPartitionKey('tenant-123', 'insight-id', 'user-456')
);

// Update insight
await cosmosService.update(container, 'insight-id', partitionKey, {
  status: 'completed',
  result: 'Updated result',
});

// Delete insight
await cosmosService.delete(container, 'insight-id', partitionKey);
```

---

### InsightsService (`insights.service.ts`)
**Purpose:** Main orchestrator for the AI Insights generation pipeline

**Responsibilities:**
- Orchestrate complete insight generation workflow
- Integrate with existing AI services (IntentAnalyzer, ContextTemplate, ModelRouter)
- Handle streaming and non-streaming generation
- Perform grounding and citation extraction
- Track performance metrics and costs
- Store insights in Cosmos DB

**Pipeline Stages:**
1. **Intent Analysis** - Classify query and extract entities
2. **Context Assembly** - Gather relevant shards
3. **Model Selection** - Choose appropriate model
4. **Generation** - Generate insight with citations
5. **Grounding** - Verify claims and extract citations
6. **Storage** - Persist to Cosmos DB

**Key Methods:**
```typescript
// Generate insight (non-streaming)
generateInsight(request: InsightRequest): Promise<InsightResponse>

// Generate insight with streaming
generateInsightStream(
  request: InsightRequest,
  onChunk: (chunk: StreamChunk) => void
): Promise<InsightResponse>

// Retrieve insight
getInsight(tenantId: string, insightId: string, userId: string): Promise<InsightResponse | null>

// List insights with pagination
listInsights(
  tenantId: string,
  userId: string,
  options: { limit?: number; continuationToken?: string; status?: InsightStatus }
): Promise<QueryResult<InsightResponse>>

// Delete insight
deleteInsight(tenantId: string, insightId: string, userId: string): Promise<void>
```

**Usage Example:**
```typescript
const insightsService = new InsightsService(
  monitoring,
  cosmosService,
  intentAnalyzer,
  contextService,
  modelRouter,
  conversationService
);

// Generate an insight
const response = await insightsService.generateInsight({
  query: 'What are the key risks in this project?',
  tenantId: 'tenant-123',
  userId: 'user-456',
  shardId: 'project-789',
  temperature: 0.7,
  maxTokens: 2000,
});

console.log(response.result); // Generated insight
console.log(response.citations); // Source citations
console.log(response.grounding.overallScore); // 0.85
console.log(response.performance.totalMs); // 5234

// Stream generation
await insightsService.generateInsightStream(
  { query: 'Summarize this project', tenantId: 'tenant-123', userId: 'user-456' },
  (chunk) => {
    if (chunk.type === 'token') {
      process.stdout.write(chunk.data.token);
    } else if (chunk.type === 'complete') {
      console.log('\nDone!', chunk.data.id);
    }
  }
);

// List user insights
const { items, hasMore, continuationToken } = await insightsService.listInsights(
  'tenant-123',
  'user-456',
  { limit: 10, status: 'completed' }
);
```

---

## Container Architecture

The AI Insights system uses 10 dedicated Cosmos DB containers:

### Hot Containers (No TTL)
1. **feedback** - User feedback and insight storage
   - Partition Key: `[tenantId, insightId, userId]`
   - Purpose: Store generated insights and user feedback

2. **experiments** - A/B testing experiments
   - Partition Key: `[tenantId, experimentId, userId]`
   - Purpose: Experiment definitions and variant assignments

### Warm Containers (No TTL)
3. **learning** - Learning patterns and optimization
   - Partition Key: `/tenantId`
   - Purpose: Aggregate learning data for model improvement

4. **collaboration** - Sharing and comments
   - Partition Key: `[tenantId, insightId, userId]`
   - Purpose: Shared insights and comments

5. **templates** - Insight templates
   - Partition Key: `/tenantId`
   - Purpose: Reusable insight templates with scheduling

6. **audit** - Audit trail
   - Partition Key: `[tenantId, insightId, auditEntryId]`
   - TTL: 7 days
   - Purpose: Audit events for compliance

### Cold Containers (With TTL)
7. **media** - Multi-modal assets
   - Partition Key: `[tenantId, insightId, assetId]`
   - TTL: 1 year
   - Purpose: Store asset metadata for multi-modal insights

8. **graph** - Insight dependencies
   - Partition Key: `[tenantId, sourceInsightId, targetInsightId]`
   - TTL: 6 months
   - Purpose: Track relationships between insights

9. **exports** - Export jobs
   - Partition Key: `[tenantId, exportJobId, integrationId]`
   - TTL: 90 days
   - Purpose: Export job metadata and status

10. **backups** - Backup jobs
    - Partition Key: `[tenantId, backupJobId, recoveryPointId]`
    - TTL: 30 days
    - Purpose: Backup metadata for disaster recovery

---

## Dependencies

### Internal Services
- **IntentAnalyzerService** - Intent classification and entity extraction
- **ContextTemplateService** - Context assembly and RAG retrieval
- **ModelRouterService** - Model selection and generation
- **ConversationService** - Conversation history retrieval
- **IMonitoringProvider** - Application Insights monitoring

### External Dependencies
- `@azure/cosmos` - Cosmos DB client
- `uuid` - UUID generation
- `zod` - Request validation

---

## Performance Characteristics

### Latency (Phase 1)
- Intent Analysis: <500ms
- Context Assembly: <1s
- Model Generation: 2-10s (model-dependent)
- Grounding: <500ms
- **Total:** <15s

### Token Usage
- Prompt: 500-2000 tokens (context-dependent)
- Completion: 200-1000 tokens (complexity-dependent)
- **Cost:** $0.01-$0.05 per insight

### Throughput
- Sequential processing (Phase 1)
- Rate limiting applied at API layer

---

## Monitoring

### Metrics Tracked
- Intent analysis duration (ms)
- Context assembly duration (ms)
- Model generation duration (ms)
- Grounding duration (ms)
- Total duration (ms)
- Token usage (prompt, completion, total)
- Cost per insight (USD)
- Grounding score (0.0-1.0)

### Events Tracked
- InsightGenerated (with metadata)
- InsightGeneratedStream (with metadata)
- InsightDeleted (with IDs)

### Exceptions
- All errors tracked with full context (tenantId, userId, query, etc.)

---

## Testing

Unit tests are located in `apps/api/tests/services/ai-insights/`

Run tests:
```bash
npm test apps/api/tests/services/ai-insights
```

Coverage: >80%

---

## Configuration

Required environment variables:
```bash
# Cosmos DB containers
COSMOS_DB_FEEDBACK_CONTAINER=feedback
COSMOS_DB_LEARNING_CONTAINER=learning
COSMOS_DB_EXPERIMENTS_CONTAINER=experiments
COSMOS_DB_MEDIA_CONTAINER=media
COSMOS_DB_COLLABORATION_CONTAINER=collaboration
COSMOS_DB_TEMPLATES_CONTAINER=templates
COSMOS_DB_AUDIT_CONTAINER=audit
COSMOS_DB_GRAPH_CONTAINER=graph
COSMOS_DB_EXPORTS_CONTAINER=exports
COSMOS_DB_BACKUPS_CONTAINER=backups
```

---

## Security

### Authentication
- All operations require authenticated user context
- Tenant isolation enforced via partition keys
- User can only access own insights

### Authorization
- Tenant boundary enforcement
- User-level isolation for insights
- Admin operations (future): separate permission checks

### Data Privacy
- HPK ensures tenant/user isolation
- Delete respects partition key boundaries
- No cross-tenant data leakage

---

## Known Limitations (Phase 1)

- Grounding implementation is basic (word matching)
- No caching layer (all queries hit Cosmos)
- No batch generation support
- No retry logic with exponential backoff
- Sequential processing only

---

## Future Enhancements (Phase 2+)

### Phase 2: Essential Features
- Feedback analytics
- A/B testing framework
- Recurring search with alerts
- Notification system

### Phase 3: Advanced Features
- Multi-modal processing
- Real-time collaboration
- Template scheduling (Azure Functions)
- Advanced RAG techniques
- Graph dependency analysis

### Phase 4: Enterprise Features
- Export pipelines (PDF, DOCX)
- Admin UI and dashboards
- Cost management
- Advanced analytics

---

## Contributing

When adding new features:

1. **Update cosmos.service.ts** if new containers are needed
2. **Update insights.service.ts** for new pipeline steps
3. **Add tests** with >80% coverage
4. **Update documentation** in this README
5. **Track metrics** in Application Insights
6. **Follow HPK patterns** for multi-tenancy

---

## Support

For questions or issues:
- Review [PHASE-1-IMPLEMENTATION-SUMMARY.md](../../docs/ai-insights/PHASE-1-IMPLEMENTATION-SUMMARY.md)
- Review [PHASE-1-CHECKLIST.md](../../docs/ai-insights/PHASE-1-CHECKLIST.md)
- Check test files for usage examples
- Consult [ai-insights-containers-architecture.md](../../docs/ai-insights/ai-insights-containers-architecture.md)
