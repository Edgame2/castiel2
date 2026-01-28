# Integration Data Flow Plan - Question Answers & Recommendations

**Date:** January 28, 2025  
**Based On:** User inputs + Enterprise best practices + Existing CAIS architecture

---

## User Inputs Summary

- ✅ **ML Fields:** Need immediately for real-time risk scoring (Option A)
- ✅ **Implementation Scope:** Complete multi-modal foundation from day 1 (Option B)
- ✅ **Migration Strategy:** Development only, can break temporarily (Option B)
- ✅ **Azure Infrastructure:** Need to provision Blob Storage + Cognitive Services

---

## Section 1: Shard Type Architecture

### Question 1.1: Opportunity Shard ML Field Calculation

**ANSWER: Option C - Hybrid Approach**

**Recommendation:**
```yaml
ML Field Calculation Strategy:
  
  DURING MAPPING (Synchronous):
  - daysInStage: Calculate from current stage + lastStageChangeDate
  - daysSinceLastActivity: Calculate from lastActivityDate
  - dealVelocity: Calculate from stage progression history
  - competitorCount: Count from shard relationships (if < 10)
  - stakeholderCount: Count from shard relationships (if < 10)
  
  AFTER MAPPING (Asynchronous - Separate Consumer):
  - documentCount: Query Document shards via relationships
  - emailCount: Query Email shards via relationships
  - meetingCount: Query Meeting shards via relationships
  - callCount: Query Meeting shards (type="call") via relationships
  
  Why Hybrid:
  - Simple calculations (dates, velocity) are fast → do during mapping
  - Relationship counts require queries → do async to avoid blocking
  - Async consumer updates opportunity shard + publishes opportunity.updated
  - Risk scoring can use partial data initially, full data after async completes
```

**Implementation:**

**Step 1: During Mapping (CRMDataMappingConsumer)**
```typescript
async processOpportunity(rawData: any): Promise<OpportunityStructuredData> {
  const mapped = await this.fieldMapper.mapFields(rawData);
  
  // Calculate simple ML fields
  mapped.daysInStage = this.calculateDaysInStage(
    mapped.currentStage,
    mapped.lastStageChangeDate
  );
  
  mapped.daysSinceLastActivity = this.calculateDaysSince(
    mapped.lastActivityDate
  );
  
  mapped.dealVelocity = this.calculateDealVelocity(
    mapped.stageHistory
  );
  
  // Set count fields to 0 initially (will be updated by MLFieldAggregationConsumer)
  mapped.documentCount = 0;
  mapped.emailCount = 0;
  mapped.meetingCount = 0;
  mapped.callCount = 0;
  mapped.competitorCount = 0;
  mapped.stakeholderCount = 0;
  
  return mapped;
}
```

**Step 2: After Mapping (NEW: MLFieldAggregationConsumer)**
```typescript
class MLFieldAggregationConsumer {
  // Listens to: shard.created (Opportunity shards)
  async processOpportunityShard(event: ShardCreatedEvent) {
    const opportunityId = event.shardId;
    
    // Query relationship counts
    const counts = await Promise.all([
      this.countRelatedShards(opportunityId, 'Document'),
      this.countRelatedShards(opportunityId, 'Email'),
      this.countRelatedShards(opportunityId, 'Meeting', { type: 'meeting' }),
      this.countRelatedShards(opportunityId, 'Meeting', { type: 'call' }),
      this.countRelatedShards(opportunityId, 'Contact', { isCompetitor: true }),
      this.countRelatedShards(opportunityId, 'Contact', { isStakeholder: true })
    ]);
    
    // Update opportunity shard
    await this.shardManager.updateShard(opportunityId, {
      'structuredData.documentCount': counts[0],
      'structuredData.emailCount': counts[1],
      'structuredData.meetingCount': counts[2],
      'structuredData.callCount': counts[3],
      'structuredData.competitorCount': counts[4],
      'structuredData.stakeholderCount': counts[5]
    });
    
    // Publish opportunity.updated to trigger risk scoring with full data
    await this.eventPublisher.publish('integration.opportunity.ml_fields_updated', {
      opportunityId,
      tenantId: event.tenantId,
      fieldsUpdated: ['documentCount', 'emailCount', 'meetingCount', 'callCount', 'competitorCount', 'stakeholderCount']
    });
  }
}
```

**Latency Impact:**
- Initial risk scoring: Uses partial data (0 for counts) - **~500ms**
- Full risk scoring: After ML fields updated (1-2 seconds later) - triggers automatically

**Benefits:**
- ✅ Fast initial shard creation
- ✅ Real-time simple calculations
- ✅ Accurate relationship counts without blocking
- ✅ Risk scoring can start immediately with partial data
- ✅ Automatic refresh when counts are ready

---

### Question 1.2: Shard Type Creation Timing

**ANSWER: Option A - Create All Shard Types Upfront in Phase 1**

**Recommendation:**
```yaml
Phase 1 Shard Type Creation:

Week 1 - Day 1-2: Create ALL Shard Types
  CRM Shards (Updates):
  - Update Opportunity shard type (add ML fields)
  - Verify Account shard type
  - Verify Contact shard type
  - Verify Lead shard type
  
  Multi-Modal Shards (New):
  - Create Document shard type
  - Create Email shard type
  - Create Message shard type
  - Create Meeting shard type
  - Create CalendarEvent shard type
  - Create Activity shard type (optional)
  - Create Interaction shard type (optional)

Week 1 - Day 3-5: Create TypeScript Interfaces
  - Define all structuredData interfaces
  - Define all Shard interfaces
  - Add to packages/shared
  - Generate validation schemas

Why Upfront:
- ✅ Consistent schema across all phases
- ✅ Easier testing (can create test shards from day 1)
- ✅ No schema changes mid-implementation
- ✅ Processors can be built in parallel
- ✅ TypeScript types available immediately
- ✅ Only 2-3 days of work upfront
```

**Benefits:**
- All developers have consistent types from day 1
- Can build all processors in parallel (if team > 1 person)
- No schema migration needed mid-project
- Testing infrastructure can be set up once

**Risk Mitigation:**
- Make all new fields optional initially
- Can adjust schemas in development without migration
- Lock schemas after Phase 1 complete

---

### Question 1.3: Shard Type Versioning

**ANSWER: Option B - Make New Fields Optional, Populate on Next Sync**

**Recommendation:**
```yaml
Shard Schema Evolution Strategy:

Approach: Schema Extension (Not Versioning)
- ALL new fields are OPTIONAL (TypeScript: field?: type)
- Existing shards continue working without changes
- New fields populated on next sync or via backfill job
- No version tracking needed in development phase

For Opportunity Shard ML Fields:
- Add fields as optional: documentCount?: number
- Mapping consumer populates for new shards
- Existing shards: null/undefined until next sync
- Risk scoring handles missing fields gracefully

Migration Path:
1. Add new optional fields to shard type
2. Update TypeScript interfaces (optional fields)
3. Update mapping consumer to populate new fields
4. Existing shards: Gradual update via sync
5. Optional: Run backfill script for immediate consistency

Why This Approach:
- ✅ No breaking changes
- ✅ No version tracking overhead
- ✅ Simple to implement
- ✅ Suitable for development/early production
- ✅ Can add full versioning later if needed

Future (Production at Scale):
- Consider version field: schemaVersion: "1.0.0"
- Track schema changes in migration log
- Support N-1 version compatibility
```

**Backfill Script (Optional):**
```typescript
// Run once after schema update
async function backfillMLFields() {
  const opportunities = await shardRepository.queryAll({
    shardType: 'Opportunity',
    'structuredData.documentCount': { $exists: false }
  });
  
  for (const opp of opportunities) {
    // Calculate ML fields
    const mlFields = await calculateMLFields(opp.id);
    
    // Update shard
    await shardManager.updateShard(opp.id, {
      'structuredData.documentCount': mlFields.documentCount,
      // ... other fields
    });
  }
}
```

---

## Section 2: Multi-Modal Data Processing

### Question 2.1: Processor Architecture

**ANSWER: Option A - Implement Specialized Processors Immediately**

**Recommendation:**
```yaml
Processor Architecture:

Implementation: Specialized Processors from Day 1

Processors to Implement:
1. CRMDataMappingConsumer
   - Queue: integration_data_raw
   - Handles: Opportunity, Account, Contact, Lead
   - Output: CRM shards
   
2. DocumentProcessorConsumer
   - Queue: integration_documents
   - Handles: Documents from Google Drive, SharePoint, etc.
   - Output: Document shards
   
3. EmailProcessorConsumer
   - Queue: integration_communications (email filter)
   - Handles: Emails from Gmail, Outlook
   - Output: Email shards
   
4. MessageProcessorConsumer
   - Queue: integration_communications (message filter)
   - Handles: Slack, Teams messages
   - Output: Message shards
   
5. MeetingProcessorConsumer
   - Queue: integration_meetings
   - Handles: Zoom, Teams, Gong meetings
   - Output: Meeting shards
   
6. EventProcessorConsumer
   - Queue: integration_events
   - Handles: Calendar events
   - Output: CalendarEvent shards
   
7. MLFieldAggregationConsumer (NEW)
   - Queue: shard_created (filter: Opportunity)
   - Handles: ML field calculation
   - Output: Updated Opportunity shards

Why Specialized Processors:
- ✅ Clean separation of concerns
- ✅ Independent scaling (scale document processing separately)
- ✅ Different error handling per type
- ✅ Different retry strategies per type
- ✅ Easier to maintain and test
- ✅ Better monitoring (metrics per processor)
- ✅ Can be built in parallel by team

Trade-offs:
- ❌ More code than unified consumer
- ❌ More deployment units
- ✅ BUT: Better architecture for long-term maintenance
```

**Shared Base Class:**
```typescript
abstract class BaseIntegrationProcessor {
  protected shardManager: ShardManagerClient;
  protected eventPublisher: EventPublisher;
  protected entityLinkingService: EntityLinkingService;
  protected logger: Logger;
  
  constructor(config: ProcessorConfig) {
    this.shardManager = new ShardManagerClient(config.shardManagerUrl);
    this.eventPublisher = new EventPublisher(config.rabbitmq);
    this.entityLinkingService = new EntityLinkingService();
    this.logger = new Logger({ context: this.constructor.name });
  }
  
  abstract processEvent(event: IntegrationEvent): Promise<void>;
  
  protected async createShardWithLinks(
    shardData: any,
    shardType: string,
    tenantId: string
  ): Promise<string> {
    // 1. Create shard
    const shardId = await this.shardManager.createShard({
      ...shardData,
      shardType,
      tenantId
    });
    
    // 2. Entity linking
    const links = await this.entityLinkingService.findLinks(shardData, tenantId);
    
    // 3. Create relationships
    await this.createRelationships(shardId, links);
    
    return shardId;
  }
  
  protected async handleError(error: Error, event: IntegrationEvent): Promise<void> {
    this.logger.error('Processing failed', { error, event });
    
    // Publish failure event
    await this.eventPublisher.publish('integration.processing.failed', {
      ...event,
      error: error.message
    });
  }
}
```

---

### Question 2.2: Queue Strategy

**ANSWER: Option A - Separate Queues Per Data Type**

**Recommendation:**
```yaml
Queue Architecture:

Queue Configuration:

1. integration_data_raw (CRM Data)
   Purpose: CRM entities (Opportunity, Account, Contact, Lead)
   Consumer: CRMDataMappingConsumer
   Prefetch: 20
   DLQ: integration_data_raw.dlq
   TTL: 24 hours
   
2. integration_documents (Documents)
   Purpose: Documents from Google Drive, SharePoint, Dropbox, OneDrive
   Consumer: DocumentProcessorConsumer
   Prefetch: 5 (slow processing - download, extract, analyze)
   DLQ: integration_documents.dlq
   TTL: 48 hours (large files)
   Max Message Size: 10MB (store large files in blob, pass reference)
   
3. integration_communications (Emails + Messages)
   Purpose: Emails (Gmail, Outlook) + Messages (Slack, Teams)
   Consumers: EmailProcessorConsumer + MessageProcessorConsumer
   Prefetch: 10
   DLQ: integration_communications.dlq
   TTL: 24 hours
   Message Routing: Use message headers to route to correct consumer
   
4. integration_meetings (Meetings & Calls)
   Purpose: Zoom, Teams, Gong meetings with recordings/transcripts
   Consumer: MeetingProcessorConsumer
   Prefetch: 3 (very slow - transcription, analysis)
   DLQ: integration_meetings.dlq
   TTL: 72 hours (very large files, long processing)
   Max Message Size: 10MB (store recordings in blob)
   
5. integration_events (Calendar Events)
   Purpose: Google Calendar, Outlook calendar events
   Consumer: EventProcessorConsumer
   Prefetch: 15 (fast processing)
   DLQ: integration_events.dlq
   TTL: 24 hours
   
6. shard_ml_aggregation (ML Field Updates)
   Purpose: Trigger ML field calculation for new shards
   Consumer: MLFieldAggregationConsumer
   Prefetch: 10
   DLQ: shard_ml_aggregation.dlq
   TTL: 24 hours

Why Separate Queues:
- ✅ Independent scaling per data type
- ✅ Different prefetch settings per type
- ✅ Different DLQ TTLs per type
- ✅ Isolated failures (document processing failure doesn't block CRM)
- ✅ Clear monitoring per queue
- ✅ Easy to prioritize (e.g., CRM over documents)
- ✅ Can disable specific data types without affecting others

Queue Creation Script:
```

**RabbitMQ Setup Script:**
```typescript
async function setupIntegrationQueues() {
  const queues = [
    {
      name: 'integration_data_raw',
      prefetch: 20,
      dlq: 'integration_data_raw.dlq',
      ttl: 86400000
    },
    {
      name: 'integration_documents',
      prefetch: 5,
      dlq: 'integration_documents.dlq',
      ttl: 172800000,
      maxLength: 10000 // Limit queue depth
    },
    {
      name: 'integration_communications',
      prefetch: 10,
      dlq: 'integration_communications.dlq',
      ttl: 86400000
    },
    {
      name: 'integration_meetings',
      prefetch: 3,
      dlq: 'integration_meetings.dlq',
      ttl: 259200000
    },
    {
      name: 'integration_events',
      prefetch: 15,
      dlq: 'integration_events.dlq',
      ttl: 86400000
    },
    {
      name: 'shard_ml_aggregation',
      prefetch: 10,
      dlq: 'shard_ml_aggregation.dlq',
      ttl: 86400000
    }
  ];
  
  for (const queue of queues) {
    await createQueueWithDLQ(queue);
  }
}
```

---

### Question 2.3: Document Processing Priority

**ANSWER: Option B - Synchronous for Small Docs, Async for Large**

**Recommendation:**
```yaml
Document Processing Strategy:

Threshold: 5MB file size

SMALL DOCUMENTS (< 5MB):
  Flow: Download → Extract → Analyze → Store (all in one consumer)
  Latency: 5-30 seconds
  Examples: PDFs, Word docs, presentations
  Processing: Synchronous in DocumentProcessorConsumer
  
LARGE DOCUMENTS (>= 5MB):
  Flow: 
    Step 1: Download → Store in Blob → Create shard (partial) [Fast]
    Step 2: Extract → Analyze → Update shard [Async, separate job]
  Latency: Initial shard in 2-5 seconds, full analysis in 1-5 minutes
  Examples: Large PDFs, videos, big spreadsheets
  Processing: Initial sync, analysis async
  
Implementation:

DocumentProcessorConsumer:
```

```typescript
class DocumentProcessorConsumer {
  async processDocument(event: DocumentDetectedEvent) {
    const fileSize = event.size;
    
    if (fileSize < 5 * 1024 * 1024) { // < 5MB
      // SYNCHRONOUS PROCESSING
      await this.processSynchronously(event);
    } else {
      // ASYNC PROCESSING
      await this.processAsynchronously(event);
    }
  }
  
  private async processSynchronously(event: DocumentDetectedEvent) {
    // 1. Download document
    const blob = await this.downloadDocument(event.externalUrl);
    
    // 2. Store in blob storage
    const blobUrl = await this.storeBlobStorage(blob);
    
    // 3. Extract text
    const text = await this.extractText(blob, event.mimeType);
    
    // 4. Analyze content (LLM)
    const analysis = await this.analyzeContent(text);
    
    // 5. Entity linking
    const links = await this.entityLinkingService.findLinks(analysis, event.tenantId);
    
    // 6. Create complete Document shard
    const shardId = await this.createDocumentShard({
      ...event,
      blobUrl,
      extractedText: text,
      ...analysis,
      processingStatus: 'completed'
    });
    
    // 7. Create relationships
    await this.createRelationships(shardId, links);
    
    // 8. Publish events
    await this.publishDocumentProcessed(shardId);
  }
  
  private async processAsynchronously(event: DocumentDetectedEvent) {
    // 1. Download document
    const blob = await this.downloadDocument(event.externalUrl);
    
    // 2. Store in blob storage
    const blobUrl = await this.storeBlobStorage(blob);
    
    // 3. Create PARTIAL Document shard (no text/analysis yet)
    const shardId = await this.createDocumentShard({
      ...event,
      blobUrl,
      processingStatus: 'pending',
      extractedText: null,
      summary: null
    });
    
    // 4. Publish document.processing_required event
    await this.eventPublisher.publish('document.processing_required', {
      documentShardId: shardId,
      blobUrl,
      mimeType: event.mimeType,
      tenantId: event.tenantId
    });
    
    // Separate consumer (DocumentAnalysisConsumer) will:
    // - Extract text from blob
    // - Analyze content
    // - Update shard
    // - Do entity linking
    // - Publish document.processed
  }
}
```

**Benefits:**
- ✅ Fast user experience for typical documents (< 5MB)
- ✅ System stays responsive for large documents
- ✅ Can scale analysis processing separately
- ✅ User sees document immediately (even if analysis pending)

**DocumentAnalysisConsumer (for large documents):**
```typescript
class DocumentAnalysisConsumer {
  // Listens to: document.processing_required
  
  async processDocument(event: DocumentProcessingRequiredEvent) {
    const shardId = event.documentShardId;
    
    try {
      // 1. Download from blob
      const blob = await this.downloadFromBlob(event.blobUrl);
      
      // 2. Extract text
      const text = await this.extractText(blob, event.mimeType);
      
      // 3. Analyze content
      const analysis = await this.analyzeContent(text);
      
      // 4. Entity linking
      const links = await this.entityLinkingService.findLinks(analysis, event.tenantId);
      
      // 5. Update shard
      await this.shardManager.updateShard(shardId, {
        'structuredData.extractedText': text,
        'structuredData.summary': analysis.summary,
        'structuredData.keyTopics': analysis.topics,
        'structuredData.processingStatus': 'completed'
      });
      
      // 6. Create relationships
      await this.createRelationships(shardId, links);
      
      // 7. Publish completion
      await this.eventPublisher.publish('document.processed', {
        documentShardId: shardId,
        tenantId: event.tenantId
      });
      
    } catch (error) {
      // Update shard with error status
      await this.shardManager.updateShard(shardId, {
        'structuredData.processingStatus': 'failed',
        'structuredData.processingError': error.message
      });
    }
  }
}
```

---

## Section 3: Entity Linking

### Question 3.1: Entity Linking Timing

**ANSWER: Option C - Hybrid (Fast During Creation, Deep Linking Async)**

**Recommendation:**
```yaml
Entity Linking Strategy:

DURING SHARD CREATION (Fast Linking):
  Strategies Applied:
  - Strategy 1: Explicit Reference (100% confidence)
    Example: Email subject contains "RE: Opportunity-12345"
  - Strategy 2: Participant Matching (80-90% confidence)
    Example: Email from contact linked to opportunity
  
  Latency Impact: +100-300ms per shard
  
  Implementation:
  - Simple database queries
  - No LLM calls
  - No vector similarity
  - Create high-confidence relationships immediately

AFTER SHARD CREATION (Deep Linking - Async):
  Strategies Applied:
  - Strategy 3: Content Analysis (60-80% confidence)
    Example: LLM extracts company name, matches to account
  - Strategy 4: Temporal Correlation (40-60% confidence)
    Example: Meeting near opportunity close date
  - Strategy 5: Vector Similarity (30-50% confidence)
    Example: Document semantically similar to opportunity
  
  Latency: 1-5 seconds after shard creation
  
  Implementation:
  - LLM-based content analysis
  - Vector similarity search
  - Complex temporal queries
  - Create medium-confidence relationships
  - Update existing relationships

Consumer: EntityLinkingConsumer (NEW)
  Listens to: shard.created (Document, Email, Message, Meeting)
  Processes: Deep entity linking
  Updates: Adds new relationships, updates confidence scores
```

**EntityLinkingService Interface:**
```typescript
interface EntityLinkingService {
  // Fast linking (during shard creation)
  fastLink(
    shard: Shard,
    tenantId: string
  ): Promise<EntityLinks>; // 100-300ms
  
  // Deep linking (async after shard creation)
  deepLink(
    shard: Shard,
    tenantId: string
  ): Promise<EntityLinks>; // 1-5 seconds
}

class EntityLinkingService {
  async fastLink(shard: Shard, tenantId: string): Promise<EntityLinks> {
    const links: EntityLinks = {
      opportunities: [],
      accounts: [],
      contacts: []
    };
    
    // Strategy 1: Explicit Reference
    const explicitLinks = await this.findExplicitReferences(shard, tenantId);
    links.opportunities.push(...explicitLinks.opportunities);
    
    // Strategy 2: Participant Matching (only for Email/Meeting)
    if (shard.shardType === 'Email' || shard.shardType === 'Meeting') {
      const participantLinks = await this.matchParticipants(shard, tenantId);
      links.opportunities.push(...participantLinks.opportunities);
      links.contacts.push(...participantLinks.contacts);
    }
    
    return links;
  }
  
  async deepLink(shard: Shard, tenantId: string): Promise<EntityLinks> {
    const links: EntityLinks = {
      opportunities: [],
      accounts: [],
      contacts: []
    };
    
    // Strategy 3: Content Analysis (LLM)
    const contentLinks = await this.analyzeContent(shard, tenantId);
    links.opportunities.push(...contentLinks.opportunities);
    links.accounts.push(...contentLinks.accounts);
    
    // Strategy 4: Temporal Correlation
    const temporalLinks = await this.findTemporalCorrelations(shard, tenantId);
    links.opportunities.push(...temporalLinks.opportunities);
    
    // Strategy 5: Vector Similarity
    const similarityLinks = await this.findSimilarEntities(shard, tenantId);
    links.opportunities.push(...similarityLinks.opportunities);
    
    return links;
  }
}
```

**EntityLinkingConsumer:**
```typescript
class EntityLinkingConsumer {
  // Listens to: shard.created (filter: Document, Email, Message, Meeting)
  
  async processShardCreated(event: ShardCreatedEvent) {
    const shard = await this.shardManager.getShard(event.shardId);
    
    // Deep linking
    const deepLinks = await this.entityLinkingService.deepLink(
      shard,
      event.tenantId
    );
    
    // Merge with existing fast links (avoid duplicates)
    const existingLinks = await this.getExistingRelationships(event.shardId);
    const newLinks = this.deduplicateLinks(deepLinks, existingLinks);
    
    // Create new relationships
    for (const link of newLinks.opportunities) {
      if (link.confidence >= 0.6) { // Only create if confidence >= 60%
        await this.createRelationship({
          sourceShardId: event.shardId,
          targetShardId: link.id,
          relationshipType: this.getRelationshipType(shard.shardType),
          metadata: {
            confidence: link.confidence,
            strategy: link.strategy,
            autoLinked: true
          }
        });
      }
    }
    
    // Publish entity.linked event
    await this.eventPublisher.publish('entity.linked', {
      sourceShardId: event.shardId,
      linkedOpportunities: newLinks.opportunities.map(l => l.id),
      tenantId: event.tenantId
    });
  }
}
```

**Benefits:**
- ✅ Fast shard creation (high-confidence links immediately)
- ✅ Comprehensive linking (deep analysis async)
- ✅ Best of both worlds (speed + accuracy)
- ✅ User sees immediate value (fast links)
- ✅ System improves over time (deep links added)

---

### Question 3.2: Entity Linking Confidence Thresholds

**ANSWER: Option A - Conservative (Auto-link > 80%, Suggest 60-80%)**

**Recommendation:**
```yaml
Confidence Threshold Strategy:

AUTO-LINK (Create Relationship Automatically):
  Threshold: confidence >= 80%
  Action: Create shard relationship immediately
  User Experience: Link appears automatically
  Examples:
  - Email from contact@acme.com → linked to Acme opportunity (95%)
  - Document title "Proposal for Project X" → linked to Project X opportunity (85%)
  - Meeting with 3 stakeholders → linked to opportunity (90%)

SUGGEST (Show to User for Review):
  Threshold: 60% <= confidence < 80%
  Action: Store as "suggested link" (not relationship yet)
  User Experience: Show suggestion in UI, user can approve/reject
  Examples:
  - Email mentions "deal" → linked to opportunity (70%)
  - Document contains company name → linked to account (65%)
  - Message in general channel → linked to opportunity (60%)

IGNORE (Don't Create Link):
  Threshold: confidence < 60%
  Action: Log for analysis, don't create relationship or suggestion
  User Experience: No visible link
  Examples:
  - Document vaguely similar to opportunity (40%)
  - Email with common words (30%)

Why Conservative Approach:
  - ✅ Fewer false positives (better user trust)
  - ✅ Users annoyed by wrong links more than missing links
  - ✅ Can adjust thresholds based on feedback
  - ✅ Start strict, loosen later (easier than reverse)
  
  - ❌ May miss some valid links initially
  - ✅ BUT: Deep linking will find them eventually
  - ✅ AND: Users can manually link if needed
```

**Implementation:**
```typescript
enum LinkAction {
  AUTO_LINK = 'auto_link',    // >= 80%
  SUGGEST = 'suggest',         // 60-80%
  IGNORE = 'ignore'            // < 60%
}

class EntityLinkingService {
  private readonly AUTO_LINK_THRESHOLD = 0.80;
  private readonly SUGGEST_THRESHOLD = 0.60;
  
  determineLinkAction(confidence: number): LinkAction {
    if (confidence >= this.AUTO_LINK_THRESHOLD) {
      return LinkAction.AUTO_LINK;
    } else if (confidence >= this.SUGGEST_THRESHOLD) {
      return LinkAction.SUGGEST;
    } else {
      return LinkAction.IGNORE;
    }
  }
  
  async processLinks(
    sourceShardId: string,
    links: EntityLink[],
    tenantId: string
  ) {
    for (const link of links) {
      const action = this.determineLinkAction(link.confidence);
      
      switch (action) {
        case LinkAction.AUTO_LINK:
          // Create relationship immediately
          await this.createRelationship(sourceShardId, link.targetId, {
            confidence: link.confidence,
            strategy: link.strategy,
            autoLinked: true
          });
          break;
          
        case LinkAction.SUGGEST:
          // Store as suggested link (for UI review)
          await this.createSuggestedLink(sourceShardId, link.targetId, {
            confidence: link.confidence,
            strategy: link.strategy,
            status: 'pending_review'
          });
          break;
          
        case LinkAction.IGNORE:
          // Log for analysis
          this.logger.debug('Link ignored due to low confidence', {
            sourceShardId,
            targetId: link.targetId,
            confidence: link.confidence
          });
          break;
      }
    }
  }
}
```

**Suggested Links Table (Cosmos DB):**
```typescript
interface SuggestedLink {
  id: string;
  tenantId: string;
  sourceShardId: string;
  sourceShardType: string;
  targetShardId: string;
  targetShardType: string;
  confidence: number;
  strategy: string;
  status: 'pending_review' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
}
```

**User Review API:**
```typescript
// User approves suggested link
POST /api/v1/suggested-links/:id/approve
→ Creates actual shard relationship
→ Updates suggested link status to 'approved'
→ Learns from approval (future ML improvement)

// User rejects suggested link
POST /api/v1/suggested-links/:id/reject
→ Updates suggested link status to 'rejected'
→ Learns from rejection (future ML improvement)
```

---

### Question 3.3: Entity Linking Triggers Opportunity Events

**ANSWER: Option B - Only Trigger on High-Confidence Links**

**Recommendation:**
```yaml
Opportunity Event Triggering Strategy:

TRIGGER opportunity.updated WHEN:
  - New high-confidence link added (confidence >= 80%)
  - New Document linked (documentCount increases)
  - New Email linked (emailCount increases)
  - New Meeting linked (meetingCount increases)
  - ML field changes (counts update)

DON'T TRIGGER WHEN:
  - Low/medium confidence link added (confidence < 80%)
  - Suggested link created (not yet approved)
  - User rejects suggested link

Why:
  - ✅ Risk scoring benefits from high-confidence new information
  - ✅ Avoids excessive risk recalculation
  - ✅ Reduces event volume and compute cost
  - ❌ May miss some edge cases (acceptable trade-off)

Implementation:
```

```typescript
class EntityLinkingConsumer {
  async processShardCreated(event: ShardCreatedEvent) {
    const shard = await this.shardManager.getShard(event.shardId);
    const deepLinks = await this.entityLinkingService.deepLink(shard, event.tenantId);
    
    // Track high-confidence links created
    const highConfidenceOpportunities = new Set<string>();
    
    for (const link of deepLinks.opportunities) {
      const action = this.entityLinkingService.determineLinkAction(link.confidence);
      
      if (action === LinkAction.AUTO_LINK) {
        // Create relationship
        await this.createRelationship(
          event.shardId,
          link.id,
          { confidence: link.confidence, strategy: link.strategy }
        );
        
        // Track for event triggering
        highConfidenceOpportunities.add(link.id);
      }
    }
    
    // Trigger opportunity.updated for each linked opportunity
    for (const opportunityId of highConfidenceOpportunities) {
      // Get current opportunity to check if ML fields need update
      const opportunity = await this.shardManager.getShard(opportunityId);
      
      // Update ML field count
      const fieldToUpdate = this.getMLFieldForShardType(shard.shardType);
      if (fieldToUpdate) {
        const currentCount = opportunity.structuredData[fieldToUpdate] || 0;
        await this.shardManager.updateShard(opportunityId, {
          [`structuredData.${fieldToUpdate}`]: currentCount + 1
        });
      }
      
      // Publish opportunity.updated event
      await this.eventPublisher.publish('integration.opportunity.ml_fields_updated', {
        opportunityId,
        tenantId: event.tenantId,
        trigger: 'entity_linking',
        linkedShardId: event.shardId,
        linkedShardType: shard.shardType,
        confidence: link.confidence
      });
    }
  }
  
  private getMLFieldForShardType(shardType: string): string | null {
    switch (shardType) {
      case 'Document': return 'documentCount';
      case 'Email': return 'emailCount';
      case 'Meeting': return 'meetingCount';
      default: return null;
    }
  }
}
```

**Event Flow:**
```
1. Email shard created → fast link to Opportunity A (95% confidence)
2. EntityLinkingConsumer creates relationship
3. Updates Opportunity A: emailCount++
4. Publishes integration.opportunity.ml_fields_updated
5. RiskAnalyticsConsumer recalculates risk with new email count
6. ForecastingConsumer recalculates forecast
7. RecommendationsConsumer updates recommendations
```

**Cost Control:**
```yaml
To Avoid Event Storms:

Debouncing Strategy:
  - Group multiple entity links within 5-second window
  - Publish single opportunity.updated per opportunity
  - Include all linked shards in metadata
  
Example:
  - T+0s: Document linked to Opp-1
  - T+2s: Email linked to Opp-1
  - T+4s: Meeting linked to Opp-1
  → T+5s: Single event with all 3 links
  
Implementation:
  - Use Redis for temporary buffering
  - Flush buffer every 5 seconds
  - Or flush immediately if buffer reaches limit (e.g., 10 links)
```

---

## Section 4: Field Mapping

### Question 4.1: Field Mapping Application

**ANSWER: Option A - Applied in Mapping Consumer**

**Recommendation:**
```yaml
Field Mapping Architecture:

WHERE: Mapping Consumers (CRMDataMappingConsumer, DocumentProcessorConsumer, etc.)
WHEN: After receiving raw event, before creating shard

Flow:
1. IntegrationSyncService fetches raw data from integration
2. IntegrationSyncService publishes raw event (no transformation)
3. Mapping Consumer receives raw event
4. Mapping Consumer applies field mappings → structuredData
5. Mapping Consumer creates shard via shard-manager
6. Mapping Consumer publishes shard.created event

Why in Mapping Consumer:
  ✅ IntegrationSyncService stays simple (just fetch + publish)
  ✅ Field mapping logic centralized in consumers
  ✅ Easy to test field mapping in isolation
  ✅ Can retry field mapping without re-fetching from integration
  ✅ Different consumers can have different mapping logic
  ✅ Mapping errors don't affect integration sync

Why NOT in IntegrationSyncService:
  ❌ Coupling integration fetch with transformation
  ❌ Harder to retry mapping failures
  ❌ IntegrationSyncService becomes complex
  ❌ Less flexible for multi-modal data
```

**Implementation:**
```typescript
// IntegrationSyncService (SIMPLE - Just fetch and publish)
class IntegrationSyncService {
  async executeSyncTask(syncTask: SyncTask) {
    // 1. Fetch data from integration
    const rawData = await this.integrationAdapter.fetchRecords(
      syncTask.entityType,
      syncTask.options
    );
    
    // 2. Determine data type and queue
    const { queue, eventType } = this.determineQueueAndEvent(syncTask.entityType);
    
    // 3. Publish raw events (NO TRANSFORMATION)
    for (const record of rawData) {
      await this.eventPublisher.publish(eventType, {
        integrationId: syncTask.integrationId,
        tenantId: syncTask.tenantId,
        entityType: syncTask.entityType,
        rawData: record,  // Raw data from integration
        externalId: record.id,
        syncTaskId: syncTask.id,
        metadata: {
          source: 'salesforce',
          syncedAt: new Date()
        }
      }, { queue });
    }
  }
}

// CRMDataMappingConsumer (COMPLEX - Transformation logic)
class CRMDataMappingConsumer {
  async processRawData(event: IntegrationDataRawEvent) {
    // 1. Get integration config (has field mappings)
    const integration = await this.getIntegrationConfig(
      event.integrationId,
      event.tenantId
    );
    
    // 2. Get entity mapping for this entity type
    const entityMapping = integration.syncConfig.entityMappings.find(
      m => m.externalEntityName === event.entityType
    );
    
    if (!entityMapping) {
      throw new Error(`No entity mapping for ${event.entityType}`);
    }
    
    // 3. Apply field mappings
    const structuredData = await this.fieldMapper.mapFields(
      event.rawData,
      entityMapping.fieldMappings
    );
    
    // 4. Calculate ML fields (for Opportunity)
    if (entityMapping.shardTypeId === 'opportunity') {
      structuredData.daysInStage = this.calculateDaysInStage(structuredData);
      structuredData.daysSinceLastActivity = this.calculateDaysSince(structuredData.lastActivityDate);
      // ... other ML fields
    }
    
    // 5. Create shard
    const shardId = await this.shardManager.createShard({
      tenantId: event.tenantId,
      shardTypeId: entityMapping.shardTypeId,
      shardTypeName: entityMapping.shardTypeName,
      structuredData: structuredData,
      metadata: {
        integrationId: event.integrationId,
        externalId: event.externalId,
        syncTaskId: event.syncTaskId
      }
    });
    
    // 6. Publish success
    await this.eventPublisher.publish('integration.data.mapped', {
      integrationId: event.integrationId,
      tenantId: event.tenantId,
      shardId: shardId,
      success: true
    });
  }
}
```

**FieldMapperService:**
```typescript
class FieldMapperService {
  async mapFields(
    rawData: any,
    fieldMappings: FieldMapping[]
  ): Promise<Record<string, any>> {
    const structuredData: Record<string, any> = {};
    
    for (const mapping of fieldMappings) {
      try {
        // Extract value from raw data
        let value = this.extractNestedField(rawData, mapping.externalFieldName);
        
        // Apply transformation if specified
        if (mapping.transform) {
          value = await this.applyTransform(value, mapping.transform, mapping.transformOptions);
        }
        
        // Apply default if value is null/undefined
        if (value == null && mapping.defaultValue != null) {
          value = mapping.defaultValue;
        }
        
        // Set in structured data
        structuredData[mapping.internalFieldName] = value;
        
      } catch (error) {
        this.logger.warn('Field mapping failed', {
          field: mapping.internalFieldName,
          error: error.message
        });
        
        // Continue with other fields (partial mapping OK)
      }
    }
    
    return structuredData;
  }
  
  private extractNestedField(data: any, fieldPath: string): any {
    const parts = fieldPath.split('.');
    let value = data;
    
    for (const part of parts) {
      if (value == null) return null;
      value = value[part];
    }
    
    return value;
  }
  
  private async applyTransform(
    value: any,
    transform: string,
    options?: any
  ): Promise<any> {
    switch (transform) {
      case 'dateToISO':
        return value ? new Date(value).toISOString() : null;
      case 'stringToNumber':
        return value ? parseFloat(value) : null;
      case 'booleanToString':
        return value ? 'true' : 'false';
      case 'arrayToString':
        return Array.isArray(value) ? value.join(', ') : value;
      case 'nullToDefault':
        return value ?? options?.default ?? null;
      default:
        // Custom transformer
        const transformer = this.transformers.get(transform);
        if (transformer) {
          return await transformer(value, options);
        }
        return value;
    }
  }
}
```

---

### Question 4.2: Shard Type Mapping

**ANSWER: Option B - Use entityMappings.shardTypeId**

**Recommendation:**
```yaml
Shard Type Determination:

SOURCE: integration.syncConfig.entityMappings[].shardTypeId

Why:
  ✅ Per-integration flexibility
  ✅ Same external entity can map to different shard types per integration
  ✅ Example: Salesforce "Opportunity" → "Opportunity" shard
              HubSpot "Deal" → "Opportunity" shard
  ✅ Integration-specific customization
  ✅ No need for global catalog mappings

catalog.shardMappings (NOT USED):
  - Can be used as default/fallback if needed
  - But entityMappings.shardTypeId takes precedence

Configuration Example:
```

```typescript
// Integration config
{
  id: "salesforce-integration",
  catalog: {
    id: "salesforce",
    name: "Salesforce",
    // Catalog shardMappings exist but not used
    shardMappings: {
      "Opportunity": "opportunity",
      "Account": "account"
    }
  },
  syncConfig: {
    entityMappings: [
      {
        externalEntityName: "Opportunity",
        shardTypeId: "opportunity",           // ← USE THIS
        shardTypeName: "Opportunity",         // ← USE THIS
        fieldMappings: [
          {
            externalFieldName: "Name",
            internalFieldName: "name"
          },
          // ...
        ]
      },
      {
        externalEntityName: "Account",
        shardTypeId: "account",               // ← USE THIS
        shardTypeName: "Account",             // ← USE THIS
        fieldMappings: [ /* ... */ ]
      }
    ]
  }
}
```

**Implementation:**
```typescript
class CRMDataMappingConsumer {
  async processRawData(event: IntegrationDataRawEvent) {
    // Get integration config
    const integration = await this.getIntegrationConfig(
      event.integrationId,
      event.tenantId
    );
    
    // Find entity mapping
    const entityMapping = integration.syncConfig.entityMappings.find(
      m => m.externalEntityName === event.entityType
    );
    
    if (!entityMapping) {
      throw new Error(`No entity mapping found for ${event.entityType}`);
    }
    
    // Use shardTypeId from entity mapping
    const shardTypeId = entityMapping.shardTypeId;        // ← From entityMappings
    const shardTypeName = entityMapping.shardTypeName;    // ← From entityMappings
    
    // Apply field mappings
    const structuredData = await this.fieldMapper.mapFields(
      event.rawData,
      entityMapping.fieldMappings
    );
    
    // Create shard
    await this.shardManager.createShard({
      tenantId: event.tenantId,
      shardTypeId: shardTypeId,           // ← Use from entityMappings
      shardTypeName: shardTypeName,       // ← Use from entityMappings
      structuredData: structuredData
    });
  }
}
```

---

### Question 4.3: ML Field Population Strategy

**ANSWER: Already answered in Question 1.1 - Hybrid Approach**

See Question 1.1 for complete answer.

**Summary:**
- Simple ML fields (daysInStage, daysSinceLastActivity, dealVelocity): **During mapping**
- Relationship counts (documentCount, emailCount, meetingCount): **Async after shard creation**
- ML field updates trigger opportunity.updated event for risk recalculation

---

## Continuing with remaining sections in next response...

(Due to length, I'll continue with Sections 5-8 in the next file)
