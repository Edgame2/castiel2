/**
 * Prometheus metrics for integration-processors
 * Tracks integration data flow: published, mapped, failures, queue depth, duration
 * @module integration-processors/metrics
 */

import { Counter, Histogram, Gauge, register } from 'prom-client';

// HTTP metrics (standard)
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

export const httpRequestDurationSeconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

// Integration data flow metrics
export const integrationDataRawPublishedTotal = new Counter({
  name: 'integration_data_raw_published_total',
  help: 'Total integration.data.raw events published',
  labelNames: ['integration_id', 'entity_type'],
  registers: [register],
});

export const integrationDataRawBatchPublishedTotal = new Counter({
  name: 'integration_data_raw_batch_published_total',
  help: 'Total integration.data.raw.batch events published',
  labelNames: ['integration_id', 'batch_size'],
  registers: [register],
});

export const integrationDataMappedTotal = new Counter({
  name: 'integration_data_mapped_total',
  help: 'Total integration.data.mapped events (successful mappings)',
  labelNames: ['integration_id', 'entity_type', 'status'],
  registers: [register],
});

export const integrationDataMappingFailedTotal = new Counter({
  name: 'integration_data_mapping_failed_total',
  help: 'Total integration.data.mapping.failed events',
  labelNames: ['integration_id', 'entity_type', 'error_type'],
  registers: [register],
});

export const integrationDataMappingDurationSeconds = new Histogram({
  name: 'integration_data_mapping_duration_seconds',
  help: 'Duration of data mapping operations in seconds',
  labelNames: ['integration_id', 'entity_type'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

// Queue metrics
export const rabbitmqQueueDepth = new Gauge({
  name: 'rabbitmq_queue_depth',
  help: 'Current depth of RabbitMQ queues',
  labelNames: ['queue_name'],
  registers: [register],
});

export const rabbitmqMessagesConsumedTotal = new Counter({
  name: 'rabbitmq_messages_consumed_total',
  help: 'Total messages consumed from RabbitMQ',
  labelNames: ['queue_name', 'status'],
  registers: [register],
});

export const rabbitmqMessageProcessingDurationSeconds = new Histogram({
  name: 'rabbitmq_message_processing_duration_seconds',
  help: 'Duration of message processing in seconds',
  labelNames: ['queue_name', 'event_type'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [register],
});

// DLQ metrics
export const rabbitmqDlqDepth = new Gauge({
  name: 'rabbitmq_dlq_depth',
  help: 'Current depth of dead-letter queues',
  labelNames: ['queue_name'],
  registers: [register],
});

export const rabbitmqDlqMessagesTotal = new Counter({
  name: 'rabbitmq_dlq_messages_total',
  help: 'Total messages sent to dead-letter queues',
  labelNames: ['queue_name', 'reason'],
  registers: [register],
});

// Shard operations metrics
export const shardOperationsTotal = new Counter({
  name: 'shard_operations_total',
  help: 'Total shard operations (create, update, get)',
  labelNames: ['operation', 'shard_type', 'status'],
  registers: [register],
});

export const shardOperationDurationSeconds = new Histogram({
  name: 'shard_operation_duration_seconds',
  help: 'Duration of shard operations in seconds',
  labelNames: ['operation', 'shard_type'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [register],
});

// Batch processing metrics
export const batchProcessingTotal = new Counter({
  name: 'batch_processing_total',
  help: 'Total batch processing operations',
  labelNames: ['integration_id', 'entity_type', 'status'],
  registers: [register],
});

export const batchProcessingDurationSeconds = new Histogram({
  name: 'batch_processing_duration_seconds',
  help: 'Duration of batch processing in seconds',
  labelNames: ['integration_id', 'entity_type', 'batch_size'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120],
  registers: [register],
});

export const batchProcessingRecordsTotal = new Counter({
  name: 'batch_processing_records_total',
  help: 'Total records processed in batches',
  labelNames: ['integration_id', 'entity_type', 'status'],
  registers: [register],
});

// Idempotency metrics
export const idempotencyChecksTotal = new Counter({
  name: 'idempotency_checks_total',
  help: 'Total idempotency checks performed',
  labelNames: ['cache_type', 'result'],
  registers: [register],
});

// Config cache metrics
export const configCacheOperationsTotal = new Counter({
  name: 'config_cache_operations_total',
  help: 'Total config cache operations',
  labelNames: ['operation', 'cache_type', 'result'],
  registers: [register],
});

export { register };
