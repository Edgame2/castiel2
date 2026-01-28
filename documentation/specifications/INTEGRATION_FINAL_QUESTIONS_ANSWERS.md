# Integration Data Flow Plan - Final Implementation Questions Answers

**Date:** January 28, 2025  
**Purpose:** Finalize implementation structure and deployment decisions

---

## High Priority Questions (Implementation Structure)

### Question 1: Processor Container Location

**ANSWER: Option B - Create New `containers/integration-processors` (Separate from integration-sync)**

**Recommendation:**
```yaml
Container Structure:

containers/integration-sync/
  Purpose: Orchestrates integration sync tasks
  Responsibilities:
  - Execute sync tasks (fetch data from integrations)
  - Publish raw events to RabbitMQ
  - Track sync execution status
  - Handle sync scheduling and triggers
  - Provide sync management APIs
  
  Keep:
  - IntegrationSyncService (refactored to publish events)
  - IntegrationAdapter/ConnectionService
  - SyncTaskService
  - Sync API routes
  
containers/integration-processors/ (NEW)
  Purpose: Process integration data and create shards
  Responsibilities:
  - Consume raw integration events
  - Apply field mappings
  - Create shards
  - Entity linking
  - ML field aggregation
  
  Contains:
  - CRMDataMappingConsumer
  - DocumentProcessorConsumer
  - EmailProcessorConsumer
  - MessageProcessorConsumer
  - MeetingProcessorConsumer
  - EventProcessorConsumer
  - EntityLinkingConsumer
  - MLFieldAggregationConsumer

Why Separate Containers:
✅ Clear separation of concerns (fetch vs process)
✅ Independent scaling (can scale processors without scaling sync)
✅ Different resource requirements (processors need more CPU/memory)
✅ Easier to deploy/rollback independently
✅ integration-sync stays focused on orchestration
✅ integration-processors focused on data processing

Why NOT Option A (add to integration-sync):
❌ Container becomes too large/complex
❌ Mixes orchestration with processing
❌ Harder to scale independently
❌ Deployment coupling

Why NOT Option C (split):
❌ Arbitrary split creates confusion
❌ Two containers to manage for similar concerns
❌ Less clear boundaries
```

**Directory Structure:**
```
containers/
├── integration-sync/              (EXISTING - REFACTORED)
│   ├── src/
│   │   ├── services/
│   │   │   ├── IntegrationSyncService.ts    (REFACTORED - publishes events)
│   │   │   ├── IntegrationConnectionService.ts
│   │   │   └── SyncTaskService.ts
│   │   ├── routes/
│   │   │   ├── sync.routes.ts
│   │   │   └── integration.routes.ts
│   │   └── index.ts
│   ├── package.json
│   └── Dockerfile
│
└── integration-processors/        (NEW)
    ├── src/
    │   ├── consumers/
    │   │   ├── CRMDataMappingConsumer.ts
    │   │   ├── DocumentProcessorConsumer.ts
    │   │   ├── EmailProcessorConsumer.ts
    │   │   ├── MessageProcessorConsumer.ts
    │   │   ├── MeetingProcessorConsumer.ts
    │   │   ├── EventProcessorConsumer.ts
    │   │   ├── EntityLinkingConsumer.ts
    │   │   └── MLFieldAggregationConsumer.ts
    │   ├── services/
    │   │   ├── BlobStorageService.ts
    │   │   ├── OCRService.ts
    │   │   ├── TranscriptionService.ts
    │   │   └── TextExtractionService.ts
    │   ├── startup/
    │   │   ├── ensureShardTypes.ts
    │   │   └── shardTypeDefinitions.ts
    │   ├── routes/
    │   │   ├── health.routes.ts           (Health checks)
    │   │   ├── metrics.routes.ts          (Prometheus metrics)
    │   │   └── suggestedLinks.routes.ts   (Suggested links API)
    │   └── index.ts
    ├── package.json
    └── Dockerfile
```

---

### Question 6: Integration Processors Container Creation

**ANSWER: Create New Container from Scratch (Based on Standard Template)**

**Implementation Plan:**

**Step 1: Create Container Structure**
```bash
# Create new container directory
mkdir -p containers/integration-processors/src/{consumers,services,routes,startup}

# Copy standard structure from another container (as template)
cp containers/integration-sync/package.json containers/integration-processors/
cp containers/integration-sync/tsconfig.json containers/integration-processors/
cp containers/integration-sync/Dockerfile containers/integration-processors/
```

**Step 2: Package.json**
```json
{
  "name": "@castiel/integration-processors",
  "version": "1.0.0",
  "description": "Integration data processors for multi-modal data",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts",
    "test": "jest"
  },
  "dependencies": {
    "@castiel/shared": "workspace:*",
    "fastify": "^4.x",
    "amqplib": "^0.10.x",
    "dotenv": "^16.x",
    "@azure/storage-blob": "^12.x",
    "@azure/cognitiveservices-computervision": "^9.x",
    "microsoft-cognitiveservices-speech-sdk": "^1.x",
    "pdf-parse": "^1.x",
    "mammoth": "^1.x",
    "xlsx": "^0.18.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "@types/node": "^20.x",
    "tsx": "^4.x",
    "jest": "^29.x"
  }
}
```

**Step 3: Main Entry Point (index.ts)**
```typescript
// containers/integration-processors/src/index.ts

import Fastify from 'fastify';
import { ensureShardTypes } from './startup/ensureShardTypes';
import { startConsumers } from './consumers';
import { registerRoutes } from './routes';

async function main() {
  const consumerType = process.env.CONSUMER_TYPE || 'all';
  
  console.log(`Starting integration-processors (type: ${consumerType})...`);
  
  // 1. Initialize Fastify (for health checks, metrics)
  const app = Fastify({ logger: true });
  
  // 2. Register routes (health, metrics, suggested-links API)
  await registerRoutes(app);
  
  // 3. Initialize dependencies
  const shardManager = new ShardManagerClient(process.env.SHARD_MANAGER_URL!);
  const eventPublisher = new EventPublisher({
    url: process.env.RABBITMQ_URL!
  });
  
  // 4. Ensure all shard types exist
  await ensureShardTypes(shardManager);
  
  // 5. Start HTTP server (for health checks)
  const port = parseInt(process.env.PORT || '3000');
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`HTTP server listening on port ${port}`);
  
  // 6. Start consumers (based on CONSUMER_TYPE)
  await startConsumers(consumerType, { shardManager, eventPublisher });
  
  // 7. Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    await app.close();
    process.exit(0);
  });
  
  console.log(`Integration processors started (type: ${consumerType})`);
}

main().catch(error => {
  console.error('Failed to start integration-processors:', error);
  process.exit(1);
});
```

**Step 4: Consumer Starter**
```typescript
// containers/integration-processors/src/consumers/index.ts

import { CRMDataMappingConsumer } from './CRMDataMappingConsumer';
import { DocumentProcessorConsumer } from './DocumentProcessorConsumer';
import { EmailProcessorConsumer } from './EmailProcessorConsumer';
import { MessageProcessorConsumer } from './MessageProcessorConsumer';
import { MeetingProcessorConsumer } from './MeetingProcessorConsumer';
import { EventProcessorConsumer } from './EventProcessorConsumer';
import { EntityLinkingConsumer } from './EntityLinkingConsumer';
import { MLFieldAggregationConsumer } from './MLFieldAggregationConsumer';

export async function startConsumers(
  type: string,
  deps: ConsumerDependencies
): Promise<void> {
  const consumers: BaseConsumer[] = [];
  
  if (type === 'light' || type === 'all') {
    consumers.push(
      new CRMDataMappingConsumer(deps),
      new EmailProcessorConsumer(deps),
      new MessageProcessorConsumer(deps),
      new EventProcessorConsumer(deps),
      new EntityLinkingConsumer(deps),
      new MLFieldAggregationConsumer(deps)
    );
  }
  
  if (type === 'heavy' || type === 'all') {
    consumers.push(
      new DocumentProcessorConsumer(deps),
      new MeetingProcessorConsumer(deps)
    );
  }
  
  // Start all consumers
  await Promise.all(consumers.map(c => c.start()));
  
  console.log(`Started ${consumers.length} consumers`);
}
```

**Step 5: Dockerfile**
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy built code
COPY dist/ ./dist/

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV CONSUMER_TYPE=all

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Run
CMD ["node", "dist/index.js"]
```

**Shared Code via @castiel/shared:**
```typescript
// All shared code stays in packages/shared
// Consumers import from @castiel/shared

import { 
  ShardManagerClient,
  EventPublisher,
  EntityLinkingService,
  FieldMapperService
} from '@castiel/shared';
```

---

### Question 2: Service Structure for Processors Container

**ANSWER: Option B - Minimal HTTP Server (Health Checks, Metrics, Suggested Links API)**

**Recommendation:**
```yaml
Service Structure:

Primary Function: RabbitMQ consumers (data processing)
Secondary Function: HTTP server for observability and suggested links API

HTTP Server Endpoints:
- GET /health           (Health check - required for container orchestration)
- GET /metrics          (Prometheus metrics)
- GET /ready            (Readiness check - dependencies healthy)
- GET /api/v1/suggested-links
- POST /api/v1/suggested-links/:id/approve
- POST /api/v1/suggested-links/:id/reject

Why Include HTTP Server:
✅ Required for health checks (Kubernetes/Container Apps)
✅ Prometheus metrics endpoint (monitoring)
✅ Suggested links API (user-facing feature)
✅ Standard pattern across containers
✅ Minimal overhead

Why NOT Consumer-Only:
❌ No health check endpoint
❌ No metrics endpoint
❌ Where to put suggested links API?
❌ Harder to monitor
```

**HTTP Routes Implementation:**
```typescript
// containers/integration-processors/src/routes/index.ts

import { FastifyInstance } from 'fastify';
import { healthRoutes } from './health.routes';
import { metricsRoutes } from './metrics.routes';
import { suggestedLinksRoutes } from './suggestedLinks.routes';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  // Health checks (required)
  await app.register(healthRoutes);
  
  // Metrics (required)
  await app.register(metricsRoutes);
  
  // Suggested links API (feature)
  await app.register(suggestedLinksRoutes, { prefix: '/api/v1' });
}
```

**Health Check Routes:**
```typescript
// containers/integration-processors/src/routes/health.routes.ts

export async function healthRoutes(app: FastifyInstance) {
  // Basic health check
  app.get('/health', async (request, reply) => {
    return { status: 'healthy', timestamp: new Date().toISOString() };
  });
  
  // Readiness check (dependencies)
  app.get('/ready', async (request, reply) => {
    const checks = {
      rabbitmq: await checkRabbitMQ(),
      shardManager: await checkShardManager(),
      blobStorage: await checkBlobStorage()
    };
    
    const ready = Object.values(checks).every(c => c.healthy);
    
    return {
      ready,
      checks,
      timestamp: new Date().toISOString()
    };
  });
}
```

---

## Medium Priority Questions (Implementation Details)

### Question 3: Docker Compose Configuration

**ANSWER: Option A - Two Separate Services**

**Recommendation:**
```yaml
# docker-compose.yml

services:
  # Light processors (fast processing)
  integration-processors-light:
    build:
      context: .
      dockerfile: containers/integration-processors/Dockerfile
    container_name: integration-processors-light
    environment:
      CONSUMER_TYPE: light
      NODE_ENV: development
      RABBITMQ_URL: amqp://rabbitmq:5672
      SHARD_MANAGER_URL: http://shard-manager:3000
      REDIS_URL: redis://redis:6379
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 1G
    depends_on:
      - rabbitmq
      - shard-manager
      - redis
    restart: unless-stopped
    networks:
      - castiel-network
  
  # Heavy processors (slow processing)
  integration-processors-heavy:
    build:
      context: .
      dockerfile: containers/integration-processors/Dockerfile
    container_name: integration-processors-heavy
    environment:
      CONSUMER_TYPE: heavy
      NODE_ENV: development
      RABBITMQ_URL: amqp://rabbitmq:5672
      SHARD_MANAGER_URL: http://shard-manager:3000
      AZURE_BLOB_CONNECTION_STRING: ${AZURE_BLOB_CONNECTION_STRING}
      AZURE_COMPUTER_VISION_ENDPOINT: ${AZURE_COMPUTER_VISION_ENDPOINT}
      AZURE_COMPUTER_VISION_KEY: ${AZURE_COMPUTER_VISION_KEY}
      AZURE_SPEECH_ENDPOINT: ${AZURE_SPEECH_ENDPOINT}
      AZURE_SPEECH_KEY: ${AZURE_SPEECH_KEY}
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 8G
        reservations:
          cpus: '2'
          memory: 4G
    depends_on:
      - rabbitmq
      - shard-manager
    restart: unless-stopped
    networks:
      - castiel-network

Why Two Separate Services:
✅ Clear in docker-compose.yml
✅ Independent resource allocation
✅ Independent restart policies
✅ Easy to scale with docker-compose scale
✅ Clear monitoring (separate container names)

Why NOT Option B (single service):
❌ Can't run both light and heavy simultaneously in docker-compose
❌ Have to manually manage multiple instances
```

---

### Question 4: Periodic ML Field Recalculation

**ANSWER: Option B - Cron Job Directly in integration-processors**

**Recommendation:**
```yaml
Implementation: node-cron in integration-processors container

Why Direct Cron:
✅ Simpler (no workflow-orchestrator dependency)
✅ Self-contained (all ML field logic in one place)
✅ Easier to test/debug
✅ Immediate access to MLFieldAggregationConsumer

Why NOT workflow-orchestrator:
❌ Adds unnecessary complexity for simple periodic job
❌ Another service dependency
❌ More moving parts

Implementation:
```

**Cron Job Implementation:**
```typescript
// containers/integration-processors/src/jobs/mlFieldRecalculation.ts

import cron from 'node-cron';
import { ShardManagerClient, EventPublisher } from '@castiel/shared';

export class MLFieldRecalculationJob {
  private cronJob: cron.ScheduledTask | null = null;
  
  constructor(
    private shardManager: ShardManagerClient,
    private eventPublisher: EventPublisher
  ) {}
  
  start(): void {
    // Run daily at 2 AM
    this.cronJob = cron.schedule('0 2 * * *', async () => {
      await this.execute();
    });
    
    console.log('ML field recalculation job scheduled (daily at 2 AM)');
  }
  
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
    }
  }
  
  private async execute(): Promise<void> {
    console.log('Starting ML field recalculation...');
    
    try {
      // Get active opportunities (closeDate in future)
      const opportunities = await this.shardManager.queryShards({
        shardType: 'Opportunity',
        filter: {
          'structuredData.closeDate': { $gte: new Date().toISOString() }
        }
      });
      
      console.log(`Found ${opportunities.length} active opportunities`);
      
      // Publish recalculation events
      for (const opp of opportunities) {
        await this.eventPublisher.publish('ml_field_aggregation.recalculate', {
          opportunityId: opp.id,
          tenantId: opp.tenantId,
          reason: 'periodic_recalculation'
        });
      }
      
      console.log('ML field recalculation jobs queued');
      
    } catch (error) {
      console.error('ML field recalculation failed:', error);
    }
  }
}
```

**Start Job in Main:**
```typescript
// containers/integration-processors/src/index.ts

async function main() {
  // ... existing startup code ...
  
  // Start periodic jobs (only in 'light' or 'all' mode)
  if (consumerType === 'light' || consumerType === 'all') {
    const mlFieldRecalculationJob = new MLFieldRecalculationJob(
      shardManager,
      eventPublisher
    );
    mlFieldRecalculationJob.start();
    
    console.log('Periodic jobs started');
  }
}
```

---

### Question 5: Suggested Links API Location

**ANSWER: Option B - Add Routes to integration-processors Container**

**Recommendation:**
```yaml
Location: containers/integration-processors/src/routes/suggestedLinks.routes.ts

Why integration-processors:
✅ Entity linking logic runs in this container
✅ Has access to EntityLinkingService
✅ Has access to Cosmos DB (for suggested_links container)
✅ Natural home for entity linking APIs
✅ Already has HTTP server (for health checks)

Why NOT integration-sync:
❌ Sync container focused on orchestration
❌ Entity linking not part of sync logic

Why NOT separate service:
❌ Overkill for 3 simple endpoints
❌ Another service to deploy/manage
```

**API Implementation:**
```typescript
// containers/integration-processors/src/routes/suggestedLinks.routes.ts

import { FastifyInstance } from 'fastify';
import { SuggestedLinksService } from '../services/SuggestedLinksService';

export async function suggestedLinksRoutes(app: FastifyInstance) {
  const suggestedLinksService = new SuggestedLinksService();
  
  // Get pending suggested links
  app.get('/suggested-links', async (request, reply) => {
    const { tenantId, status = 'pending_review' } = request.query as any;
    
    const links = await suggestedLinksService.getSuggestedLinks(
      tenantId,
      status
    );
    
    return { links };
  });
  
  // Approve suggested link
  app.post('/suggested-links/:id/approve', async (request, reply) => {
    const { id } = request.params as any;
    const { userId, tenantId } = request.body as any;
    
    await suggestedLinksService.approveSuggestedLink(id, userId, tenantId);
    
    return { success: true };
  });
  
  // Reject suggested link
  app.post('/suggested-links/:id/reject', async (request, reply) => {
    const { id } = request.params as any;
    const { userId, tenantId } = request.body as any;
    
    await suggestedLinksService.rejectSuggestedLink(id, userId, tenantId);
    
    return { success: true };
  });
}
```

---

### Question 7: Entity Linking Consumer Location

**ANSWER: In integration-processors Container (Same as Other Processors)**

**Recommendation:**
```yaml
Location: containers/integration-processors/src/consumers/EntityLinkingConsumer.ts

Why integration-processors:
✅ Logical grouping with other processors
✅ All consume integration events
✅ All create/update shards
✅ Part of integration data flow
✅ Uses shared EntityLinkingService

Why NOT data-enrichment:
❌ Entity linking is part of integration processing
❌ Different concern than vectorization
❌ Better with integration processors

Consumer Type: Light (entity linking is relatively fast)
```

---

### Question 8: ML Field Aggregation Consumer Location

**ANSWER: In integration-processors Container (Same as Other Processors)**

**Recommendation:**
```yaml
Location: containers/integration-processors/src/consumers/MLFieldAggregationConsumer.ts

Why integration-processors:
✅ Part of integration data processing pipeline
✅ Triggered by shard.created events (like other processors)
✅ Updates opportunity shards (like mapping consumer)
✅ Logical grouping

Why NOT risk-analytics:
❌ Risk analytics consumes ML fields, doesn't create them
❌ Different responsibility (risk calculation vs data preparation)

Why NOT data-enrichment:
❌ Not enrichment, it's aggregation
❌ Different concern

Consumer Type: Light (aggregation is relatively fast)
```

---

## Low Priority Questions (Error Handling & Startup)

### Question 9: Startup Order and Dependencies

**ANSWER: Sequential Startup with Health Checks**

**Implementation:**
```typescript
// containers/integration-processors/src/index.ts

async function main() {
  console.log('Starting integration-processors...');
  
  // 1. Load configuration
  const config = loadConfig();
  
  // 2. Initialize dependencies
  const deps = await initializeDependencies(config);
  
  // 3. Wait for external dependencies to be ready
  await waitForDependencies(deps);
  
  // 4. Ensure shard types exist (BEFORE consumers start)
  await ensureShardTypes(deps.shardManager);
  
  // 5. Start HTTP server (health checks available immediately)
  await startHTTPServer(app, config.port);
  
  // 6. Start consumers (AFTER shard types ensured)
  await startConsumers(config.consumerType, deps);
  
  console.log('Integration processors ready');
}

async function waitForDependencies(deps: Dependencies): Promise<void> {
  const maxRetries = 30;
  const retryDelay = 2000; // 2 seconds
  
  console.log('Waiting for dependencies...');
  
  // Wait for RabbitMQ
  await waitForService(
    'RabbitMQ',
    () => deps.eventPublisher.isConnected(),
    maxRetries,
    retryDelay
  );
  
  // Wait for Shard Manager
  await waitForService(
    'Shard Manager',
    () => deps.shardManager.healthCheck(),
    maxRetries,
    retryDelay
  );
  
  console.log('All dependencies ready');
}

async function waitForService(
  name: string,
  checkFn: () => Promise<boolean>,
  maxRetries: number,
  retryDelay: number
): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const healthy = await checkFn();
      if (healthy) {
        console.log(`${name} is ready`);
        return;
      }
    } catch (error) {
      console.log(`${name} not ready (attempt ${i + 1}/${maxRetries})`);
    }
    
    await new Promise(resolve => setTimeout(resolve, retryDelay));
  }
  
  throw new Error(`${name} not ready after ${maxRetries} attempts`);
}
```

**Startup Order:**
1. ✅ Load configuration (env vars, config files)
2. ✅ Initialize dependencies (create clients)
3. ✅ Wait for RabbitMQ to be ready (with retries)
4. ✅ Wait for Shard Manager to be ready (with retries)
5. ✅ Ensure shard types exist (create if missing)
6. ✅ Start HTTP server (health checks available)
7. ✅ Start consumers (begin processing)

**Docker Compose Dependencies:**
```yaml
integration-processors-light:
  depends_on:
    rabbitmq:
      condition: service_healthy
    shard-manager:
      condition: service_healthy
    redis:
      condition: service_healthy
```

---

### Question 10: Error Handling for Missing Shard Types

**ANSWER: Option B - Retry with Exponential Backoff**

**Implementation:**
```typescript
// containers/integration-processors/src/startup/ensureShardTypes.ts

export async function ensureShardTypes(
  shardManager: ShardManagerClient
): Promise<void> {
  console.log('Ensuring all shard types exist...');
  
  for (const shardTypeDef of shardTypeDefinitions) {
    await ensureSingleShardType(shardManager, shardTypeDef);
  }
  
  console.log('All shard types ensured');
}

async function ensureSingleShardType(
  shardManager: ShardManagerClient,
  shardTypeDef: ShardTypeDefinition
): Promise<void> {
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Check if exists
      const existing = await shardManager.getShardType(shardTypeDef.id);
      
      if (existing) {
        // Update if schema version changed
        if (existing.schemaVersion !== shardTypeDef.schemaVersion) {
          await shardManager.updateShardType(shardTypeDef.id, shardTypeDef);
          console.log(`Updated shard type ${shardTypeDef.name}`);
        }
      } else {
        // Create new
        await shardManager.createShardType(shardTypeDef);
        console.log(`Created shard type ${shardTypeDef.name}`);
      }
      
      return; // Success
      
    } catch (error) {
      console.error(`Failed to ensure shard type ${shardTypeDef.name} (attempt ${attempt + 1}/${maxRetries}):`, error);
      
      if (attempt < maxRetries - 1) {
        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Final attempt failed
        throw new Error(`Failed to ensure shard type ${shardTypeDef.name} after ${maxRetries} attempts`);
      }
    }
  }
}
```

**Consumer Error Handling (Missing Shard Type at Runtime):**
```typescript
class CRMDataMappingConsumer {
  async processRawData(event: IntegrationDataRawEvent) {
    try {
      // Apply field mappings
      const structuredData = await this.fieldMapper.mapFields(
        event.rawData,
        entityMapping.fieldMappings
      );
      
      // Create shard
      const shardId = await this.shardManager.createShard({
        tenantId: event.tenantId,
        shardTypeId: entityMapping.shardTypeId,
        structuredData: structuredData
      });
      
      return shardId;
      
    } catch (error) {
      // Check if error is "shard type not found"
      if (error.code === 'SHARD_TYPE_NOT_FOUND') {
        console.error('Shard type not found:', entityMapping.shardTypeId);
        
        // Try to create shard type on-the-fly
        const shardTypeDef = shardTypeDefinitions.find(
          d => d.id === entityMapping.shardTypeId
        );
        
        if (shardTypeDef) {
          await this.shardManager.createShardType(shardTypeDef);
          console.log('Created missing shard type, retrying...');
          
          // Retry shard creation
          return await this.shardManager.createShard({
            tenantId: event.tenantId,
            shardTypeId: entityMapping.shardTypeId,
            structuredData: structuredData
          });
        }
      }
      
      // Re-throw if not recoverable
      throw error;
    }
  }
}
```

**Strategy:**
1. ✅ Try to ensure shard types on startup (with retries)
2. ✅ If startup fails, fail fast (don't start consumers)
3. ✅ If shard type missing at runtime (edge case), try to create it
4. ✅ If still fails, send message to DLQ for manual review
5. ✅ Alert on repeated shard type creation failures

---

## Complete Implementation Structure Summary

```
Project Structure:

containers/
├── integration-sync/              (EXISTING - REFACTORED)
│   ├── src/
│   │   ├── services/
│   │   │   └── IntegrationSyncService.ts   (publishes events, no direct shard creation)
│   │   └── routes/
│   │       └── sync.routes.ts
│   └── Dockerfile
│
└── integration-processors/        (NEW)
    ├── src/
    │   ├── consumers/
    │   │   ├── CRMDataMappingConsumer.ts
    │   │   ├── DocumentProcessorConsumer.ts
    │   │   ├── EmailProcessorConsumer.ts
    │   │   ├── MessageProcessorConsumer.ts
    │   │   ├── MeetingProcessorConsumer.ts
    │   │   ├── EventProcessorConsumer.ts
    │   │   ├── EntityLinkingConsumer.ts       ← HERE
    │   │   └── MLFieldAggregationConsumer.ts  ← HERE
    │   ├── services/
    │   │   ├── BlobStorageService.ts
    │   │   ├── OCRService.ts
    │   │   ├── TranscriptionService.ts
    │   │   ├── TextExtractionService.ts
    │   │   └── SuggestedLinksService.ts
    │   ├── routes/
    │   │   ├── health.routes.ts
    │   │   ├── metrics.routes.ts
    │   │   └── suggestedLinks.routes.ts       ← API HERE
    │   ├── jobs/
    │   │   └── mlFieldRecalculation.ts        ← CRON HERE
    │   ├── startup/
    │   │   ├── ensureShardTypes.ts
    │   │   └── shardTypeDefinitions.ts
    │   └── index.ts
    ├── package.json
    └── Dockerfile

packages/
└── shared/
    └── src/
        └── services/
            ├── EntityLinkingService.ts         ← SHARED
            ├── FieldMapperService.ts
            └── ShardManagerClient.ts

docker-compose.yml:
  - integration-sync              (orchestration)
  - integration-processors-light  (fast processing)
  - integration-processors-heavy  (slow processing)
```

---

## Implementation Checklist

**Phase 1: Container Setup (Day 1-2)**
- [ ] Create `containers/integration-processors` directory structure
- [ ] Copy Dockerfile template
- [ ] Create package.json with dependencies
- [ ] Set up TypeScript configuration
- [ ] Create main index.ts entry point
- [ ] Create health check routes
- [ ] Test container builds

**Phase 2: Core Consumers (Day 3-5)**
- [ ] Implement CRMDataMappingConsumer
- [ ] Implement DocumentProcessorConsumer
- [ ] Implement EmailProcessorConsumer
- [ ] Implement MessageProcessorConsumer
- [ ] Implement MeetingProcessorConsumer
- [ ] Implement EventProcessorConsumer
- [ ] Test each consumer independently

**Phase 3: Supporting Consumers (Day 6-7)**
- [ ] Implement EntityLinkingConsumer
- [ ] Implement MLFieldAggregationConsumer
- [ ] Test entity linking flow
- [ ] Test ML field aggregation

**Phase 4: Infrastructure & Jobs (Day 8-9)**
- [ ] Implement ensureShardTypes()
- [ ] Create shard type definitions
- [ ] Implement ML field recalculation cron job
- [ ] Test startup sequence

**Phase 5: APIs & Services (Day 10-11)**
- [ ] Implement SuggestedLinksService
- [ ] Implement suggested links API routes
- [ ] Implement BlobStorageService
- [ ] Implement OCRService
- [ ] Implement TranscriptionService

**Phase 6: Docker Compose (Day 12)**
- [ ] Update docker-compose.yml
- [ ] Add integration-processors-light service
- [ ] Add integration-processors-heavy service
- [ ] Configure resource limits
- [ ] Test full stack startup

**Phase 7: Integration Testing (Day 13-14)**
- [ ] End-to-end integration tests
- [ ] Test all data types (CRM, Documents, Emails, Meetings)
- [ ] Test entity linking
- [ ] Test ML field aggregation
- [ ] Test periodic recalculation
- [ ] Test suggested links API

---

## All Questions Now Answered ✅

You now have complete answers to **ALL implementation questions**:
- Container structure decisions
- Service architecture
- Docker Compose configuration
- Periodic jobs implementation
- API location decisions
- Consumer location decisions
- Startup sequence
- Error handling strategies

**Ready for implementation with complete architectural clarity!**
