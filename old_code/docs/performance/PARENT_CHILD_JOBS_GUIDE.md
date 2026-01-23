# Parent-Child Jobs Guide

## Overview

Parent-child job relationships enable tracking and coordination of batch operations where a parent job represents a batch and child jobs represent individual items in that batch. This is useful for:

- Batch embedding jobs
- Bulk enrichment operations
- Multi-document processing
- Any operation that processes multiple items as a unit

## Concepts

### Parent Job

A parent job is a metadata record stored in Redis that tracks:
- Total number of child jobs
- Number of completed child jobs
- Number of failed child jobs
- Overall status (pending, in-progress, completed, failed, partial)
- Progress percentage

### Child Jobs

Child jobs are regular BullMQ jobs that include a `parentJobId` field. When child jobs complete or fail, they automatically update the parent job status.

## Usage

### Creating a Parent Job

```typescript
import { ParentChildJobManager } from '@castiel/queue';

const manager = new ParentChildJobManager(redis, queueProducer, monitoring);

// Create a parent job for a batch of 100 embedding jobs
const parentJob = await manager.createParentJob(
  100, // total children
  correlationId, // optional correlation ID
  { tenantId: 'tenant-123', operation: 'batch-embedding' } // optional metadata
);

const parentJobId = parentJob.parentJobId;
```

### Enqueueing Child Jobs

```typescript
// Enqueue child jobs with parentJobId
for (const jobData of jobDataList) {
  const jobId = await queueProducer.enqueueEmbeddingJob(jobData, {
    parentJobId: parentJobId,
    correlationId: parentJob.correlationId,
  });
  
  // Register child with parent
  await manager.registerChildJob(parentJobId, jobId);
}
```

### Checking Parent Job Status

```typescript
// Get status summary
const status = await manager.getParentJobStatus(parentJobId);
// {
//   status: 'in-progress',
//   progress: 45, // 45% complete
//   completed: 45,
//   failed: 0,
//   total: 100
// }

// Get full metadata
const metadata = await manager.getParentJob(parentJobId);
```

### Automatic Updates

When using `BaseWorker`, child job completion and failure automatically update the parent job:

```typescript
// In your worker class
export class MyWorker extends BaseWorker<MyJobMessage> {
  constructor(config, monitoring, redis) {
    super(config, async (job) => {
      // Your processing logic
    });
    
    // Initialize parent-child manager
    this.parentChildManager = new ParentChildJobManager(
      redis,
      queueProducer,
      monitoring
    );
  }
}
```

The worker will automatically:
- Update parent job when child completes
- Update parent job when child fails
- Track parent job ID in monitoring events

## Status Values

- `pending`: Parent job created, no children processed yet
- `in-progress`: Some children completed, but not all
- `completed`: All children completed successfully
- `failed`: All children failed
- `partial`: Some children completed, some failed

## Example: Batch Embedding Jobs

```typescript
// In QueueService
async sendEmbeddingJobBatchWithParent(
  jobMessages: EmbeddingJobMessage[],
  options?: { delayInSeconds?: number }
): Promise<{ parentJobId: string; enqueuedCount: number }> {
  const manager = new ParentChildJobManager(
    this.redis,
    this.queueProducer,
    this.monitoring
  );

  // Create parent job
  const parentJob = await manager.createParentJob(
    jobMessages.length,
    undefined,
    { tenantId: jobMessages[0]?.tenantId }
  );

  // Enqueue child jobs
  const results = await Promise.allSettled(
    jobMessages.map(job =>
      this.queueProducer.enqueueEmbeddingJob(job, {
        delay: options?.delayInSeconds ? options.delayInSeconds * 1000 : undefined,
        parentJobId: parentJob.parentJobId,
      })
    )
  );

  // Register all child jobs
  const successful = results.filter(r => r.status === 'fulfilled');
  for (const result of successful) {
    if (result.status === 'fulfilled') {
      await manager.registerChildJob(
        parentJob.parentJobId,
        result.value
      );
    }
  }

  return {
    parentJobId: parentJob.parentJobId,
    enqueuedCount: successful.length,
  };
}
```

## Monitoring

All parent-child job events are tracked:

- `parent-job.created`: Parent job created
- `parent-job.child-registered`: Child job registered
- `parent-job.child-updated`: Child job completed/failed
- `parent-job.child-registration-failed`: Failed to register child

Query parent job status in monitoring:

```kusto
// Find all parent jobs
customEvents
| where name == "parent-job.created"
| project timestamp, parentJobId = customDimensions.parentJobId, totalChildren = toint(customDimensions.totalChildren)
```

## Best Practices

1. **Always register children**: After enqueueing child jobs, register them with the parent
2. **Use correlation IDs**: Share correlation IDs between parent and children for distributed tracing
3. **Monitor parent status**: Poll parent job status for long-running batches
4. **Handle partial failures**: Check for `partial` status and handle accordingly
5. **Set TTL appropriately**: Parent job metadata is stored with a 7-day TTL by default

## Related Documentation

- [Job Flows Guide](./JOB_FLOWS_GUIDE.md)
- [Correlation IDs](../packages/queue/src/correlation-id.ts)
- [Queue Producers](../packages/queue/src/producers.ts)
