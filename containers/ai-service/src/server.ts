import Fastify from 'fastify';
import { initializeDatabase, connectDatabase, disconnectDatabase, setupHealthCheck, setupJWT, closeConnection } from '@coder/shared';
import { loadConfig } from './config';
import { completionRoutes } from './routes/completions';
import { modelRoutes } from './routes/models';
import { agentRoutes } from './routes/agents';
import { registerAllRoutes } from './routes';
import { initializeLLMReasoningEventPublisher, closeLLMReasoningEventPublisher } from './events/publishers/LLMReasoningEventPublisher';

const server = Fastify({
  logger: true,
});

// Register existing routes
server.register(completionRoutes, { prefix: '/api/ai/completions' });
server.register(modelRoutes, { prefix: '/api/ai/models' });
server.register(agentRoutes, { prefix: '/api/ai/agents' });

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
    await setupJWT(server, { secret: process.env.JWT_SECRET || (config as any).jwt?.secret || 'change-me' });
    
    await connectDatabase();
    await initializeLLMReasoningEventPublisher();

    // Register merged routes (insights, reasoning, prompts, LLM)
    await registerAllRoutes(server);

    await server.listen({ port: config.server.port, host: config.server.host });
    console.log(`AI Service listening on port ${config.server.port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down AI Service...');
  await closeLLMReasoningEventPublisher();
  await server.close();
  await closeConnection(); // Close RabbitMQ connection
  await disconnectDatabase();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();
