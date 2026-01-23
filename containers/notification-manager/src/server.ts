import Fastify from 'fastify';
import { initializeDatabase, connectDatabase, disconnectDatabase, setupHealthCheck, setupJWT, closeConnection } from '@coder/shared';
import { notificationRoutes } from './routes/notifications';
import { preferenceRoutes } from './routes/preferences';
import { templateRoutes } from './routes/templates';
import { metricsRoutes } from './routes/metrics';
import { startEventConsumer } from './consumers/eventConsumer';
import { ScheduledNotificationJob } from './jobs/ScheduledNotificationJob';
import { loadConfig } from './config';

const server = Fastify({
  logger: true,
});

// Register routes
server.register(notificationRoutes, { prefix: '/api/v1/notifications' });
server.register(preferenceRoutes, { prefix: '/api/v1/preferences' });
server.register(templateRoutes, { prefix: '/api/v1/templates' });
server.register(metricsRoutes, { prefix: '' }); // Metrics at root level

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
    await setupJWT(server);
    
    await connectDatabase();
    
    // Start RabbitMQ consumer for all events
    await startEventConsumer();
    
    // Start scheduled notification job
    const scheduledJob = new ScheduledNotificationJob();
    scheduledJob.start();
    
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
