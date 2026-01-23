import Fastify from 'fastify';
import { connectDatabase, disconnectDatabase, setupHealthCheck, setupJWT, closeConnection } from '@coder/shared';
import { completionRoutes } from './routes/completions';
import { modelRoutes } from './routes/models';
import { agentRoutes } from './routes/agents';

const server = Fastify({
  logger: true,
});

// Register routes
server.register(completionRoutes, { prefix: '/api/ai/completions' });
server.register(modelRoutes, { prefix: '/api/ai/models' });
server.register(agentRoutes, { prefix: '/api/ai/agents' });

// Setup health check endpoints
setupHealthCheck(server);

const start = async () => {
  try {
    // Setup JWT for authentication
    await setupJWT(server);
    
    await connectDatabase();
    
    const port = parseInt(process.env.PORT || '3006', 10);
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`AI Service listening on port ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down AI Service...');
  await server.close();
  await closeConnection(); // Close RabbitMQ connection
  await disconnectDatabase();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();
