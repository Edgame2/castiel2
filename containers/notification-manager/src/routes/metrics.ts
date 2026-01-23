/**
 * Metrics endpoint for Prometheus
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getNotificationEngine } from '../services/NotificationEngineFactory';

export async function metricsRoutes(fastify: FastifyInstance) {
  // Metrics endpoint (no auth required for Prometheus)
  fastify.get('/metrics', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // TODO: Get metrics from MetricsCollector when integrated
      // For now, return basic metrics
      const metrics = `# Notification Manager Metrics
# HELP notifications_sent_total Total notifications sent
# TYPE notifications_sent_total counter
notifications_sent_total{channel="email",status="delivered"} 0
notifications_sent_total{channel="email",status="failed"} 0
notifications_sent_total{channel="inapp",status="delivered"} 0
notifications_sent_total{channel="push",status="delivered"} 0

# HELP notification_duration_seconds Notification processing duration
# TYPE notification_duration_seconds histogram
notification_duration_seconds_sum{channel="email"} 0
notification_duration_seconds_count{channel="email"} 0
`;

      reply.type('text/plain').send(metrics);
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });
}

