/**
 * Route registration for ai-conversation module
 */

import { FastifyInstance } from 'fastify';
import { AIConversationConfig } from '../types/config.types';
import { log } from '../utils/logger';

/**
 * Register all routes
 */
export async function registerRoutes(fastify: FastifyInstance, config: AIConversationConfig): Promise<void> {
  try {
    // Register conversation routes
    const { registerConversationRoutes } = await import('./conversations');
    await registerConversationRoutes(fastify, config);
    
    // Register message routes
    const { registerMessageRoutes } = await import('./messages');
    await registerMessageRoutes(fastify, config);
    
    // Register context routes
    const { registerContextRoutes } = await import('./context');
    await registerContextRoutes(fastify, config);
    
    log.info('All routes registered', { service: 'ai-conversation' });
  } catch (error) {
    log.error('Failed to register routes', error, { service: 'ai-conversation' });
    throw error;
  }
}
