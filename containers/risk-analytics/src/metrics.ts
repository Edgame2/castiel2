/**
 * Prometheus metrics for risk-analytics.
 * Per deployment/monitoring/README and BI_SALES_RISK_IMPLEMENTATION_PLAN §8.5.2.
 */

import { Counter, Histogram, register } from 'prom-client';

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

export const httpRequestDurationSeconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

export const riskEvaluationsTotal = new Counter({
  name: 'risk_evaluations_total',
  help: 'Total risk evaluations',
});

export const batchJobDurationSeconds = new Histogram({
  name: 'batch_job_duration_seconds',
  help: 'Batch job duration in seconds (Plan §8.5.2, deployment/monitoring/README). Label job_name = batch job id (e.g. risk-snapshot-backfill, outcome-sync).',
  labelNames: ['job_name'],
  buckets: [1, 5, 15, 30, 60, 120, 300],
});

export const rabbitmqMessagesConsumedTotal = new Counter({
  name: 'rabbitmq_messages_consumed_total',
  help: 'Total RabbitMQ messages consumed (Plan §8.5.2, deployment/monitoring/README). Label queue.',
  labelNames: ['queue'],
});

export { register };
