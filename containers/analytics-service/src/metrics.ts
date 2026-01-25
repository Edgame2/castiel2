/**
 * Prometheus metrics for analytics-service (Plan §8.5.2).
 * deployment/monitoring/README, BI_SALES_RISK_IMPLEMENTATION_PLAN §8.5.2.
 */

import { Counter, register } from 'prom-client';

export const rabbitmqMessagesConsumedTotal = new Counter({
  name: 'rabbitmq_messages_consumed_total',
  help: 'Total RabbitMQ messages consumed (Plan §8.5.2, deployment/monitoring/README). Label queue.',
  labelNames: ['queue'],
});

export { register };
