# Job Scheduling Guide

## Overview

BullMQ provides native support for scheduling recurring jobs using cron patterns or intervals. This guide explains how to use the job scheduling utilities to create, manage, and monitor scheduled jobs.

## Concepts

### Schedule Patterns

Two types of patterns are supported:

1. **Cron Pattern**: Uses standard cron syntax (e.g., `'0 * * * *'` for hourly)
2. **Interval Pattern**: Repeats at fixed intervals (e.g., every 5 minutes)

### Scheduled Jobs

Scheduled jobs are stored in Redis and automatically re-enqueued according to their pattern. They persist across application restarts and can be managed programmatically.

## Usage

### Basic Scheduling

```typescript
import { QueueProducerService, SchedulePattern } from '@castiel/queue';

const queueProducer = new QueueProducerService({
  redis,
  monitoring,
});

// Schedule a job to run every hour using cron
const jobId = await queueProducer.scheduleSyncInboundScheduled(
  {
    syncTaskId: 'task-123',
    tenantId: 'tenant-123',
    integrationId: 'integration-123',
    connectionId: 'connection-123',
    scheduledAt: new Date().toISOString(),
  },
  { type: 'cron', pattern: '0 * * * *' }, // Every hour
  {
    priority: 5,
    tz: 'America/New_York', // Optional timezone
  }
);
```

### Interval-Based Scheduling

```typescript
// Schedule a job to run every 5 minutes
const jobId = await queueProducer.scheduleSyncInboundScheduled(
  jobData,
  { type: 'interval', every: 5 * 60 * 1000 }, // 5 minutes in milliseconds
  {
    priority: 5,
  }
);
```

### Using JobScheduler Directly

```typescript
import { JobScheduler } from '@castiel/queue';

const scheduler = new JobScheduler(redis, monitoring);

// Schedule any job
const jobId = await scheduler.scheduleJob(
  QueueName.SYNC_INBOUND_SCHEDULED,
  'sync-inbound-scheduled',
  jobData,
  { type: 'cron', pattern: '0 2 * * *' }, // Daily at 2 AM
  {
    jobId: 'custom-job-id',
    priority: 8,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    tz: 'UTC',
  }
);
```

### Managing Scheduled Jobs

```typescript
// Get all scheduled jobs for a queue
const scheduledJobs = await scheduler.getScheduledJobs(QueueName.SYNC_INBOUND_SCHEDULED);

// Remove a scheduled job
await scheduler.removeScheduledJob(jobId, QueueName.SYNC_INBOUND_SCHEDULED);

// Update a scheduled job
await scheduler.updateScheduledJob(
  jobId,
  QueueName.SYNC_INBOUND_SCHEDULED,
  {
    pattern: { type: 'cron', pattern: '0 */2 * * *' }, // Every 2 hours
    options: {
      priority: 8,
    },
  }
);
```

## Cron Pattern Examples

Common cron patterns:

- `'0 * * * *'` - Every hour at minute 0
- `'0 */2 * * *'` - Every 2 hours
- `'0 2 * * *'` - Daily at 2 AM
- `'0 0 * * 0'` - Weekly on Sunday at midnight
- `'*/15 * * * *'` - Every 15 minutes
- `'0 9 * * 1-5'` - Weekdays at 9 AM

## Migration from node-cron

### Before (node-cron)

```typescript
import cron from 'node-cron';

cron.schedule('0 * * * *', async () => {
  await syncScheduler.execute();
});
```

### After (BullMQ Scheduling)

```typescript
// Schedule once at startup
const jobId = await queueProducer.scheduleSyncInboundScheduled(
  {
    syncTaskId: 'scheduler-execution',
    tenantId: 'system',
    integrationId: 'system',
    connectionId: 'system',
    scheduledAt: new Date().toISOString(),
  },
  { type: 'cron', pattern: '0 * * * *' },
  {
    jobId: 'sync-scheduler-hourly',
  }
);

// The worker will process this job every hour
// No need for external cron process
```

## Benefits of BullMQ Scheduling

1. **Persistence**: Scheduled jobs survive application restarts
2. **Distributed**: Works across multiple worker instances
3. **Monitoring**: Integrated with BullMQ monitoring and metrics
4. **Management**: Can be added, removed, or updated programmatically
5. **Reliability**: Automatic retry and failure handling

## Best Practices

1. **Use descriptive job IDs**: Makes it easier to identify and manage jobs
2. **Set timezones**: Use `tz` option for cron jobs to ensure correct timing
3. **Set end dates**: Use `endDate` for temporary scheduled jobs
4. **Monitor scheduled jobs**: Regularly check `getScheduledJobs()` to ensure jobs are active
5. **Handle failures**: Scheduled jobs respect the queue's retry configuration

## Monitoring

All scheduling operations are tracked:

- `job-scheduler.scheduled`: Job scheduled
- `job-scheduler.removed`: Job removed
- `job-scheduler.updated`: Job updated

Query scheduled jobs:

```kusto
// Find all scheduled jobs
customEvents
| where name == "job-scheduler.scheduled"
| project timestamp, jobId = customDimensions.jobId, pattern = customDimensions.pattern
```

## Related Documentation

- [Job Flows Guide](./JOB_FLOWS_GUIDE.md)
- [Parent-Child Jobs Guide](./PARENT_CHILD_JOBS_GUIDE.md)
- [BullMQ Documentation](https://docs.bullmq.io/guide/jobs/repeatable)
