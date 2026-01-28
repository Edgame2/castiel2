# Additional Integration Questions - Answers

**Date:** January 28, 2025  
**Based On:** Enterprise best practices + Existing architecture patterns

---

## High Priority Questions

### Question 1: Consumer Deployment Architecture

**ANSWER: Option B - Same Container App with Different Consumer Types**

**Recommendation:**
```yaml
Deployment Strategy: Single Container Image, Multiple Deployments

Why Same Container:
✅ Single codebase to maintain
✅ Single Docker image to build
✅ Easier version management
✅ Shared dependencies
✅ Consistent logging/monitoring
✅ Simpler CI/CD pipeline

Why Different Deployments:
✅ Independent scaling per workload
✅ Different resource allocations
✅ Better cost optimization
✅ Clear separation of concerns
✅ Easy to monitor per workload type

Implementation:
```

**Container Structure:**
```typescript
// Single application entry point
// File: src/index.ts

async function main() {
  const consumerType = process.env.CONSUMER_TYPE || 'all';
  
  switch (consumerType) {
    case 'light':
      // Start light processors only
      await startLightProcessors();
      break;
      
    case 'heavy':
      // Start heavy processors only
      await startHeavyProcessors();
      break;
      
    case 'all':
      // Start all processors (for development)
      await startAllProcessors();
      break;
      
    default:
      throw new Error(`Unknown consumer type: ${consumerType}`);
  }
}

async function startLightProcessors() {
  const processors = [
    new CRMDataMappingConsumer(),
    new EmailProcessorConsumer(),
    new MessageProcessorConsumer(),
    new EventProcessorConsumer()
  ];
  
  await Promise.all(processors.map(p => p.start()));
}

async function startHeavyProcessors() {
  const processors = [
    new DocumentProcessorConsumer(),
    new MeetingProcessorConsumer()
  ];
  
  await Promise.all(processors.map(p => p.start()));
}
```

**Azure Container Apps Configuration:**
```yaml
# Light Processors
apiVersion: apps/v1
kind: Deployment
metadata:
  name: integration-processors-light
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: processor
        image: castiel/integration-processors:latest  # Same image
        env:
        - name: CONSUMER_TYPE
          value: "light"  # Different config
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 1000m
            memory: 2Gi

---
# Heavy Processors
apiVersion: apps/v1
kind: Deployment
metadata:
  name: integration-processors-heavy
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: processor
        image: castiel/integration-processors:latest  # Same image
        env:
        - name: CONSUMER_TYPE
          value: "heavy"  # Different config
        resources:
          requests:
            cpu: 2000m
            memory: 4Gi
          limits:
            cpu: 4000m
            memory: 8Gi
```

**Dockerfile (Single Image):**
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY dist/ ./dist/

# Entry point
CMD ["node", "dist/index.js"]
```

**Benefits:**
- ✅ One Docker image for all deployments
- ✅ Environment variable controls which consumers run
- ✅ Easy to add new consumer types (just add new CONSUMER_TYPE value)
- ✅ Shared monitoring/logging configuration
- ✅ Consistent error handling across all consumers

---

### Question 3: Entity Linking Service Location

**ANSWER: Option A - Part of integration-sync service (Shared Library)**

**Recommendation:**
```yaml
Location: Shared Service Library (packages/shared/src/services/EntityLinkingService)

Why Shared Library:
✅ All processors can use same service
✅ No network calls (in-process)
✅ Consistent linking logic
✅ Easy to unit test
✅ No additional deployment/infrastructure

Why NOT Separate Service:
❌ Adds latency (network calls)
❌ Additional point of failure
❌ More complex deployment
❌ Overkill for current scale

Implementation:
```

**Package Structure:**
```
packages/
├── shared/
│   └── src/
│       ├── services/
│       │   ├── EntityLinkingService.ts       ← HERE
│       │   ├── ShardManagerClient.ts
│       │   └── EventPublisher.ts
│       └── types/
│           └── EntityLinks.ts
└── integration-processors/
    └── src/
        ├── consumers/
        │   ├── DocumentProcessorConsumer.ts   (uses EntityLinkingService)
        │   ├── EmailProcessorConsumer.ts      (uses EntityLinkingService)
        │   └── MeetingProcessorConsumer.ts    (uses EntityLinkingService)
        └── index.ts
```

**Usage in Consumers:**
```typescript
// packages/integration-processors/src/consumers/DocumentProcessorConsumer.ts

import { EntityLinkingService } from '@castiel/shared';

class DocumentProcessorConsumer {
  private entityLinkingService: EntityLinkingService;
  
  constructor() {
    // In-process service, no network calls
    this.entityLinkingService = new EntityLinkingService({
      shardManager: this.shardManager,
      vectorSearch: this.vectorSearch,
      llmClient: this.llmClient
    });
  }
  
  async processDocument(event: DocumentDetectedEvent) {
    // ... document processing ...
    
    // Fast linking (in-process)
    const fastLinks = await this.entityLinkingService.fastLink(
      documentShard,
      event.tenantId
    );
    
    // Create relationships
    await this.createRelationships(documentShard.id, fastLinks);
  }
}
```

**EntityLinkingService (Shared Library):**
```typescript
// packages/shared/src/services/EntityLinkingService.ts

export class EntityLinkingService {
  constructor(private deps: EntityLinkingDependencies) {}
  
  async fastLink(shard: Shard, tenantId: string): Promise<EntityLinks> {
    // Strategy 1: Explicit references
    const explicitLinks = await this.findExplicitReferences(shard, tenantId);
    
    // Strategy 2: Participant matching
    const participantLinks = await this.matchParticipants(shard, tenantId);
    
    return this.mergeLinks([explicitLinks, participantLinks]);
  }
  
  async deepLink(shard: Shard, tenantId: string): Promise<EntityLinks> {
    // Strategy 3: Content analysis (LLM)
    const contentLinks = await this.analyzeContent(shard, tenantId);
    
    // Strategy 4: Temporal correlation
    const temporalLinks = await this.findTemporalCorrelations(shard, tenantId);
    
    // Strategy 5: Vector similarity
    const similarityLinks = await this.findSimilarEntities(shard, tenantId);
    
    return this.mergeLinks([contentLinks, temporalLinks, similarityLinks]);
  }
}
```

**When to Extract to Separate Service (Future):**
- If entity linking becomes CPU-intensive (lots of LLM calls)
- If you need to scale linking independently
- If linking latency > 5 seconds
- If you hit memory constraints

**For Now:** Keep as shared library. Simple, fast, maintainable.

---

### Question 7: Shard Type Creation Process

**ANSWER: Option A - Via Shard-Manager API on Service Startup**

**Recommendation:**
```yaml
Process: ensureShardTypes() Pattern on Service Startup

Why on Startup:
✅ Self-healing (if shard types deleted, they're recreated)
✅ Version control (shard type definitions in code)
✅ No manual steps required
✅ Works in all environments (dev, staging, prod)
✅ Idempotent (safe to run multiple times)

Implementation:
```

**Startup Script:**
```typescript
// packages/integration-processors/src/startup/ensureShardTypes.ts

import { shardTypeDefinitions } from './shardTypeDefinitions';

export async function ensureShardTypes(shardManager: ShardManagerClient): Promise<void> {
  console.log('Ensuring all shard types exist...');
  
  for (const shardTypeDef of shardTypeDefinitions) {
    try {
      // Check if shard type exists
      const existing = await shardManager.getShardType(shardTypeDef.id);
      
      if (existing) {
        // Shard type exists, check if schema changed
        if (existing.schemaVersion !== shardTypeDef.schemaVersion) {
          console.log(`Updating shard type ${shardTypeDef.name} (schema version changed)`);
          await shardManager.updateShardType(shardTypeDef.id, shardTypeDef);
        } else {
          console.log(`Shard type ${shardTypeDef.name} already exists`);
        }
      } else {
        // Shard type doesn't exist, create it
        console.log(`Creating shard type ${shardTypeDef.name}`);
        await shardManager.createShardType(shardTypeDef);
      }
    } catch (error) {
      console.error(`Failed to ensure shard type ${shardTypeDef.name}:`, error);
      throw error; // Fail startup if shard types can't be created
    }
  }
  
  console.log('All shard types ensured');
}
```

**Shard Type Definitions (Version Controlled):**
```typescript
// packages/integration-processors/src/startup/shardTypeDefinitions.ts

export const shardTypeDefinitions: ShardTypeDefinition[] = [
  {
    id: 'document',
    name: 'Document',
    description: 'Documents from Google Drive, SharePoint, etc.',
    category: 'integration',
    schemaVersion: '1.0.0',
    schema: {
      type: 'object',
      required: ['title', 'documentType', 'integrationSource'],
      properties: {
        title: { type: 'string' },
        documentType: { 
          type: 'string',
          enum: ['pdf', 'docx', 'xlsx', 'pptx', 'txt', 'html', 'image', 'other']
        },
        integrationSource: {
          type: 'string',
          enum: ['google_drive', 'sharepoint', 'dropbox', 'onedrive', 'box']
        },
        size: { type: 'number' },
        extractedText: { type: 'string' },
        summary: { type: 'string' },
        keyTopics: { type: 'array', items: { type: 'string' } },
        // ... all other fields
      }
    }
  },
  {
    id: 'email',
    name: 'Email',
    description: 'Emails from Gmail, Outlook',
    category: 'integration',
    schemaVersion: '1.0.0',
    schema: {
      type: 'object',
      required: ['subject', 'from', 'integrationSource'],
      properties: {
        subject: { type: 'string' },
        from: {
          type: 'object',
          properties: {
            email: { type: 'string' },
            name: { type: 'string' },
            contactId: { type: 'string' }
          }
        },
        // ... all other fields
      }
    }
  },
  // ... all other shard types
];
```

**Main Application Startup:**
```typescript
// packages/integration-processors/src/index.ts

import { ensureShardTypes } from './startup/ensureShardTypes';

async function main() {
  console.log('Starting integration processors...');
  
  // 1. Initialize dependencies
  const shardManager = new ShardManagerClient(config.shardManagerUrl);
  const eventPublisher = new EventPublisher(config.rabbitmq);
  
  // 2. Ensure all shard types exist (BEFORE starting consumers)
  await ensureShardTypes(shardManager);
  
  // 3. Start consumers
  const consumerType = process.env.CONSUMER_TYPE || 'all';
  await startConsumers(consumerType);
  
  console.log('Integration processors started');
}

main().catch(error => {
  console.error('Failed to start:', error);
  process.exit(1);
});
```

**Benefits:**
- ✅ Shard types always in sync with code
- ✅ No manual steps in deployment
- ✅ Version controlled (in git)
- ✅ Automatic schema migrations
- ✅ Self-healing

**Schema Version Updates:**
```typescript
// When you update a shard type schema:
// 1. Increment schemaVersion in definition
// 2. Add new optional fields
// 3. Deploy - service will automatically update shard type
// 4. No manual migration needed

// Example: Adding new field to Document shard type
{
  id: 'document',
  name: 'Document',
  schemaVersion: '1.1.0',  // Incremented from 1.0.0
  schema: {
    properties: {
      // ... existing fields ...
      
      // NEW FIELD
      containsTable: { type: 'boolean' }  // NEW
    }
  }
}
```

---

## Medium Priority Questions

### Question 2: ML Field Calculation for Existing Opportunities

**ANSWER: Option B - Only Publish if Counts Changed Significantly**

**Recommendation:**
```yaml
Strategy: Smart Recalculation with Change Detection

SCENARIOS:

Scenario 1: New Opportunity Created
- MLFieldAggregationConsumer calculates counts
- Always publish integration.opportunity.ml_fields_updated
- Reason: First calculation, risk scoring needs it

Scenario 2: New Document Linked to Existing Opportunity
- DocumentProcessor creates relationship
- EntityLinkingConsumer updates documentCount
- Publish if count changed (always true for new link)
- Triggers risk recalculation

Scenario 3: Periodic Recalculation (Background Job)
- Every 24 hours, recalculate all ML fields for active opportunities
- Only publish if counts changed by >= 10%
- Reason: Avoid unnecessary risk recalculation

Why 10% Threshold:
- Small changes (1-2 documents) rarely affect risk score significantly
- Reduces event volume by ~80%
- Risk scoring still stays reasonably current
- Can adjust threshold based on feedback

Implementation:
```

**MLFieldAggregationConsumer (Smart Publishing):**
```typescript
class MLFieldAggregationConsumer {
  async processOpportunityShard(event: ShardCreatedEvent) {
    const opportunityId = event.shardId;
    
    // Get current shard
    const opportunity = await this.shardManager.getShard(opportunityId);
    
    // Calculate new counts
    const newCounts = await this.calculateRelationshipCounts(opportunityId);
    
    // Get old counts
    const oldCounts = {
      documentCount: opportunity.structuredData.documentCount || 0,
      emailCount: opportunity.structuredData.emailCount || 0,
      meetingCount: opportunity.structuredData.meetingCount || 0,
      callCount: opportunity.structuredData.callCount || 0
    };
    
    // Check if significant change
    const hasSignificantChange = this.hasSignificantChange(oldCounts, newCounts);
    
    // Always update shard (even if no significant change)
    await this.shardManager.updateShard(opportunityId, {
      'structuredData.documentCount': newCounts.documentCount,
      'structuredData.emailCount': newCounts.emailCount,
      'structuredData.meetingCount': newCounts.meetingCount,
      'structuredData.callCount': newCounts.callCount
    });
    
    // Only publish event if significant change
    if (hasSignificantChange || event.reason === 'new_opportunity') {
      await this.eventPublisher.publish('integration.opportunity.ml_fields_updated', {
        opportunityId,
        tenantId: event.tenantId,
        oldCounts,
        newCounts,
        reason: event.reason || 'recalculation'
      });
      
      this.logger.info('Published ML fields update', {
        opportunityId,
        hasSignificantChange
      });
    } else {
      this.logger.debug('Skipped event - no significant change', {
        opportunityId,
        oldCounts,
        newCounts
      });
    }
  }
  
  private hasSignificantChange(
    oldCounts: RelationshipCounts,
    newCounts: RelationshipCounts
  ): boolean {
    const THRESHOLD = 0.10; // 10% change
    
    for (const key of Object.keys(newCounts)) {
      const oldValue = oldCounts[key] || 0;
      const newValue = newCounts[key] || 0;
      
      // If count is small, any change is significant
      if (oldValue < 10) {
        if (oldValue !== newValue) {
          return true;
        }
      } else {
        // For larger counts, check percentage change
        const percentChange = Math.abs(newValue - oldValue) / oldValue;
        if (percentChange >= THRESHOLD) {
          return true;
        }
      }
    }
    
    return false;
  }
}
```

**Periodic Recalculation (Background Job):**
```typescript
// Run every 24 hours
async function recalculateMLFieldsForActiveOpportunities() {
  // Get active opportunities (closeDate in future)
  const opportunities = await shardRepository.query({
    shardType: 'Opportunity',
    'structuredData.closeDate': { $gte: new Date() }
  });
  
  console.log(`Recalculating ML fields for ${opportunities.length} opportunities`);
  
  for (const opp of opportunities) {
    // Trigger recalculation
    await eventPublisher.publish('ml_field_aggregation.recalculate', {
      opportunityId: opp.id,
      tenantId: opp.tenantId,
      reason: 'periodic_recalculation'
    });
  }
}
```

---

### Question 4: Suggested Links Storage

**ANSWER: Option A - Cosmos DB Container `suggested_links`**

**Recommendation:**
```yaml
Storage: Separate Cosmos DB Container

Why Separate Container:
✅ Clear separation: Auto-links vs Suggested links
✅ Different queries (suggested links need filtering by status)
✅ Different TTL (suggested links can expire, relationships don't)
✅ Easier to manage user review workflow
✅ Simpler to query "pending review" links

Container Schema:
```

**Cosmos DB Container Configuration:**
```typescript
// Container: suggested_links
// Partition Key: /tenantId

interface SuggestedLink {
  id: string;                    // UUID
  tenantId: string;              // Partition key
  sourceShardId: string;
  sourceShardType: string;       // "Document", "Email", "Meeting", etc.
  targetShardId: string;
  targetShardType: string;       // "Opportunity", "Account", etc.
  confidence: number;            // 0.60 - 0.79 (suggested range)
  strategy: string;              // "content_analysis", "temporal_correlation", etc.
  linkingReason: string;         // Human-readable explanation
  status: 'pending_review' | 'approved' | 'rejected' | 'expired';
  
  // Review metadata
  reviewedBy?: string;           // User ID who reviewed
  reviewedAt?: Date;
  
  // Timestamps
  createdAt: Date;
  expiresAt: Date;               // TTL: 30 days
  
  // For Cosmos DB TTL
  ttl?: number;                  // Seconds until expiration
}
```

**Creating Suggested Links:**
```typescript
class EntityLinkingService {
  async processLinks(
    sourceShardId: string,
    links: EntityLink[],
    tenantId: string
  ) {
    for (const link of links) {
      const action = this.determineLinkAction(link.confidence);
      
      if (action === LinkAction.SUGGEST) {
        // Create suggested link
        await this.createSuggestedLink({
          id: uuidv4(),
          tenantId: tenantId,
          sourceShardId: sourceShardId,
          sourceShardType: link.sourceShardType,
          targetShardId: link.targetId,
          targetShardType: link.targetShardType,
          confidence: link.confidence,
          strategy: link.strategy,
          linkingReason: this.generateReason(link),
          status: 'pending_review',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          ttl: 30 * 24 * 60 * 60 // 30 days in seconds
        });
      }
    }
  }
  
  private async createSuggestedLink(link: SuggestedLink): Promise<void> {
    await cosmosDb.container('suggested_links').items.create(link);
    
    // Optionally publish event for UI notification
    await eventPublisher.publish('entity.link.suggested', {
      suggestedLinkId: link.id,
      sourceShardId: link.sourceShardId,
      targetShardId: link.targetShardId,
      tenantId: link.tenantId
    });
  }
}
```

**User Review API:**
```typescript
// GET /api/v1/suggested-links?status=pending_review&tenantId=xxx
// Returns: List of pending suggested links

// POST /api/v1/suggested-links/:id/approve
async function approveSuggestedLink(suggestedLinkId: string, userId: string) {
  // 1. Get suggested link
  const link = await cosmosDb.container('suggested_links')
    .item(suggestedLinkId, tenantId)
    .read();
  
  // 2. Create actual shard relationship
  await shardRelationshipService.createRelationship({
    sourceShardId: link.resource.sourceShardId,
    targetShardId: link.resource.targetShardId,
    relationshipType: 'document_for_opportunity', // or appropriate type
    metadata: {
      confidence: link.resource.confidence,
      strategy: link.resource.strategy,
      approvedBy: userId,
      approvedAt: new Date()
    }
  });
  
  // 3. Update suggested link status
  await cosmosDb.container('suggested_links')
    .item(suggestedLinkId, tenantId)
    .patch([
      { op: 'replace', path: '/status', value: 'approved' },
      { op: 'set', path: '/reviewedBy', value: userId },
      { op: 'set', path: '/reviewedAt', value: new Date() }
    ]);
  
  // 4. Update ML fields (if opportunity link)
  if (link.resource.targetShardType === 'Opportunity') {
    // Trigger ML field recalculation
    await eventPublisher.publish('ml_field_aggregation.recalculate', {
      opportunityId: link.resource.targetShardId,
      tenantId: link.resource.tenantId,
      reason: 'suggested_link_approved'
    });
  }
}

// POST /api/v1/suggested-links/:id/reject
async function rejectSuggestedLink(suggestedLinkId: string, userId: string) {
  // Update status to rejected
  await cosmosDb.container('suggested_links')
    .item(suggestedLinkId, tenantId)
    .patch([
      { op: 'replace', path: '/status', value: 'rejected' },
      { op: 'set', path: '/reviewedBy', value: userId },
      { op: 'set', path: '/reviewedAt', value: new Date() }
    ]);
  
  // Optionally: Learn from rejection (future ML improvement)
  await this.recordRejectionForLearning(suggestedLinkId);
}
```

**Queries:**
```typescript
// Get pending suggested links for a tenant
const pendingLinks = await cosmosDb.container('suggested_links')
  .items.query({
    query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.status = @status',
    parameters: [
      { name: '@tenantId', value: tenantId },
      { name: '@status', value: 'pending_review' }
    ]
  })
  .fetchAll();

// Get suggested links for a specific shard
const suggestedLinksForShard = await cosmosDb.container('suggested_links')
  .items.query({
    query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.sourceShardId = @shardId AND c.status = @status',
    parameters: [
      { name: '@tenantId', value: tenantId },
      { name: '@shardId', value: shardId },
      { name: '@status', value: 'pending_review' }
    ]
  })
  .fetchAll();
```

**TTL Auto-Expiration:**
```typescript
// Cosmos DB automatically deletes documents when ttl expires
// No manual cleanup needed
// Expired links (status = 'expired') are automatically removed after 30 days
```

---

### Question 6: Entity Linking Debouncing Implementation

**ANSWER: Option B - In-Memory Map (Simpler, Sufficient for Current Scale)**

**Recommendation:**
```yaml
Implementation: In-Memory Map Per Consumer Instance

Why In-Memory:
✅ Simplest implementation
✅ No external dependencies
✅ Fast (no network calls)
✅ Sufficient for current scale
✅ Stateless (no Redis required)

Why NOT Redis:
❌ Adds external dependency
❌ Adds network latency
❌ Overkill for 5-second debouncing
❌ More complexity

When to Use Redis:
- If you need debouncing across multiple consumer instances
- If debounce window > 30 seconds
- If you need persistence across restarts

Implementation:
```

**Debouncing Service (In-Memory):**
```typescript
class OpportunityEventDebouncer {
  private pendingEvents: Map<string, OpportunityEvent[]> = new Map();
  private flushTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly DEBOUNCE_WINDOW_MS = 5000; // 5 seconds
  
  constructor(private eventPublisher: EventPublisher) {
    // Cleanup on shutdown
    process.on('SIGTERM', () => this.flushAll());
  }
  
  async addEvent(opportunityId: string, event: OpportunityEvent): Promise<void> {
    // Get existing events for this opportunity
    const events = this.pendingEvents.get(opportunityId) || [];
    events.push(event);
    this.pendingEvents.set(opportunityId, events);
    
    // Cancel existing timer
    const existingTimer = this.flushTimers.get(opportunityId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Set new timer
    const timer = setTimeout(
      () => this.flush(opportunityId),
      this.DEBOUNCE_WINDOW_MS
    );
    this.flushTimers.set(opportunityId, timer);
    
    this.logger.debug('Event debounced', {
      opportunityId,
      eventCount: events.length
    });
  }
  
  private async flush(opportunityId: string): Promise<void> {
    const events = this.pendingEvents.get(opportunityId);
    if (!events || events.length === 0) return;
    
    // Clear from memory
    this.pendingEvents.delete(opportunityId);
    this.flushTimers.delete(opportunityId);
    
    // Merge events
    const mergedEvent = this.mergeEvents(events);
    
    // Publish single event
    await this.eventPublisher.publish(
      'integration.opportunity.ml_fields_updated',
      mergedEvent
    );
    
    this.logger.info('Debounced events flushed', {
      opportunityId,
      eventCount: events.length
    });
  }
  
  private mergeEvents(events: OpportunityEvent[]): OpportunityEvent {
    // Combine all linked shard IDs
    const linkedShards = new Set<string>();
    events.forEach(e => e.linkedShardIds?.forEach(id => linkedShards.add(id)));
    
    // Use first event as base
    return {
      ...events[0],
      linkedShardIds: Array.from(linkedShards),
      eventCount: events.length
    };
  }
  
  private async flushAll(): Promise<void> {
    this.logger.info('Flushing all pending events...');
    
    const opportunityIds = Array.from(this.pendingEvents.keys());
    await Promise.all(
      opportunityIds.map(id => this.flush(id))
    );
    
    this.logger.info('All pending events flushed');
  }
}
```

**Usage in EntityLinkingConsumer:**
```typescript
class EntityLinkingConsumer {
  private debouncer: OpportunityEventDebouncer;
  
  constructor() {
    this.debouncer = new OpportunityEventDebouncer(this.eventPublisher);
  }
  
  async processShardCreated(event: ShardCreatedEvent) {
    // ... entity linking logic ...
    
    // For each linked opportunity, add to debouncer (instead of publishing immediately)
    for (const opportunityId of linkedOpportunities) {
      await this.debouncer.addEvent(opportunityId, {
        opportunityId,
        tenantId: event.tenantId,
        trigger: 'entity_linking',
        linkedShardIds: [event.shardId],
        linkedShardType: event.shardTypeName
      });
    }
  }
}
```

**Benefits:**
- ✅ Simple, no external dependencies
- ✅ Fast, no network latency
- ✅ Automatic flush on shutdown (no lost events)
- ✅ Per-opportunity debouncing
- ✅ Easy to test

**Limitations (Acceptable for Now):**
- ❌ Not distributed (each consumer instance has its own buffer)
- ❌ Lost on crash (events in buffer not persisted)
- ✅ BUT: Events will be replayed from RabbitMQ, so no data loss

**When to Upgrade to Redis (Future):**
- If you need distributed debouncing across 10+ consumer instances
- If debounce window > 30 seconds
- If you want persistence across restarts

---

## Low Priority Questions

### Question 5: Document Processing for Large Files

**ANSWER: Option A - Immediately Visible with processingStatus="pending"**

**Recommendation:**
```yaml
User Experience: Progressive Enhancement

Flow:
1. Document detected event received
2. Download document (1-2 seconds)
3. Store in blob storage (1-2 seconds)
4. Create partial Document shard immediately (3-5 seconds total)
   - processingStatus: "pending"
   - extractedText: null
   - summary: null
5. User sees document in UI with "Processing..." badge
6. Async processing: Extract text + Analyze (30-120 seconds)
7. Update shard: processingStatus: "completed"
8. UI updates automatically (via WebSocket or polling)

Benefits:
✅ Immediate feedback (user sees document within 5 seconds)
✅ Better UX (user knows system is working)
✅ Can view metadata while processing
✅ Can manually link while processing
✅ System feels responsive

Implementation:
```

**Document Shard Creation (Partial):**
```typescript
class DocumentProcessorConsumer {
  async processLargeDocument(event: DocumentDetectedEvent) {
    try {
      // 1. Download document
      const blob = await this.downloadDocument(event.externalUrl);
      
      // 2. Store in blob storage
      const blobUrl = await this.storeBlobStorage(blob, event.tenantId);
      
      // 3. Create PARTIAL shard (immediately visible to user)
      const shardId = await this.shardManager.createShard({
        tenantId: event.tenantId,
        shardTypeId: 'document',
        shardTypeName: 'Document',
        structuredData: {
          // Basic metadata (from integration)
          id: event.externalId,
          title: event.title,
          documentType: this.detectDocumentType(event.mimeType),
          mimeType: event.mimeType,
          size: event.size,
          integrationSource: event.integrationSource,
          externalId: event.externalId,
          externalUrl: event.externalUrl,
          blobStorageUrl: blobUrl,
          
          // Processing status
          processingStatus: 'pending',  // User sees "Processing..." badge
          
          // Empty fields (will be populated later)
          extractedText: null,
          summary: null,
          keyTopics: null,
          entities: null,
          
          // Timestamps
          createdAt: new Date(),
          modifiedAt: event.modifiedAt
        }
      });
      
      // 4. Publish shard.created (triggers vectorization queue)
      await this.eventPublisher.publish('shard.created', {
        shardId,
        tenantId: event.tenantId,
        shardTypeName: 'Document'
      });
      
      // 5. Queue for async processing
      await this.eventPublisher.publish('document.processing_required', {
        documentShardId: shardId,
        blobUrl,
        mimeType: event.mimeType,
        tenantId: event.tenantId
      });
      
      this.logger.info('Partial document shard created', {
        shardId,
        processingQueued: true
      });
      
    } catch (error) {
      this.logger.error('Failed to create partial shard', error);
      throw error;
    }
  }
}
```

**UI Display (React Example):**
```tsx
function DocumentCard({ document }: { document: DocumentShard }) {
  return (
    <div className="document-card">
      <h3>{document.structuredData.title}</h3>
      
      {/* Show processing badge */}
      {document.structuredData.processingStatus === 'pending' && (
        <Badge variant="info">
          <Spinner /> Processing...
        </Badge>
      )}
      
      {document.structuredData.processingStatus === 'completed' && (
        <Badge variant="success">Ready</Badge>
      )}
      
      {document.structuredData.processingStatus === 'failed' && (
        <Badge variant="error">Processing Failed</Badge>
      )}
      
      {/* Show available metadata even while processing */}
      <div className="metadata">
        <p>Type: {document.structuredData.documentType}</p>
        <p>Size: {formatBytes(document.structuredData.size)}</p>
        <p>Source: {document.structuredData.integrationSource}</p>
      </div>
      
      {/* Show summary once available */}
      {document.structuredData.summary && (
        <div className="summary">
          <h4>Summary</h4>
          <p>{document.structuredData.summary}</p>
        </div>
      )}
    </div>
  );
}
```

**Real-Time Updates (WebSocket):**
```typescript
// When processing completes, broadcast update to connected clients
class DocumentAnalysisConsumer {
  async processDocument(event: DocumentProcessingRequiredEvent) {
    // ... processing logic ...
    
    // Update shard
    await this.shardManager.updateShard(event.documentShardId, {
      'structuredData.extractedText': text,
      'structuredData.summary': analysis.summary,
      'structuredData.processingStatus': 'completed'
    });
    
    // Broadcast to connected clients via WebSocket
    await this.websocketService.broadcast(event.tenantId, {
      type: 'document.processing.completed',
      shardId: event.documentShardId,
      data: {
        summary: analysis.summary,
        keyTopics: analysis.keyTopics
      }
    });
  }
}
```

---

### Question 8: Transform Function Registration

**ANSWER: Option C - Both (Built-in at Startup, Custom from Config)**

**Recommendation:**
```yaml
Registration Strategy: Hybrid

Built-in Transforms (Always Available):
- Registered at service startup
- Common transforms (dateToISO, stringToNumber, etc.)
- Part of shared library

Custom Transforms (Per-Integration):
- Loaded from integration config
- Integration-specific logic
- Registered dynamically

Implementation:
```

**Built-in Transforms (Service Startup):**
```typescript
// packages/shared/src/services/FieldMapperService.ts

class FieldMapperService {
  private transformers: Map<string, TransformFunction> = new Map();
  
  constructor() {
    // Register built-in transforms on instantiation
    this.registerBuiltInTransforms();
  }
  
  private registerBuiltInTransforms(): void {
    // Date transforms
    this.register('dateToISO', (value) => {
      return value ? new Date(value).toISOString() : null;
    });
    
    this.register('dateToUnix', (value) => {
      return value ? Math.floor(new Date(value).getTime() / 1000) : null;
    });
    
    // Number transforms
    this.register('stringToNumber', (value) => {
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    });
    
    this.register('roundToDecimals', (value, options) => {
      const decimals = options?.decimals || 2;
      return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
    });
    
    // String transforms
    this.register('toLowerCase', (value) => {
      return value?.toLowerCase();
    });
    
    this.register('toUpperCase', (value) => {
      return value?.toUpperCase();
    });
    
    this.register('trim', (value) => {
      return value?.trim();
    });
    
    // Array transforms
    this.register('arrayToString', (value, options) => {
      const separator = options?.separator || ', ';
      return Array.isArray(value) ? value.join(separator) : value;
    });
    
    this.register('arrayFirst', (value) => {
      return Array.isArray(value) && value.length > 0 ? value[0] : null;
    });
    
    // Boolean transforms
    this.register('booleanToString', (value) => {
      return value ? 'true' : 'false';
    });
    
    this.register('booleanToYesNo', (value) => {
      return value ? 'Yes' : 'No';
    });
    
    // Null handling
    this.register('nullToDefault', (value, options) => {
      return value ?? options?.default ?? null;
    });
  }
  
  // Allow registration of custom transforms
  register(name: string, transformer: TransformFunction): void {
    if (this.transformers.has(name)) {
      throw new Error(`Transform '${name}' is already registered`);
    }
    this.transformers.set(name, transformer);
  }
}
```

**Custom Transforms (From Integration Config):**
```typescript
// Integration config can specify custom transforms
interface IntegrationConfig {
  id: string;
  syncConfig: {
    entityMappings: EntityMapping[];
    customTransforms?: CustomTransform[];  // NEW
  };
}

interface CustomTransform {
  name: string;
  code: string;  // JavaScript code as string
  // OR
  function?: TransformFunction;  // Pre-compiled function
}

// Example: Salesforce-specific transform
{
  customTransforms: [
    {
      name: 'salesforceStageToInternal',
      code: `
        function transform(value) {
          const stageMap = {
            'Prospecting': 'qualify',
            'Qualification': 'qualify',
            'Needs Analysis': 'discover',
            'Value Proposition': 'propose',
            'Decision Makers': 'negotiate',
            'Closed Won': 'closed_won',
            'Closed Lost': 'closed_lost'
          };
          return stageMap[value] || 'unknown';
        }
      `
    }
  ]
}
```

**Loading Custom Transforms:**
```typescript
class FieldMapperService {
  async loadCustomTransforms(integration: IntegrationConfig): Promise<void> {
    if (!integration.syncConfig.customTransforms) return;
    
    for (const customTransform of integration.syncConfig.customTransforms) {
      try {
        // Compile JavaScript code to function
        const transformFn = this.compileTransform(customTransform.code);
        
        // Register with prefixed name to avoid collisions
        const prefixedName = `${integration.id}:${customTransform.name}`;
        this.register(prefixedName, transformFn);
        
        this.logger.info('Registered custom transform', {
          integrationId: integration.id,
          transformName: customTransform.name
        });
      } catch (error) {
        this.logger.error('Failed to load custom transform', {
          integrationId: integration.id,
          transformName: customTransform.name,
          error: error.message
        });
      }
    }
  }
  
  private compileTransform(code: string): TransformFunction {
    // Use VM or Function constructor to safely compile code
    // SECURITY: Validate code before execution (sandboxing)
    const fn = new Function('value', 'options', `
      ${code}
      return transform(value, options);
    `);
    
    return (value, options) => {
      try {
        return fn(value, options);
      } catch (error) {
        this.logger.error('Transform execution failed', error);
        return value; // Return original value on error
      }
    };
  }
}
```

**Usage in Mapping Consumer:**
```typescript
class CRMDataMappingConsumer {
  async processRawData(event: IntegrationDataRawEvent) {
    // Get integration config
    const integration = await this.getIntegrationConfig(event.integrationId);
    
    // Load custom transforms (if not already loaded)
    await this.fieldMapper.loadCustomTransforms(integration);
    
    // Apply field mappings (uses both built-in and custom transforms)
    const structuredData = await this.fieldMapper.mapFields(
      event.rawData,
      entityMapping.fieldMappings
    );
  }
}
```

**Field Mapping with Custom Transform:**
```typescript
{
  externalFieldName: "StageName",
  internalFieldName: "stage",
  transform: "salesforce-integration:salesforceStageToInternal"  // Custom transform
}
```

---

### Question 9: Opportunity Event Debouncing Scope

**ANSWER: Option A - Per Opportunity**

**Recommendation:**
```yaml
Debouncing Scope: Per Opportunity (Not Per Tenant/Integration)

Why Per Opportunity:
✅ Most granular (doesn't batch unrelated opportunities)
✅ Risk scoring per opportunity is independent
✅ Simpler implementation
✅ Better user experience (updates per opportunity)

Why NOT Per Tenant:
❌ Would batch all opportunities for tenant
❌ Single large event instead of many small events
❌ Harder to process (which opportunities changed?)
❌ Worse user experience (bulk updates)

Implementation: Already shown in Question 6
```

---

### Question 10: Azure Infrastructure Setup Timing

**ANSWER: Option B - Created via Terraform in Phase 1**

**Recommendation:**
```yaml
Setup Method: Infrastructure as Code (Terraform)

Why Terraform:
✅ Version controlled
✅ Repeatable across environments
✅ Documented in code
✅ Easy to review (PR process)
✅ No manual steps

Process:
1. Create Terraform files in Phase 1
2. PR review
3. Apply to development environment
4. Apply to staging/production later
5. Fully automated

Timeline: Day 1 of Phase 1
```

**Terraform Files:**
```hcl
# infrastructure/terraform/integration-infrastructure.tf

# Azure Blob Storage
resource "azurerm_storage_account" "integration_storage" {
  name                     = "castielint${var.environment}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = var.environment == "production" ? "GRS" : "LRS"
  
  blob_properties {
    delete_retention_policy {
      days = 30
    }
  }
}

resource "azurerm_storage_container" "documents" {
  name                  = "integration-documents"
  storage_account_name  = azurerm_storage_account.integration_storage.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "recordings" {
  name                  = "integration-recordings"
  storage_account_name  = azurerm_storage_account.integration_storage.name
  container_access_type = "private"
}

# Azure Cognitive Services - Computer Vision
resource "azurerm_cognitive_account" "computer_vision" {
  name                = "castiel-vision-${var.environment}"
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  kind                = "ComputerVision"
  sku_name            = "S1"
}

# Azure Cognitive Services - Speech
resource "azurerm_cognitive_account" "speech" {
  name                = "castiel-speech-${var.environment}"
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  kind                = "SpeechServices"
  sku_name            = "S0"
}

# Store keys in Key Vault
resource "azurerm_key_vault_secret" "blob_connection_string" {
  name         = "integration-blob-connection-string"
  value        = azurerm_storage_account.integration_storage.primary_connection_string
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "computer_vision_key" {
  name         = "computer-vision-key"
  value        = azurerm_cognitive_account.computer_vision.primary_access_key
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "speech_key" {
  name         = "speech-key"
  value        = azurerm_cognitive_account.speech.primary_access_key
  key_vault_id = azurerm_key_vault.main.id
}
```

**Application Configuration:**
```typescript
// packages/integration-processors/src/config/config.ts

export interface Config {
  azure: {
    blobStorage: {
      connectionString: string;  // From Key Vault
      containers: {
        documents: string;
        recordings: string;
        attachments: string;
      };
    };
    cognitiveServices: {
      computerVision: {
        endpoint: string;
        apiKey: string;  // From Key Vault
      };
      speech: {
        endpoint: string;
        apiKey: string;  // From Key Vault
        region: string;
      };
    };
  };
}

// Load from environment variables (populated from Key Vault)
export const config: Config = {
  azure: {
    blobStorage: {
      connectionString: process.env.AZURE_BLOB_CONNECTION_STRING!,
      containers: {
        documents: 'integration-documents',
        recordings: 'integration-recordings',
        attachments: 'integration-attachments'
      }
    },
    cognitiveServices: {
      computerVision: {
        endpoint: process.env.AZURE_COMPUTER_VISION_ENDPOINT!,
        apiKey: process.env.AZURE_COMPUTER_VISION_KEY!
      },
      speech: {
        endpoint: process.env.AZURE_SPEECH_ENDPOINT!,
        apiKey: process.env.AZURE_SPEECH_KEY!,
        region: process.env.AZURE_SPEECH_REGION || 'eastus'
      }
    }
  }
};
```

---

## Summary

All additional questions answered with enterprise best practices:

**High Priority:**
- ✅ Consumer deployment: Same image, different deployments (CONSUMER_TYPE env var)
- ✅ Entity linking: Shared library in packages/shared
- ✅ Shard types: Created via ensureShardTypes() on startup

**Medium Priority:**
- ✅ ML field recalculation: Only publish if >= 10% change
- ✅ Suggested links: Separate Cosmos DB container with TTL
- ✅ Debouncing: In-memory Map per consumer (simple, sufficient)

**Low Priority:**
- ✅ Large documents: Partial shard immediately visible
- ✅ Custom transforms: Built-in + custom from config
- ✅ Debouncing scope: Per opportunity
- ✅ Infrastructure: Terraform/IaC in Phase 1

All answers optimized for:
- Simplicity (start simple, add complexity when needed)
- Maintainability (clear patterns, easy to understand)
- Scalability (can grow with usage)
- Enterprise-grade (production-ready patterns)
