/**
 * Route registration for ai-conversation module
 */

import { FastifyInstance } from 'fastify';
import { AIConversationConfig } from '../types/config.types.js';
import { log } from '../utils/logger.js';

/**
 * Register all routes
 */
export async function registerRoutes(fastify: FastifyInstance, config: AIConversationConfig): Promise<void> {
  try {
    // Register conversation routes
    const { registerConversationRoutes } = await import('./conversations.js');
    await registerConversationRoutes(fastify, config);
    
    // Register message routes
    const { registerMessageRoutes } = await import('./messages.js');
    await registerMessageRoutes(fastify, config);
    
    // Register context routes
    const { registerContextRoutes } = await import('./context.js');
    await registerContextRoutes(fastify, config);
    
    log.info('All routes registered', { service: 'ai-conversation' });
  } catch (error) {
    log.error('Failed to register routes', error, { service: 'ai-conversation' });
    throw error;
  }
}
