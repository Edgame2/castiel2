# BI Sales Risk Analysis – Final Answers

**Date:** January 2026  
**Status:** All Questions Resolved ✅  
**Version:** 1.0

---

## Critical System Requirement

**🔴 ALL QUEUING MUST USE RABBITMQ ONLY**
- No Azure Service Bus
- No other message brokers
- All events, jobs, and async processing via RabbitMQ

---

## 1. Salesforce Field Mapping ✅ CONFIRMED

### Your Answer: "use default salesforce fields name" + "yes more fields can be added if necessary"

### ✅ CONFIRMED MAPPING:

```typescript
// Opportunity Shard (c_opportunity)
interface OpportunityShard {
  id: string;
  tenantId: string;
  shardTypeId: 'c_opportunity';
  structuredData: {
    // ✅ Standard Salesforce fields (as-is):
    Amount: number;                    // Deal value
    StageName: string;                 // Sales stage
    CloseDate: string;                 // ISO date string
    Probability: number;               // 0-100
    AccountId: string;                 // Account reference
    OwnerId: string;                   // Owner reference
    CreatedDate: string;               // ISO date string
    
    // ✅ Status (derived from Salesforce):
    IsClosed: boolean;
    IsWon: boolean;
    // Alternative: Infer from StageName ('Closed Won', 'Closed Lost')
    
    // ✅ NEW FIELDS TO ADD (not in standard Salesforce):
    LastActivityDate?: string;         // ISO date, track last engagement
    Industry?: string;                 // If not at account level
    IndustryId?: string;               // Standardized industry ID
    CompetitorIds?: string[];          // Array of competitor IDs
    StageUpdatedAt?: string;           // ISO date, when stage changed
    StageDates?: Record<string, string>; // Map of stage -> date entered
  };
  createdAt: string;  // Shard creation
  updatedAt: string;
}

// Account Shard (c_account)
interface AccountShard {
  id: string;
  tenantId: string;
  shardTypeId: 'c_account';
  structuredData: {
    // ✅ Standard Salesforce fields:
    Name: string;
    
    // ✅ NEW FIELD TO ADD (may not be in all Salesforce orgs):
    Industry?: string;                 // Primary for industry lookup
    IndustryId?: string;               // Standardized industry ID
  };
}
```

### Implementation Notes:

**1. Field Access Pattern:**
```typescript
// Accessing Salesforce fields
const dealValue = opportunity.structuredData.Amount;
const stage = opportunity.structuredData.StageName;
const closeDate = new Date(opportunity.structuredData.CloseDate);

// Accessing new fields
const lastActivity = opportunity.structuredData.LastActivityDate 
  ? new Date(opportunity.structuredData.LastActivityDate)
  : null;
```

**2. Status Determination:**
```typescript
function getOpportunityStatus(opportunity: OpportunityShard): 'won' | 'lost' | 'open' {
  // Option 1: Use Salesforce boolean flags
  if (opportunity.structuredData.IsClosed) {
    return opportunity.structuredData.IsWon ? 'won' : 'lost';
  }
  
  // Option 2: Infer from StageName (fallback)
  const stage = opportunity.structuredData.StageName.toLowerCase();
  if (stage === 'closed won') return 'won';
  if (stage === 'closed lost') return 'lost';
  
  return 'open';
}
```

**3. New Fields to Populate:**
- **LastActivityDate:** Update when activities (email, call, meeting) are created
- **Industry/IndustryId:** Sync from Salesforce or add via UI
- **CompetitorIds:** Manage via competitive intelligence feature
- **StageUpdatedAt:** Track via change feed when StageName changes
- **StageDates:** Build history of stage transitions

---

## 2. Audit Services ✅ CONFIRMED

### Your Answer: **Option B** - Logging exists, add Data Collector and Usage Tracking

### ✅ IMPLEMENTATION PLAN:

```
┌─────────────────────────────────────────────┐
│ Tier 1: Logging Service (EXISTS)            │
│ - Container: logging                         │
│ - Purpose: Regulatory audit, security       │
│ - Enhancement: Add ML/risk audit handlers   │
└─────────────────────────────────────────────┘
         ↑ consumes from RabbitMQ
         │
┌─────────────────────────────────────────────┐
│ Tier 2: Data Collector (NEW MODULE)         │
│ - Location: Inside logging container        │
│ - Purpose: Big data analytics, ML training  │
│ - Storage: Azure Data Lake (Parquet)        │
└─────────────────────────────────────────────┘
         ↑ consumes from RabbitMQ
         │
┌─────────────────────────────────────────────┐
│ Tier 3: Usage Tracking (NEW SERVICE)        │
│ - Container: analytics-service or new       │
│ - Purpose: Billing, cost allocation         │
│ - Storage: Cosmos DB (aggregated)           │
└─────────────────────────────────────────────┘
         ↑ consumes from RabbitMQ
         │
    [RabbitMQ - coder_events exchange]
         ↑ publishes events
         │
┌─────────────────────────────────────────────┐
│ risk-analytics, ml-service                  │
│ Events: risk.evaluated, ml.prediction.*     │
└─────────────────────────────────────────────┘
```

### Implementation Details:

**1. Extend Logging Service:**
```typescript
// packages/logging/src/consumers/ml-audit.consumer.ts (NEW)

export class MLAuditConsumer {
  constructor(
    private rabbitmq: RabbitMQClient,
    private auditLogWriter: AuditLogWriter
  ) {}
  
  async start() {
    // Subscribe to ML/risk events
    await this.rabbitmq.subscribe('coder_events', {
      routingKeys: [
        'risk.evaluated',
        'ml.prediction.completed',
        'remediation.workflow.completed'
      ],
      handler: this.handleAuditEvent.bind(this)
    });
  }
  
  private async handleAuditEvent(event: AuditEvent) {
    // Write to immutable audit log (Blob Storage)
    await this.auditLogWriter.write({
      eventType: event.type,
      timestamp: event.timestamp,
      tenantId: event.tenantId,
      userId: event.userId,
      data: event.data,
      retentionYears: 7  // Regulatory requirement
    });
  }
}
```

**2. Add Data Collector Module to Logging:**
```typescript
// packages/logging/src/collectors/data-lake.collector.ts (NEW)

export class DataLakeCollector {
  constructor(
    private rabbitmq: RabbitMQClient,
    private dataLake: DataLakeClient
  ) {}
  
  async start() {
    await this.rabbitmq.subscribe('coder_events', {
      routingKeys: [
        'risk.evaluated',
        'ml.prediction.*',
        'opportunity.updated',
        'forecast.generated'
      ],
      handler: this.handleDataCollection.bind(this)
    });
  }
  
  private async handleDataCollection(event: any) {
    // Write to Data Lake in Parquet format
    const path = this.buildDataLakePath(event);
    await this.dataLake.append(path, event, {
      format: 'parquet',
      compression: 'snappy'
    });
  }
  
  private buildDataLakePath(event: any): string {
    const date = new Date(event.timestamp);
    return `/risk_evaluations/year=${date.getFullYear()}/month=${date.getMonth() + 1}/day=${date.getDate()}/${event.type}.parquet`;
  }
}
```

**3. Usage Tracking Service:**
```typescript
// packages/analytics-service/src/services/usage-tracking.service.ts (NEW)

export class UsageTrackingService {
  constructor(
    private rabbitmq: RabbitMQClient,
    private cosmosDB: CosmosDBClient
  ) {}
  
  async start() {
    await this.rabbitmq.subscribe('coder_events', {
      routingKeys: [
        'ml.prediction.completed',
        'llm.inference.completed',
        'embedding.generated'
      ],
      handler: this.trackUsage.bind(this)
    });
  }
  
  private async trackUsage(event: UsageEvent) {
    // Aggregate usage metrics for billing
    await this.cosmosDB.containers.usage_metrics.upsert({
      id: `${event.tenantId}_${getDateKey(event.timestamp)}`,
      tenantId: event.tenantId,
      date: getDateKey(event.timestamp),
      metrics: {
        mlPredictions: 1,
        inferenceTimeMs: event.inferenceTimeMs,
        modelId: event.modelId,
        cost: calculateCost(event)
      }
    });
  }
}
```

---

## 3. Data Collector Placement ✅ CONFIRMED

### Your Answer: **Module inside logging** - "Yes use logging container"

### ✅ IMPLEMENTATION:

**Structure:**
```
containers/logging/
├── src/
│   ├── services/
│   │   ├── logging.service.ts           # Existing
│   │   └── audit-log.service.ts         # Enhanced for ML
│   ├── collectors/                       # NEW
│   │   ├── data-lake.collector.ts       # Data Lake writer
│   │   └── index.ts
│   ├── consumers/                        # NEW
│   │   ├── ml-audit.consumer.ts         # ML audit events
│   │   └── index.ts
│   └── index.ts
├── package.json
└── README.md
```

**Service Initialization:**
```typescript
// containers/logging/src/index.ts

import { LoggingService } from './services/logging.service';
import { AuditLogService } from './services/audit-log.service';
import { DataLakeCollector } from './collectors/data-lake.collector';
import { MLAuditConsumer } from './consumers/ml-audit.consumer';

async function main() {
  // Initialize existing services
  const loggingService = new LoggingService();
  const auditLogService = new AuditLogService();
  
  // Initialize new data collector (NEW)
  const dataLakeCollector = new DataLakeCollector(
    rabbitmqClient,
    dataLakeClient
  );
  
  // Initialize ML audit consumer (NEW)
  const mlAuditConsumer = new MLAuditConsumer(
    rabbitmqClient,
    auditLogService
  );
  
  // Start all services
  await Promise.all([
    loggingService.start(),
    dataLakeCollector.start(),
    mlAuditConsumer.start()
  ]);
  
  logger.info('Logging service started with Data Collector and ML Audit');
}
```

**Benefits:**
- ✅ Single container for all logging/audit/collection
- ✅ Shared RabbitMQ connection
- ✅ Consistent retry/error handling
- ✅ Simpler deployment

---

## 4. RabbitMQ for Batch Jobs ✅ RECOMMENDED

### 📋 MY RECOMMENDATION: **Option A - Scheduler + RabbitMQ**

**Reasoning:**
1. Simpler architecture (no delayed message plugin)
2. Clear separation: scheduler triggers, workers execute
3. Easy to monitor scheduled vs on-demand jobs
4. Standard pattern in existing codebase

### ✅ IMPLEMENTATION:

**Architecture:**
```
┌─────────────────────────────────┐
│ Scheduler (workflow-orchestrator│
│ or dedicated scheduler container)│
│ - node-cron triggers             │
│ - Publishes to RabbitMQ          │
└─────────────────────────────────┘
         │ publishes
         ↓
┌─────────────────────────────────┐
│ RabbitMQ Exchange: coder_events  │
│ Routing Key: workflow.job.trigger│
└─────────────────────────────────┘
         │ routes to
         ↓
┌─────────────────────────────────┐
│ Queue: bi_batch_jobs             │
└─────────────────────────────────┘
         │ consumed by
         ↓
┌─────────────────────────────────┐
│ Job Workers (risk-analytics,     │
│ analytics-service, etc.)         │
│ - Consume job messages           │
│ - Execute batch processing       │
└─────────────────────────────────┘
```

**1. Scheduler Implementation:**
```typescript
// packages/workflow-orchestrator/src/scheduler/batch-job-scheduler.ts

import cron from 'node-cron';

export class BatchJobScheduler {
  constructor(private rabbitmq: RabbitMQClient) {}
  
  async start() {
    // Risk clustering - Daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
      await this.triggerJob('risk-clustering', {
        schedule: 'daily',
        triggeredAt: new Date()
      });
    });
    
    // Account health - Daily at 3 AM
    cron.schedule('0 3 * * *', async () => {
      await this.triggerJob('account-health', {
        schedule: 'daily',
        triggeredAt: new Date()
      });
    });
    
    // Industry benchmarks - Daily at 4 AM
    cron.schedule('0 4 * * *', async () => {
      await this.triggerJob('industry-benchmarks', {
        schedule: 'daily',
        triggeredAt: new Date()
      });
    });
    
    // Risk snapshot backfill - Weekly on Sunday at 1 AM
    cron.schedule('0 1 * * 0', async () => {
      await this.triggerJob('risk-snapshot-backfill', {
        schedule: 'weekly',
        triggeredAt: new Date()
      });
    });
  }
  
  private async triggerJob(jobName: string, metadata: any) {
    await this.rabbitmq.publish('coder_events', {
      routingKey: 'workflow.job.trigger',
      message: {
        job: jobName,
        metadata,
        triggeredBy: 'scheduler',
        timestamp: new Date()
      }
    });
  }
}
```

**2. Job Worker (Consumer):**
```typescript
// packages/risk-analytics/src/workers/batch-job.worker.ts

export class BatchJobWorker {
  constructor(
    private rabbitmq: RabbitMQClient,
    private riskClusteringService: RiskClusteringService,
    private accountHealthService: AccountHealthService
  ) {}
  
  async start() {
    await this.rabbitmq.subscribe('coder_events', {
      queue: 'bi_batch_jobs',
      routingKeys: ['workflow.job.trigger'],
      handler: this.handleJob.bind(this)
    });
  }
  
  private async handleJob(message: JobTriggerMessage) {
    const { job, metadata } = message;
    
    try {
      switch (job) {
        case 'risk-clustering':
          await this.riskClusteringService.runBatchJob();
          break;
        
        case 'account-health':
          await this.accountHealthService.runBatchJob();
          break;
        
        // ... other jobs
        
        default:
          this.logger.warn('Unknown job type', { job });
      }
      
      // Publish completion event
      await this.rabbitmq.publish('coder_events', {
        routingKey: 'workflow.job.completed',
        message: {
          job,
          status: 'success',
          completedAt: new Date()
        }
      });
      
    } catch (error) {
      // Publish failure event
      await this.rabbitmq.publish('coder_events', {
        routingKey: 'workflow.job.failed',
        message: {
          job,
          error: error.message,
          failedAt: new Date()
        }
      });
      
      throw error; // Let RabbitMQ handle retry
    }
  }
}
```

**3. On-Demand Job Triggering:**
```typescript
// API endpoint for manual job trigger
app.post('/api/v1/jobs/:jobName/trigger', async (req, res) => {
  const { jobName } = req.params;
  const { tenantId } = req.body;
  
  // Publish job trigger (same pattern as scheduler)
  await rabbitmq.publish('coder_events', {
    routingKey: 'workflow.job.trigger',
    message: {
      job: jobName,
      metadata: { tenantId },
      triggeredBy: 'manual',
      userId: req.user.id,
      timestamp: new Date()
    }
  });
  
  res.json({ 
    success: true, 
    message: `Job ${jobName} triggered` 
  });
});
```

**RabbitMQ Queue Configuration:**
```typescript
// Queue setup
await rabbitmq.assertQueue('bi_batch_jobs', {
  durable: true,              // Survive broker restart
  arguments: {
    'x-message-ttl': 86400000,  // 24 hour TTL
    'x-max-priority': 10        // Priority queue (0-10)
  }
});

// Bind to exchange
await rabbitmq.bindQueue('bi_batch_jobs', 'coder_events', 'workflow.job.trigger');
```

---

## 5. RabbitMQ Only ✅ CONFIRMED

### Your Answer: "All system queuing must rely on RabbitMQ only"

### ✅ GLOBAL REPLACEMENTS:

**In ALL documentation and implementation:**

| Replace | With |
|---------|------|
| Azure Service Bus | RabbitMQ |
| Service Bus Topic | RabbitMQ Exchange |
| Service Bus Subscription | RabbitMQ Queue |
| `@azure/service-bus` | `amqplib` or RabbitMQ client |
| Event Grid | RabbitMQ |
| Any other message broker | RabbitMQ |

**RabbitMQ Configuration:**
```typescript
// Standard RabbitMQ setup for the platform

// Exchange (existing)
const EXCHANGE = 'coder_events';
const EXCHANGE_TYPE = 'topic';

// Routing Keys for BI/Risk/ML
const ROUTING_KEYS = {
  // Risk events
  RISK_EVALUATED: 'risk.evaluated',
  RISK_UPDATED: 'risk.updated',
  RISK_CLUSTER_UPDATED: 'risk.cluster.updated',
  
  // ML events
  ML_PREDICTION_COMPLETED: 'ml.prediction.completed',
  ML_TRAINING_STARTED: 'ml.training.started',
  ML_TRAINING_COMPLETED: 'ml.training.completed',
  ML_MODEL_DEPLOYED: 'ml.model.deployed',
  
  // Competitive events
  COMPETITOR_DETECTED: 'competitor.detected',
  COMPETITIVE_ANALYSIS_COMPLETED: 'competitive.analysis.completed',
  
  // Anomaly events
  ANOMALY_DETECTED: 'anomaly.detected',
  
  // Sentiment events
  SENTIMENT_ANALYZED: 'sentiment.analyzed',
  
  // Remediation events
  REMEDIATION_WORKFLOW_CREATED: 'remediation.workflow.created',
  REMEDIATION_STEP_COMPLETED: 'remediation.step.completed',
  REMEDIATION_WORKFLOW_COMPLETED: 'remediation.workflow.completed',
  
  // Workflow jobs
  WORKFLOW_JOB_TRIGGER: 'workflow.job.trigger',
  WORKFLOW_JOB_COMPLETED: 'workflow.job.completed',
  WORKFLOW_JOB_FAILED: 'workflow.job.failed',
  
  // Forecast events
  FORECAST_GENERATED: 'forecast.generated',
  
  // Benchmark events
  BENCHMARK_UPDATED: 'benchmark.updated'
};

// Queues
const QUEUES = {
  BI_BATCH_JOBS: 'bi_batch_jobs',
  ML_TRAINING: 'ml_training',
  RISK_PROCESSING: 'risk_processing',
  AUDIT_LOGGING: 'audit_logging',
  DATA_COLLECTION: 'data_collection',
  USAGE_TRACKING: 'usage_tracking'
};
```

**Publishing Pattern:**
```typescript
// Standard publish pattern
async function publishEvent(
  routingKey: string,
  message: any
): Promise<void> {
  await rabbitmq.publish('coder_events', {
    routingKey,
    message: {
      ...message,
      timestamp: new Date(),
      messageId: generateId()
    },
    options: {
      persistent: true,  // Survive broker restart
      priority: message.priority || 0
    }
  });
}
```

**Consuming Pattern:**
```typescript
// Standard subscribe pattern
async function subscribeToEvents(
  queue: string,
  routingKeys: string[],
  handler: (message: any) => Promise<void>
): Promise<void> {
  
  // Assert queue
  await rabbitmq.assertQueue(queue, {
    durable: true,
    arguments: {
      'x-message-ttl': 86400000  // 24 hours
    }
  });
  
  // Bind to routing keys
  for (const key of routingKeys) {
    await rabbitmq.bindQueue(queue, 'coder_events', key);
  }
  
  // Consume
  await rabbitmq.consume(queue, async (message) => {
    try {
      await handler(message);
      rabbitmq.ack(message);  // Acknowledge success
    } catch (error) {
      rabbitmq.nack(message, false, true);  // Requeue on failure
    }
  });
}
```

---

## 6. Shard Schema Documentation ✅ CONFIRMED

### Your Answer: **Separate doc** - BI_SALES_RISK_SHARD_SCHEMAS.md

### ✅ WILL CREATE:

**Document:** `BI_SALES_RISK_SHARD_SCHEMAS.md`

**Structure:**
```markdown
# BI Sales Risk Analysis – Shard Schemas

## Overview
Complete specification of shard types, structuredData schemas, and relationships.

## Opportunity Shard (c_opportunity)
### Standard Salesforce Fields
- Amount, StageName, CloseDate, etc.

### New Fields for BI/Risk
- LastActivityDate, Industry, CompetitorIds, etc.

### Feature Engineering Fields
- Computed fields used for ML

## Account Shard (c_account)
### Standard Fields
### New Fields

## Contact Shard (c_contact)
### Standard Fields
### New Fields
- Role (decision_maker, influencer, executive_sponsor, etc.)

## Activity Shards
### Email (c_email)
### Call (c_call)
### Meeting (c_meeting)
### Note (c_note)

## Risk Shards
### Risk Evaluation (c_risk_evaluation)
### Risk Snapshot (c_risk_snapshot)

## Competitive Shards
### Competitor (competitor)
### Competitor Tracking (competitor_tracking)

## ML Shards
### Prediction (ml_prediction)
### Model Metadata (ml_model)

## Relationships
### Types
- opportunity → account
- opportunity → contact (with role)
- opportunity → activity
- contact → contact (reporting)
- opportunity → competitor

### Relationship Schema
```

**Implementation Plan Reference:**
- Main implementation plan will **reference** this document
- All shard type implementations will **link** to specific sections
- Schema changes will be **documented** with version history

---

## Summary: All Questions Resolved ✅

| # | Topic | Answer | Status |
|---|-------|--------|--------|
| 1 | Salesforce mapping | Use default Salesforce fields (Amount, StageName, etc.) + new fields | ✅ Confirmed |
| 2 | Audit services | Logging exists, add Data Collector + Usage Tracking | ✅ Confirmed |
| 3 | Data Collector placement | Module inside logging container | ✅ Confirmed |
| 4 | Batch job pattern | Scheduler + RabbitMQ publish/consume | ✅ Recommended |
| 5 | RabbitMQ only | All queuing via RabbitMQ, no Azure Service Bus | ✅ Confirmed |
| 6 | Schema docs | Separate BI_SALES_RISK_SHARD_SCHEMAS.md | ✅ Confirmed |

---

## Previously Resolved (From Earlier Documents)

✅ **Scope:** Option C (Phases 1-2, Months 1-6)  
✅ **Schema changes:** Fields can be added  
✅ **Industry:** Add to opportunity/account, use hierarchy  
✅ **Graph:** Add contact roles before Phase 1  
✅ **Leading indicators:** Phase 1 only, create missing sources  
✅ **Data Lake:** Parquet format, include backfill job  
✅ **UI:** Extend containers/ui and dashboard services  
✅ **Tenant scope:** Use tenantId only  
✅ **Portfolio:** Tenant-level first  

---

## Ready for Implementation Plan ✅

**All questions answered. Ready to generate:**

1. ✅ **Complete Implementation Plan**
   - File-by-file changes
   - Service modifications
   - RabbitMQ configuration
   - Salesforce field mapping

2. ✅ **Shard Schemas Document**
   - All shard types
   - Field specifications
   - Relationship definitions

3. ✅ **Database Schemas**
   - Cosmos DB containers
   - Indexes and partition keys

4. ✅ **API Specifications**
   - OpenAPI definitions
   - Endpoints
   - Request/response schemas

5. ✅ **RabbitMQ Event Schemas**
   - All routing keys
   - Message payloads
   - Queue configurations

6. ✅ **Phase 1-2 Task Breakdown**
   - Week-by-week tasks
   - Dependencies
   - Resource allocation

---

**Next Step:** Generate complete implementation plan with all decisions applied!

**Document Version:** 1.0  
**Date:** January 2026  
**Status:** Ready for Implementation ✅
