/**
 * Preference Management Routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PreferenceService } from '../services/PreferenceService';
import { authenticateRequest } from '@coder/shared';
import { PreferenceScope } from '../types/notification';

export async function preferenceRoutes(fastify: FastifyInstance) {
  const preferenceService = new PreferenceService();

  // Register authentication middleware
  fastify.addHook('preHandler', authenticateRequest);

  // Get effective preferences
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const query = request.query as any;
      
      const scope = (query.scope || 'USER') as PreferenceScope;
      const scopeId = query.scopeId || (scope === 'USER' ? user.id : undefined);
      
      if (!scopeId && scope !== 'GLOBAL') {
        return reply.code(400).send({ 
          error: 'scopeId is required for non-GLOBAL scopes' 
        });
      }

      const preferences = await preferenceService.getEffectivePreferences(
        scope,
        scopeId || '',
        user.organizationId
      );

      reply.send({ data: preferences });
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Get preference by scope
  fastify.get('/:scope/:scopeId?', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { scope, scopeId } = request.params as { scope: string; scopeId?: string };
      
      const effectiveScopeId = scopeId || (scope === 'USER' ? user.id : scopeId);
      
      const preferences = await preferenceService.getEffectivePreferences(
        scope as PreferenceScope,
        effectiveScopeId || '',
        user.organizationId
      );

      reply.send({ data: preferences });
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Create or update preference
  fastify.put('/:scope/:scopeId?', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { scope, scopeId } = request.params as { scope: string; scopeId?: string };
      const body = request.body as any;
      
      const effectiveScopeId = scopeId || (scope === 'USER' ? user.id : scopeId);
      
      const preference = await preferenceService.upsertPreference({
        scope: scope as PreferenceScope,
        scopeId: effectiveScopeId,
        organizationId: user.organizationId,
        channels: body.channels,
        categories: body.categories,
        quietHoursStart: body.quietHoursStart,
        quietHoursEnd: body.quietHoursEnd,
        timezone: body.timezone,
      });

      reply.send({ data: preference });
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Delete preference (reset to defaults)
  fastify.delete('/:scope/:scopeId?', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { scope, scopeId } = request.params as { scope: string; scopeId?: string };
      
      // Find preference ID
      const preferences = await preferenceService.listPreferences(
        user.organizationId,
        scope as PreferenceScope
      );
      
      const effectiveScopeId = scopeId || (scope === 'USER' ? user.id : scopeId);
      const preference = preferences.find(p => 
        p.scope === scope && 
        (p.scopeId === effectiveScopeId || (scope === 'GLOBAL' && !p.scopeId))
      );

      if (preference) {
        await preferenceService.deletePreference(preference.id);
      }

      reply.code(204).send();
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // List all preferences for organization
  fastify.get('/list/all', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const query = request.query as any;
      
      const preferences = await preferenceService.listPreferences(
        user.organizationId,
        query.scope as PreferenceScope | undefined
      );

      reply.send({ data: preferences });
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });
}

