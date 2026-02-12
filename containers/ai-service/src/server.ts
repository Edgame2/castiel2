import Fastify, { FastifyInstance } from 'fastify';
import { initializeDatabase, connectDatabase, disconnectDatabase, setupHealthCheck, setupJWT, closeConnection } from '@coder/shared';
import { loadConfig } from './config';
import { completionRoutes } from './routes/completions';
import { modelRoutes } from './routes/models';
import { agentRoutes } from './routes/agents';
import { registerAllRoutes } from './routes';
import { initializeLLMReasoningEventPublisher, closeLLMReasoningEventPublisher } from './events/publishers/LLMReasoningEventPublisher';

let app: FastifyInstance | null = null;

/**
 * Build the Fastify app without listening. Used by tests and by start().
 */
export async function buildApp(): Promise<FastifyInstance> {
  const config = loadConfig();
  const server = Fastify({ logger: process.env.NODE_ENV === 'test' ? false : true });

  server.register(completionRoutes, { prefix: '/completions' });
  server.register(modelRoutes, { prefix: '/models' });
  server.register(agentRoutes, { prefix: '/agents' });
  setupHealthCheck(server);

  initializeDatabase({
    endpoint: config.cosmos_db.endpoint,
    key: config.cosmos_db.key,
    database: config.cosmos_db.database_id,
    containers: config.cosmos_db.containers,
  });

  const jwtSecret = process.env.JWT_SECRET || (config as any).jwt?.secret;
  if (process.env.NODE_ENV === 'production' && !jwtSecret) {
    throw new Error('JWT_SECRET (or config.jwt.secret) is required in production');
  }
  const secret = jwtSecret || 'dev-jwt-secret-not-for-production';
  await setupJWT(server, { secret });

  await connectDatabase();
  await initializeLLMReasoningEventPublisher();
  await registerAllRoutes(server);

  return server;
}

const start = async () => {
  try {
    app = await buildApp();
    const config = loadConfig();
    await app.listen({ port: config.server.port, host: config.server.host });
    console.log(`AI Service listening on port ${config.server.port}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

const shutdown = async () => {
  console.log('Shutting down AI Service...');
  await closeLLMReasoningEventPublisher();
  if (app) await app.close();
  await closeConnection();
  await disconnectDatabase();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

if (require.main === module) {
  start();
}
