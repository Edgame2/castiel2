/**
 * Unified Route Registration
 * Registers all routes including merged routes from ai-insights, reasoning-engine, prompt-service, and llm-service
 */

import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { registerInsightsRoutes } from './merged/insights';
import { registerReasoningRoutes } from './merged/reasoning';
import { registerPromptsRoutes } from './merged/prompts';
import { registerLLMRoutes } from './llm';

export async function registerAllRoutes(app: FastifyInstance): Promise<void> {
  const config = loadConfig();

  // Register merged routes
  await registerInsightsRoutes(app, config);
  await registerReasoningRoutes(app, config);
  await registerPromptsRoutes(app, config);
  await registerLLMRoutes(app);
}
