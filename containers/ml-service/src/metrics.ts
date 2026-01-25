/**
 * Prometheus metrics for ml-service (Plan §8.5.2, FIRST_STEPS §1).
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

export const mlPredictionsTotal = new Counter({
  name: 'ml_predictions_total',
  help: 'Total ML predictions',
  labelNames: ['model'],
});

/** Plan §8.5.2, deployment/monitoring/README: ml_prediction_duration_seconds_bucket (label model). */
export const mlPredictionDurationSeconds = new Histogram({
  name: 'ml_prediction_duration_seconds',
  help: 'ML prediction duration in seconds',
  labelNames: ['model'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

export { register };
