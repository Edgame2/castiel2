/**
 * Prometheus metrics for workflow-orchestrator (Plan §8.5.2, FIRST_STEPS §1).
 * deployment/monitoring/README, BI_SALES_RISK_IMPLEMENTATION_PLAN §8.5.2.
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

export const batchJobTriggersTotal = new Counter({
  name: 'batch_job_triggers_total',
  help: 'Total workflow.job.trigger publishes by batch job id (Plan §8.5.2). Label batch_job to avoid clashing with Prometheus scrape job.',
  labelNames: ['batch_job'],
});

export { register };
