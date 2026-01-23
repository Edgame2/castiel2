/**
 * Route Registration
 * Per ModuleImplementationGuide Section 7
 */

import { FastifyInstance } from 'fastify';
import { authenticateRequest } from '../middleware/auth';
import { registerLogRoutes } from './logs';
import { registerSearchRoutes } from './search';
import { registerHealthRoutes } from './health';
import { registerExportRoutes } from './export';
import { registerPolicyRoutes } from './policies';
import { registerConfigurationRoutes } from './configuration';
import { registerAlertRoutes } from './alerts';
import { registerVerificationRoutes } from './verification';

import { rateLimitMiddleware } from '../middleware/rateLimit';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  // Health endpoints (no auth, no rate limit)
  await registerHealthRoutes(app);
  
  // API v1 routes with authentication and rate limiting
  await app.register(async (v1) => {
    // Apply rate limiting to all v1 routes
    v1.addHook('onRequest', rateLimitMiddleware);
    
    // Apply authentication to all v1 routes
    v1.addHook('preHandler', authenticateRequest);
    
    await registerLogRoutes(v1);
    await registerSearchRoutes(v1);
    await registerExportRoutes(v1);
    await registerPolicyRoutes(v1);
    await registerConfigurationRoutes(v1);
    await registerAlertRoutes(v1);
    await registerVerificationRoutes(v1);
  }, { prefix: '/api/v1' });
}

