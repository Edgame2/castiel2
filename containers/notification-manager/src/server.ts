import './instrumentation';
import Fastify from 'fastify';
import { initializeDatabase, connectDatabase, disconnectDatabase, setupHealthCheck, setupJWT, closeConnection } from '@coder/shared';
import { notificationRoutes } from './routes/notifications';
import { preferenceRoutes } from './routes/preferences';
import { templateRoutes } from './routes/templates';
import { httpRequestsTotal, httpRequestDurationSeconds, register } from './metrics';
import { startEventConsumer } from './consumers/eventConsumer';
import { ScheduledNotificationJob } from './jobs/ScheduledNotificationJob';
import { loadConfig } from './config/index.js';

const server = Fastify({
  logger: true,
});

server.addHook('onResponse', async (request, reply) => {
  const route = ((request as { routerPath?: string }).routerPath ?? (request as { routeOptions?: { url?: string } }).routeOptions?.url ?? String((request as { url?: string }).url || '').split('?')[0]) || 'unknown';
  httpRequestsTotal.inc({ method: request.method, route, status: String(reply.statusCode) });
  httpRequestDurationSeconds.observe({ method: request.method, route }, (reply.elapsedTime ?? 0) / 1000);
});

// Register routes
server.register(notificationRoutes, { prefix: '/api/v1/notifications' });
server.register(preferenceRoutes, { prefix: '/api/v1/preferences' });
server.register(templateRoutes, { prefix: '/api/v1/templates' });

// Setup health check endpoints
setupHealthCheck(server);

const start = async () => {
  try {
    // Load configuration
    const config = loadConfig();
    
    // Initialize database with config
    initializeDatabase({
      endpoint: config.cosmos_db.endpoint,
      key: config.cosmos_db.key,
      database: config.cosmos_db.database_id,
      containers: config.cosmos_db.containers,
    });
    
    // Setup JWT for authentication
    await setupJWT(server, { secret: process.env.JWT_SECRET || '' });
    
    await connectDatabase();
    
    // Start RabbitMQ consumer for all events
    await startEventConsumer();
    
    // Start scheduled notification job
    const scheduledJob = new ScheduledNotificationJob();
    scheduledJob.start();

    // GET /metrics (Plan §8.5.2, §8.5.4); prom-client, optional Bearer when metrics.require_auth
    const metricsConf = config.metrics ?? { path: '/metrics', require_auth: false, bearer_token: '' };
    server.get(metricsConf.path || '/metrics', async (request, reply) => {
      if (metricsConf.require_auth) {
        const raw = (request.headers.authorization as string) || '';
        const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;
        if (token !== (metricsConf.bearer_token || '')) {
          return reply.status(401).send('Unauthorized');
        }
      }
      return reply.type('text/plain; version=0.0.4').send(await register.metrics());
    });
    
    const port = typeof config.server.port === 'number' 
      ? config.server.port 
      : parseInt(String(config.server.port), 10);
    const host = config.server.host;
    
    await server.listen({ port, host });
    console.log(`Notification Manager Service listening on port ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down Notification Manager Service...');
  await server.close();
  await closeConnection(); // Close RabbitMQ connection
  await disconnectDatabase();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();
