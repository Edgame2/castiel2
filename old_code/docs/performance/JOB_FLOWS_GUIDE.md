# Job Flows Guide

## Overview

Job flows provide a way to orchestrate sequential job processing with dependency tracking using correlation IDs. This enables distributed tracing and better observability of complex workflows.

## Concepts

### Correlation IDs

All jobs in a flow share the same correlation ID, allowing you to:
- Track related jobs across different queues
- Query monitoring systems for all jobs in a flow
- Debug issues by following a correlation ID through the system

### Flow Steps

A flow consists of multiple steps, where each step:
- Enqueues a job to a specific queue
- Can be marked as optional (failures don't stop the flow)
- Can have conditions that determine if it should run
- Shares the flow's correlation ID

## Usage

### Basic Flow

```typescript
import { JobFlowManager } from '@castiel/queue';
import { QueueProducerService } from '@castiel/queue';

const queueProducer = new QueueProducerService({ monitoring });
const flowManager = new JobFlowManager(queueProducer, monitoring);

const result = await flowManager.executeFlow([
  {
    name: 'step-1',
    jobData: { /* job data */ },
    queueName: QueueName.SOME_QUEUE,
    jobName: 'some-job',
    options: { priority: 5 },
  },
  {
    name: 'step-2',
    jobData: { /* job data */ },
    queueName: QueueName.ANOTHER_QUEUE,
    jobName: 'another-job',
    options: { priority: 3 },
    condition: (previousResults) => previousResults[0] === true, // Only run if step 1 succeeded
  },
]);
```

### Document Processing Flow

The `JobFlowManager` provides a helper method for the common document processing workflow:

```typescript
const result = await flowManager.createDocumentProcessingFlow(
  documentCheckJob,    // DocumentCheckJobMessage
  documentChunkJob,     // DocumentChunkJobMessage
  embeddingJobs,        // EmbeddingJobMessage[]
  correlationId         // Optional: provide existing correlation ID
);
```

This creates a flow:
1. **Document Check**: Security validation (high priority)
2. **Document Chunk**: Text extraction and chunking
3. **Embedding Jobs**: Vector generation (optional, can fail without blocking)

### Enrichment Flow

```typescript
const result = await flowManager.createEnrichmentFlow(
  shardEmission,       // ShardEmissionMessage
  enrichmentJob,        // EnrichmentJobMessage
  correlationId         // Optional
);
```

## Flow Results

```typescript
interface JobFlowResult {
  correlationId: string;  // Shared correlation ID for all jobs
  steps: Array<{
    name: string;
    success: boolean;
    jobId?: string;
    error?: string;
  }>;
  success: boolean;  // Overall flow success
}
```

## Monitoring

All flow events are tracked in monitoring with the correlation ID:

- `job-flow.started`: Flow initiated
- `job-flow.step-enqueued`: Step job enqueued
- `job-flow.step-skipped`: Step skipped due to condition
- `job-flow.completed`: Flow completed

## Best Practices

1. **Use correlation IDs**: Always provide or let the system generate correlation IDs
2. **Mark optional steps**: Steps that can fail without blocking the flow should be marked `optional: true`
3. **Use conditions**: Use conditions to skip steps based on previous results
4. **Track in workers**: Workers should extract and use correlation IDs in their monitoring

## Example: Document Upload with Flow

```typescript
// In document upload service
const correlationId = generateCorrelationId();

const flowResult = await flowManager.createDocumentProcessingFlow(
  {
    shardId: shard.id,
    tenantId,
    userId,
    documentFileName: fileData.fileName,
    filePath: blobUpload.path,
    correlationId, // Share correlation ID
  },
  {
    shardId: shard.id,
    tenantId,
    containerName: 'documents',
    documentFileName: fileData.fileName,
    filePath: blobUpload.path,
    correlationId, // Share correlation ID
  },
  [], // Embedding jobs enqueued by chunk worker
  correlationId
);

// All jobs in this flow will have the same correlation ID
// You can query monitoring: correlationId = flowResult.correlationId
```

## Querying by Correlation ID

In Application Insights or your monitoring system:

```kusto
// Find all jobs in a flow
customEvents
| where customDimensions.correlationId == "your-correlation-id"
| order by timestamp asc
```

## Related Documentation

- [Correlation ID Utilities](../packages/queue/src/correlation-id.ts)
- [Queue Producers](../packages/queue/src/producers.ts)
- [Performance Budgets](./PERFORMANCE_BUDGETS.md)
