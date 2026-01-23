import Fastify from 'fastify';
import { connectDatabase, disconnectDatabase, setupHealthCheck, setupJWT } from '@coder/shared';
import { embeddingRoutes } from './routes/embeddings';

const server = Fastify({
  logger: true,
});

// Register routes
server.register(embeddingRoutes, { prefix: '/api/embeddings' });

// Setup health check endpoints
setupHealthCheck(server);

const start = async () => {
  try {
    // Setup JWT for authentication
    await setupJWT(server);
    
    await connectDatabase();
    
    const port = parseInt(process.env.PORT || '3005', 10);
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`Embeddings Service listening on port ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down Embeddings Service...');
  await server.close();
  await disconnectDatabase();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();
