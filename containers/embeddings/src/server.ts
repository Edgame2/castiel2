import Fastify from 'fastify';
import { initializeDatabase, connectDatabase, disconnectDatabase, setupHealthCheck, setupJWT } from '@coder/shared';
import { loadConfig } from './config';
import { embeddingRoutes } from './routes/embeddings';
import { shardEmbeddingRoutes } from './routes/shard-embeddings';
import { initializeShardEmbeddingPublisher, closeShardEmbeddingPublisher } from './events/publishers/ShardEmbeddingEventPublisher';

const server = Fastify({
  logger: true,
});

// Register routes
server.register(embeddingRoutes, { prefix: '/api/embeddings' });
server.register(async (instance) => {
  await shardEmbeddingRoutes(instance);
}, { prefix: '/api/v1/shard-embeddings' });

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
    await setupJWT(server, { secret: process.env.JWT_SECRET || 'dev-secret' });
    
    await connectDatabase();
    await initializeShardEmbeddingPublisher();

    await server.listen({ port: config.server.port, host: config.server.host });
    console.log(`Embeddings Service listening on port ${config.server.port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down Embeddings Service...');
  await closeShardEmbeddingPublisher();
  await server.close();
  await disconnectDatabase();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();
