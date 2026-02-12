import Fastify, { FastifyInstance } from 'fastify';
import { initializeDatabase, connectDatabase, disconnectDatabase, setupHealthCheck, setupJWT } from '@coder/shared';
import { loadConfig } from './config';
import { embeddingRoutes } from './routes/embeddings';
import { shardEmbeddingRoutes } from './routes/shard-embeddings';
import { initializeShardEmbeddingPublisher, closeShardEmbeddingPublisher } from './events/publishers/ShardEmbeddingEventPublisher';

let app: FastifyInstance | null = null;

/**
 * Build the Fastify app without listening. Used by tests and by start().
 */
export async function buildApp(): Promise<FastifyInstance> {
  const config = loadConfig();
  const server = Fastify({ logger: process.env.NODE_ENV === 'test' ? false : true });

  server.register(embeddingRoutes, { prefix: '' });
  server.register(async (instance) => {
    await shardEmbeddingRoutes(instance);
  }, { prefix: '/api/v1/shard-embeddings' });
  setupHealthCheck(server);

  initializeDatabase({
    endpoint: config.cosmos_db.endpoint,
    key: config.cosmos_db.key,
    database: config.cosmos_db.database_id,
    containers: config.cosmos_db.containers,
  });
  await setupJWT(server, { secret: process.env.JWT_SECRET || 'dev-secret' });
  await connectDatabase();
  await initializeShardEmbeddingPublisher();

  return server;
}

const start = async () => {
  try {
    app = await buildApp();
    const config = loadConfig();
    await app.listen({ port: config.server.port, host: config.server.host });
    console.log(`Embeddings Service listening on port ${config.server.port}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

const shutdown = async () => {
  console.log('Shutting down Embeddings Service...');
  await closeShardEmbeddingPublisher();
  if (app) await app.close();
  await disconnectDatabase();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

if (require.main === module) {
  start();
}
