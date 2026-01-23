/**
 * Route Registration
 * Per ModuleImplementationGuide Section 7
 */

import { FastifyInstance } from 'fastify';
import { AuthConfig } from '../types/config.types';

export async function registerRoutes(fastify: FastifyInstance, config: AuthConfig): Promise<void> {
  // Register authentication routes
  const { setupAuthRoutes } = await import('./auth');
  await setupAuthRoutes(fastify, config);
}



